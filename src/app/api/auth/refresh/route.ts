import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decryptPayloadToJson, encryptJsonToPayload } from "@/lib/payload-crypto";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractOrganizationIdFromToken(token?: string): string | undefined {
  if (!token) return undefined;
  const payload = decodeJwtPayload(token);
  const candidate = payload?.organization_id;
  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : undefined;
}

function getApiBaseUrl(reqUrl: string) {
  const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!raw) {
    throw new Error(
      "Missing API base URL. Set API_URL (server) or NEXT_PUBLIC_API_URL (client) to your backend origin.",
    );
  }

  const apiOrigin = new URL(raw);
  const requestOrigin = new URL(reqUrl).origin;
  if (apiOrigin.origin === requestOrigin) {
    throw new Error(
      `API base URL resolves to this same Next.js origin (${requestOrigin}). Point API_URL/NEXT_PUBLIC_API_URL to the backend server instead.`,
    );
  }

  const rawNormalized = apiOrigin.toString().replace(/\/+$/, "");
  return rawNormalized.endsWith("/api") ? rawNormalized : `${rawNormalized}/api`;
}

export async function POST(req: Request) {
  const encryptionKey =
    process.env.API_PAYLOAD_ENCRYPTION_KEY ||
    process.env.NEXT_PUBLIC_API_PAYLOAD_ENCRYPTION_KEY ||
    "";

  const encryptionEnabled =
    process.env.API_PAYLOAD_ENCRYPTION_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_API_PAYLOAD_ENCRYPTION_ENABLED === "true";

  let body:
    | {
        refresh_token?: string;
        payload?: string;
        organization_id?: string;
      }
    | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  if (encryptionKey && body?.payload && !body.refresh_token) {
    try {
      const decrypted = await decryptPayloadToJson<{
        refresh_token?: string;
        organization_id?: string;
      }>(
        body.payload,
        encryptionKey,
      );
      body = { ...body, ...decrypted };
    } catch (err) {
      console.error("Failed to decrypt refresh payload", err);
      return NextResponse.json(
        { success: false, message: "Invalid encrypted payload" },
        { status: 400 },
      );
    }
  }

  const cookieStore = await cookies();
  const cookieRefreshToken = cookieStore.get("refresh_token")?.value;
  const refreshToken = body?.refresh_token || cookieRefreshToken;

  const organizationIdFromBody =
    typeof body?.organization_id === "string" && body.organization_id.trim()
      ? body.organization_id.trim()
      : undefined;

  const organizationIdFromCookie =
    cookieStore.get("organization_id")?.value?.trim() || undefined;

  const organizationIdFromRefreshToken = extractOrganizationIdFromToken(
    refreshToken,
  );

  if (!refreshToken) {
    return NextResponse.json(
      { success: false, message: "Missing refresh token" },
      { status: 401 },
    );
  }

  const baseUrl = getApiBaseUrl(req.url);

  const upstreamPayload: Record<string, string> = {
    refresh_token: refreshToken,
  };

  const effectiveOrganizationId = [
    organizationIdFromBody,
    organizationIdFromCookie,
    organizationIdFromRefreshToken,
  ].find((id) => id && id !== "undefined" && id !== "null");

  if (process.env.NODE_ENV === "development") {
    console.info("[api/auth/refresh] forwarding organization context", {
      body: organizationIdFromBody,
      cookie: organizationIdFromCookie,
      refreshTokenClaim: organizationIdFromRefreshToken,
      effective: effectiveOrganizationId,
    });
  }

  const upstreamBody = encryptionEnabled && encryptionKey
    ? JSON.stringify({
        payload: await encryptJsonToPayload(upstreamPayload, encryptionKey),
      })
    : JSON.stringify(upstreamPayload);

  const upstream = await fetch(`${baseUrl}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: upstreamBody,
  });

  const raw = await upstream
    .json()
    .catch(() => ({ success: false, message: "Invalid upstream response" }));

  const data =
    encryptionKey && raw?.payload
      ? await decryptPayloadToJson<Record<string, unknown>>(
          raw.payload,
          encryptionKey,
        ).catch(() => raw)
      : raw;

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }



  return NextResponse.json(data, { status: 200 });
}
