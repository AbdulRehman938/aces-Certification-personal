import { cookies } from 'next/headers';
import { decryptPayloadToJson } from '@/lib/payload-crypto';

const HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  'content-encoding',
]);

function getApiBaseUrl(reqUrl: string) {
  const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!raw) {
    throw new Error(
      'Missing API base URL. Set API_URL (server) or NEXT_PUBLIC_API_URL (client) to your backend origin (e.g. https://api.example.com).',
    );
  }

  let apiOrigin: URL;
  try {
    apiOrigin = new URL(raw);
  } catch {
    throw new Error(
      `Invalid API base URL: "${raw}". It must include protocol, e.g. https://api.example.com`,
    );
  }

  const requestOrigin = new URL(reqUrl).origin;
  if (apiOrigin.origin === requestOrigin) {
    throw new Error(
      `API base URL resolves to this same Next.js origin (${requestOrigin}). This would proxy /api/* back into itself. Point API_URL/NEXT_PUBLIC_API_URL to the backend server instead.`,
    );
  }

  const rawNormalized = apiOrigin.toString().replace(/\/+$/, '');
  return rawNormalized.endsWith('/api') ? rawNormalized : `${rawNormalized}/api`;
}



function buildTargetUrlFromRequest(reqUrl: string, pathSegments: string[], search: string) {
  const base = getApiBaseUrl(reqUrl).replace(/\/+$/, '');
  const path = pathSegments.map(encodeURIComponent).join('/');
  return `${base}/${path}${search}`;
}

async function buildForwardHeaders(req: Request) {
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_HEADERS.has(lower)) return;
    if (lower === 'cookie') return;
    if (lower === 'origin') return;
    headers.set(key, value);
  });

  if (!headers.has('authorization')) {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return headers;
}

export const dynamic = 'force-dynamic';

async function proxyRequest(req: Request, params: { path?: string[] }) {
  const search = new URL(req.url).search;
  const pathSegments = params.path ?? [];
  let url: string;
  try {
    url = buildTargetUrlFromRequest(req.url, pathSegments, search);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: 'Proxy misconfigured',
        details: message,
        hint: 'Set API_URL (recommended) or NEXT_PUBLIC_API_URL to your backend origin. Do not point it at http://localhost:3000.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const method = req.method.toUpperCase();
  const body =
    method === 'GET' || method === 'HEAD' ? undefined : await req.arrayBuffer();

  if (process.env.NODE_ENV === 'development' && body) {
    const encryptionKey =
      process.env.API_PAYLOAD_ENCRYPTION_KEY ||
      process.env.NEXT_PUBLIC_API_PAYLOAD_ENCRYPTION_KEY ||
      '';

    const contentType = req.headers.get('content-type') || '';
    if (encryptionKey && contentType.toLowerCase().includes('application/json')) {
      try {
        const text = new TextDecoder().decode(new Uint8Array(body));
        const raw = JSON.parse(text) as { payload?: unknown };
        if (typeof raw?.payload === 'string' && raw.payload.trim()) {
          // Attempt to decrypt the payload for logging/debugging purposes
          // The actual request body sent to the upstream will still be the original encrypted one
          await decryptPayloadToJson<Record<string, unknown>>(
            raw.payload,
            encryptionKey,
          ).catch((err) => {
            console.warn('Failed to decrypt payload in dev proxy:', err);
            // Do not rethrow, just log and continue with the original body
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return new Response(
          JSON.stringify({
            error: 'Invalid encrypted payload (client->proxy)',
            details: message,
            hint: 'Check NEXT_PUBLIC_API_PAYLOAD_ENCRYPTION_KEY matches API_PAYLOAD_ENCRYPTION_KEY and restart `npm run dev` after env changes.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }
  }

  try {
    const upstream = await fetch(url, {
      method,
      headers: await buildForwardHeaders(req),
      body,
      redirect: 'manual',
    });

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (HOP_HEADERS.has(lower)) return;
      if (lower === 'set-cookie') return;
      if (lower.startsWith('access-control-')) return;
      responseHeaders.set(key, value);
    });
    responseHeaders.set('x-proxy-route', '1');
    responseHeaders.set('x-proxy-target', url);

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Proxy error for ${url}:`, error);
    return new Response(JSON.stringify({ error: 'Proxy failed', details: String(error) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const params = await ctx.params;
  return proxyRequest(req, params);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const params = await ctx.params;
  return proxyRequest(req, params);
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const params = await ctx.params;
  return proxyRequest(req, params);
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const params = await ctx.params;
  return proxyRequest(req, params);
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const params = await ctx.params;
  return proxyRequest(req, params);
}

export async function OPTIONS(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const params = await ctx.params;
  return proxyRequest(req, params);
}
