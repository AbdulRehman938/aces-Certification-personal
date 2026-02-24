import { NextResponse } from "next/server";
import { decryptPayloadToJson } from "@/lib/payload-crypto";

export async function POST(request: Request) {
  const encryptionKey =
    process.env.API_PAYLOAD_ENCRYPTION_KEY ||
    process.env.NEXT_PUBLIC_API_PAYLOAD_ENCRYPTION_KEY ||
    "";

  if (!encryptionKey) {
    return NextResponse.json(
      { success: false, message: "Encryption key not configured" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const payload = typeof body?.payload === "string" ? body.payload.trim() : "";

    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Missing payload string" },
        { status: 400 },
      );
    }

    const decoded = await decryptPayloadToJson(payload, encryptionKey);
    return NextResponse.json({ success: true, decoded });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: "Failed to decrypt payload", error: message },
      { status: 400 },
    );
  }
}
