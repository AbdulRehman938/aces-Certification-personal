type JsonValue = unknown;

const textEncoder = new TextEncoder();

function normalizeBase64(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const noPadding = trimmed.replace(/=+$/g, '');
  const padLength = (4 - (noPadding.length % 4)) % 4;
  return noPadding + '='.repeat(padLength);
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64(base64: string): Uint8Array {
  const normalized = normalizeBase64(base64);
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(normalized, "base64"));
  }
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodePayloadCandidates(payload: string): Uint8Array[] {
  const trimmed = payload.trim();

  if (trimmed.includes('.')) {
    const parts = trimmed.split('.').filter(Boolean);
    if (parts.length === 3) {
      const iv = fromBase64(parts[0]);
      const p1 = fromBase64(parts[1]);
      const p2 = fromBase64(parts[2]);

      const combinedA = new Uint8Array(iv.length + p1.length + p2.length);
      combinedA.set(iv, 0);
      combinedA.set(p1, iv.length);
      combinedA.set(p2, iv.length + p1.length);

      const combinedB = new Uint8Array(iv.length + p2.length + p1.length);
      combinedB.set(iv, 0);
      combinedB.set(p2, iv.length);
      combinedB.set(p1, iv.length + p2.length);

      return [combinedA, combinedB];
    }
  }

  return [fromBase64(trimmed)];
}

const keyCache = new Map<string, Promise<CryptoKey>>();

async function getSubtle() {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) return subtle;

  // Node.js fallback
  if (typeof window === "undefined") {
    const nodeCrypto = await import("crypto");
    return nodeCrypto.webcrypto.subtle;
  }

  throw new Error("WebCrypto is not available in this runtime");
}

async function getRandomIv(): Promise<Uint8Array> {
  const iv = new Uint8Array(12);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(iv);
    return iv;
  }

  if (typeof window === "undefined") {
    const nodeCrypto = await import("crypto");
    iv.set(nodeCrypto.randomBytes(12));
    return iv;
  }

  throw new Error("No secure random generator available");
}

async function deriveAes256Key(keyString: string): Promise<CryptoKey> {
  const subtle = await getSubtle();
  const material = textEncoder.encode(keyString.trim());
  const hash = await subtle.digest("SHA-256", material);
  return subtle.importKey("raw", hash, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

async function getAesKey(keyString: string): Promise<CryptoKey> {
  const existing = keyCache.get(keyString);
  if (existing) return existing;
  const created = deriveAes256Key(keyString);
  keyCache.set(keyString, created);
  return created;
}

export async function encryptJsonToPayload(
  data: JsonValue,
  keyString: string,
): Promise<string> {
  const subtle = await getSubtle();
  const key = await getAesKey(keyString);
  const iv = await getRandomIv();

  const plaintext = textEncoder.encode(JSON.stringify(data));
  const encrypted = await subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    plaintext,
  );

  const cipherWithTag = new Uint8Array(encrypted);

  const tagLengthBytes = 16;
  if (cipherWithTag.length < tagLengthBytes) {
    throw new Error('Invalid encryption result');
  }
  const ciphertext = cipherWithTag.slice(0, cipherWithTag.length - tagLengthBytes);
  const tag = cipherWithTag.slice(cipherWithTag.length - tagLengthBytes);

  return `${toBase64Url(iv)}.${toBase64Url(tag)}.${toBase64Url(ciphertext)}`;
}

export async function decryptPayloadToJson<T = unknown>(
  payload: string,
  keyString: string,
): Promise<T> {
  const subtle = await getSubtle();
  const key = await getAesKey(keyString);
  const candidates = decodePayloadCandidates(payload);
  let lastError: unknown = null;

  for (const combined of candidates) {
    if (combined.length < 12 + 16) {
      lastError = new Error("Invalid payload: too short");
      continue;
    }

    const iv = combined.slice(0, 12);
    const cipher = combined.slice(12);

    try {
      const decrypted = await subtle.decrypt(
        { name: "AES-GCM", iv, tagLength: 128 },
        key,
        cipher,
      );
      const plaintext = new TextDecoder().decode(new Uint8Array(decrypted));
      return JSON.parse(plaintext) as T;
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
