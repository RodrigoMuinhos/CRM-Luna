// Minimal typing to avoid requiring Node typings in this project.
declare const process: { env: Record<string, string | undefined> };

export function normalizeBaseUrl(input?: string | null): string | null {
  const raw = (input || '').trim();
  if (!raw) return null;
  // Allow same-origin config like '/' or '/api' to mean "no upstream" here.
  // (The proxy needs an absolute URL to call the upstream TotemAPI.)
  if (raw === '/' || raw.startsWith('/')) return null;
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '');
  return `https://${raw}`.replace(/\/$/, '');
}

export function getTotemApiBaseUrl(): string | null {
  // Prefer server-only env; fall back to public if someone set it.
  return (
    normalizeBaseUrl(process.env.TOTEM_API_PROXY_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_TOTEM_API_PROXY_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_TOTEM_API_URL) ||
    // Compatibility: some setups only define these.
    normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_LUNATOTEM_API_URL)
  );
}

export async function proxyTo(request: Request, targetUrl: string): Promise<Response> {
  const method = request.method.toUpperCase();

  // Clone headers; strip hop-by-hop headers.
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');

  // Ensure the upstream knows it's JSON when we send JSON.
  if (!headers.has('content-type') && !headers.has('Content-Type')) {
    headers.set('content-type', 'application/json');
  }

  const init: RequestInit = {
    method,
    headers,
    // Do not send body for GET/HEAD.
    body: method === 'GET' || method === 'HEAD' ? undefined : await request.text(),
    redirect: 'manual',
  };

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (error) {
    // Network/DNS/TLS error: return a helpful 502 for the UI.
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({
      error: 'Falha ao conectar no TotemAPI (proxy).',
      targetUrl,
      message,
    }), {
      status: 502,
      headers: {
        'content-type': 'application/json',
        'x-proxy-target': targetUrl,
      },
    });
  }

  // Pass through status + body; keep content-type.
  const responseHeaders = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) responseHeaders.set('content-type', contentType);
  const cacheControl = upstream.headers.get('cache-control');
  if (cacheControl) responseHeaders.set('cache-control', cacheControl);
  responseHeaders.set('x-proxy-target', targetUrl);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export function buildTargetUrlFromRequest(request: Request, baseUrl: string): string {
  const reqUrl = new URL(request.url);
  return `${baseUrl}${reqUrl.pathname}${reqUrl.search}`;
}
