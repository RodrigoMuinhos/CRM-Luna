/*
  Centralized TEF client for calling the local sitef-bridge.

  ETAPA 2: create module only; do not change UI screens.
*/

export type TefClientAction =
  | "health"
  | "status"
  | "cancel"
  | "pendencias"
  | "voltar"
  | "adminUrl";

export type TefClientError = {
  message: string;
  details?: any;
};

export type TefClientResult<T = any> = {
  ok: boolean;
  action: TefClientAction;
  saleId?: string;
  at: string; // ISO
  result?: T;
  error?: TefClientError;
};

export type TefClientOptions = {
  /** Base URL for sitef-bridge. Default: http://127.0.0.1:7071 */
  baseUrl?: string;
  /** Request timeout in ms. Default: 30000 */
  timeoutMs?: number;
  /** Fetch implementation override (useful for tests / non-browser runtimes). */
  fetchImpl?: typeof fetch;
  /** Extra headers applied to every request. */
  headers?: Record<string, string>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeBaseUrl(input?: string): string {
  const envBase =
    // Next.js public env (when bundled)
    (typeof process !== "undefined" && (process as any)?.env?.NEXT_PUBLIC_TEF_BRIDGE_URL) ||
    (typeof process !== "undefined" && (process as any)?.env?.TEF_BRIDGE_URL) ||
    (typeof process !== "undefined" && (process as any)?.env?.SITEF_BRIDGE_URL);

  const base = (input || envBase || "http://127.0.0.1:7071").trim();
  return base.replace(/\/+$/, "");
}

function toUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function readBody(response: Response): Promise<{ text: string; json?: any }>
{
  const text = await response.text();
  const json = safeJsonParse(text);
  return { text, json };
}

async function httpRequest<T>(params: {
  action: TefClientAction;
  saleId?: string;
  method: "GET" | "POST";
  url: string;
  timeoutMs: number;
  headers?: Record<string, string>;
  body?: any;
  fetchImpl: typeof fetch;
}): Promise<TefClientResult<T>> {
  const at = nowIso();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs);

  try {
    const headers: Record<string, string> = {
      "Accept": "application/json",
      ...(params.method === "POST" ? { "Content-Type": "application/json" } : {}),
      ...(params.headers || {}),
    };

    const response = await params.fetchImpl(params.url, {
      method: params.method,
      headers,
      body: params.method === "POST" ? JSON.stringify(params.body ?? {}) : undefined,
      signal: controller.signal,
    });

    const { text, json } = await readBody(response);

    if (!response.ok) {
      return {
        ok: false,
        action: params.action,
        saleId: params.saleId,
        at,
        error: {
          message: `HTTP ${response.status} calling ${params.url}`,
          details: {
            statusCode: response.status,
            statusText: response.statusText,
            url: params.url,
            responseText: text,
            responseJson: json,
          },
        },
      };
    }

    // Prefer parsed json when available; otherwise return text.
    const result: any = json ?? text;

    return {
      ok: true,
      action: params.action,
      saleId: params.saleId,
      at,
      result,
    };
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";

    return {
      ok: false,
      action: params.action,
      saleId: params.saleId,
      at,
      error: {
        message: isAbort
          ? `Timeout after ${params.timeoutMs}ms calling ${params.url}`
          : `Network/client error calling ${params.url}`,
        details: {
          url: params.url,
          timeoutMs: params.timeoutMs,
          name: err?.name,
          message: err?.message,
          stack: err?.stack,
        },
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export type TefClient = {
  baseUrl: string;
  timeoutMs: number;

  health(): Promise<TefClientResult>;
  status(saleId: string): Promise<TefClientResult>;
  cancel(saleId: string, opts?: { reason?: string }): Promise<TefClientResult>;
  pendencias(saleId?: string): Promise<TefClientResult>;
  voltar(saleId: string): Promise<TefClientResult>;
  adminUrl(): TefClientResult<{ url: string }>;
};

export function createTefClient(options: TefClientOptions = {}): TefClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const timeoutMs = options.timeoutMs ?? 30_000;

  const fetchImplMaybe: typeof fetch | undefined =
    options.fetchImpl || (typeof fetch !== "undefined" ? fetch : undefined);

  if (!fetchImplMaybe) {
    throw new Error(
      "No fetch implementation available. Provide options.fetchImpl (e.g., globalThis.fetch from Node 18+)."
    );
  }

  const fetchImpl: typeof fetch = fetchImplMaybe;

  const headers = options.headers;

  return {
    baseUrl,
    timeoutMs,

    health() {
      return httpRequest({
        action: "health",
        method: "GET",
        url: toUrl(baseUrl, "/api/health"),
        timeoutMs,
        headers,
        fetchImpl,
      });
    },

    status(saleId: string) {
      return httpRequest({
        action: "status",
        saleId,
        method: "GET",
        url: toUrl(baseUrl, `/tef/status/${encodeURIComponent(saleId)}`),
        timeoutMs,
        headers,
        fetchImpl,
      });
    },

    cancel(saleId: string, _opts?: { reason?: string }) {
      // sitef-bridge cancel endpoint ignores body today; keep for future.
      return httpRequest({
        action: "cancel",
        saleId,
        method: "POST",
        url: toUrl(baseUrl, `/tef/cancel/${encodeURIComponent(saleId)}`),
        timeoutMs,
        headers,
        body: {},
        fetchImpl,
      });
    },

    pendencias(saleId?: string) {
      // Pending job is not really tied to saleId, but we accept it for envelope compatibility.
      return httpRequest({
        action: "pendencias",
        saleId,
        method: "POST",
        url: toUrl(baseUrl, `/tef/pending/run`),
        timeoutMs,
        headers,
        body: {},
        fetchImpl,
      });
    },

    voltar(saleId: string) {
      return httpRequest({
        action: "voltar",
        saleId,
        method: "POST",
        url: toUrl(baseUrl, `/tef/back/${encodeURIComponent(saleId)}`),
        timeoutMs,
        headers,
        body: {},
        fetchImpl,
      });
    },

    adminUrl() {
      return {
        ok: true,
        action: "adminUrl",
        at: nowIso(),
        result: {
          url: toUrl(baseUrl, "/tef/admin"),
        },
      };
    },
  };
}

/** Default singleton client (safe to import anywhere). */
export const tefClient = createTefClient();
