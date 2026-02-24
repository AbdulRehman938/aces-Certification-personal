import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function decodeJwtPayload(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT structure");
  }
  const payload = parts[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
  const json = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(json);
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, message: "auth_token cookie not found" },
      { status: 404 },
    );
  }

  try {
    const payload = decodeJwtPayload(token);
    return NextResponse.json({ success: true, tokenPayload: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: "Failed to decode token", error: message },
      { status: 400 },
    );
  }
}
