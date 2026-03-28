export type TefStatus = 'IN_PROGRESS' | 'APPROVED' | 'DECLINED' | 'ERROR';

export type TefChargeInput = {
  saleId: string;
  amountCents: number;
  orderRef?: string;
  items?: unknown;
  operatorId?: string;
  storeId?: string;
  paymentMethod?: 'pix' | 'debit' | 'credit' | 'wallet' | string;
  command?: 'PIX' | 'DEBIT' | 'CREDIT' | string;
};

export type TefStatusPayload = {
  saleId: string;
  status: TefStatus;
  /**
   * Raw message as returned by CliSiTef/siTEF (no manipulation). This is required by
   * the Autoatendimento pre-homologation roteiro (V05) to be shown to the user/operator.
   */
  lastMessage?: string | null;
  displayMessage?: string | null;
  resultCode?: string | null;
  nsuHost?: string | null;
  nsuSitef?: string | null;
  updatedAt?: string | null;
  approvedData?: Record<string, unknown>;
  error?: string;
};

export type TefServiceControlStatus = {
  ok: boolean;
  supported: boolean;
  running: boolean;
  managedProcess?: boolean;
  pid?: number | null;
  healthReachable?: boolean;
  url?: string;
  healthUrl?: string;
  skipByEnv?: boolean;
  autostart?: {
    enabled?: boolean;
    delayMs?: number;
    scheduledAt?: string | null;
  } | null;
  lastStartAt?: string | null;
  lastStopAt?: string | null;
  lastError?: string | null;
  error?: string;
};

export type TefServiceStoreCodeResult = {
  ok: boolean;
  storeCode: string;
  requestedStoreCode?: string;
  service?: TefServiceControlStatus | null;
  rollback?: {
    attempted?: boolean;
    ok?: boolean;
    storeCode?: string;
    service?: TefServiceControlStatus | null;
    error?: string | null;
  } | null;
  error?: string;
};

declare global {
  interface Window {
    lunaKiosk?: {
      tef?: {
        charge: (input: TefChargeInput) => Promise<TefStatusPayload>;
        status: (saleId: string) => Promise<TefStatusPayload>;
        confirm?: (saleId: string, printedOk?: boolean) => Promise<any>;
      };
      tefService?: {
        status: () => Promise<TefServiceControlStatus>;
        start: () => Promise<TefServiceControlStatus>;
        stop: () => Promise<TefServiceControlStatus>;
      };
    };
  }
}

const DEFAULT_TEF_BRIDGE_URL = 'http://127.0.0.1:7071';

function normalizeStatus(raw: unknown): TefStatus {
  if (typeof raw === 'number') {
    // sitef-bridge returns enums as numbers by default
    // 0=InProgress, 1=Approved, 2=Declined, 3=Error
    if (raw === 0) return 'IN_PROGRESS';
    if (raw === 1) return 'APPROVED';
    if (raw === 2) return 'DECLINED';
    return 'ERROR';
  }

  const s = String(raw ?? '').trim().toUpperCase();
  if (s === 'INPROGRESS' || s === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (s === 'APPROVED') return 'APPROVED';
  if (s === 'DECLINED') return 'DECLINED';
  return 'ERROR';
}

function pickFirstText(...values: unknown[]): string | null {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return null;
}

function normalizePayload(input: any): TefStatusPayload {
  const displayMessage = pickFirstText(
    input?.lastMessage,
    input?.LastMessage,
    input?.displayMessage,
    input?.DisplayMessage,
    input?.message,
    input?.Message,
    input?.prompt,
    input?.Prompt,
    input?.pinpadMessage,
    input?.PinpadMessage,
    input?.clisitefMessage,
    input?.MsgCliSiTef,
    input?.approvedData?.message,
    input?.ApprovedData?.message
  );

  return {
    saleId: String(input?.saleId ?? ''),
    // sitef-bridge historically returns `state`; some clients return `status`.
    status: normalizeStatus(input?.status ?? input?.state),
    lastMessage: (input?.lastMessage ?? input?.LastMessage ?? null) as any,
    displayMessage,
    resultCode: (input?.resultCode ?? input?.ResultCode ?? null) as any,
    nsuHost: (input?.nsuHost ?? input?.NsuHost ?? null) as any,
    nsuSitef: (input?.nsuSitef ?? input?.NsuSitef ?? null) as any,
    updatedAt: (input?.updatedAt ?? input?.UpdatedAt ?? null) as any,
    approvedData: (input?.approvedData ?? input?.ApprovedData ?? undefined) as any,
    error: input?.error ?? input?.Error ?? undefined,
  };
}

function getBrowserTefBridgeBaseUrl(): string {
  // This only works for builds where env is injected at build-time.
  // For Electron hybrid (remote Vercel UI), prefer window.lunaKiosk.tef.
  const url = (process.env.NEXT_PUBLIC_TEF_BRIDGE_URL || '').trim();
  return url || DEFAULT_TEF_BRIDGE_URL;
}

export function getTefBridgeBaseUrl(): string {
  return getBrowserTefBridgeBaseUrl();
}

async function httpJson(url: string, init?: RequestInit): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch (e: any) {
    const raw = String(e?.message || e || '').toLowerCase();
    const isNetwork =
      raw.includes('failed to fetch') ||
      raw.includes('networkerror') ||
      raw.includes('network request failed') ||
      raw.includes('load failed');
    if (isNetwork) {
      const err = new Error('Sem conexão com servidor');
      (err as any).code = 'NETWORK_ERROR';
      throw err;
    }
    throw e;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const errorMsg = data?.error ? String(data.error) : `HTTP ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).status = res.status;
    (err as any).details = data;
    throw err;
  }
  return data;
}

export async function tefCharge(input: TefChargeInput): Promise<TefStatusPayload> {
  if (typeof window !== 'undefined' && window.lunaKiosk?.tef?.charge) {
    const data = await window.lunaKiosk.tef.charge(input);
    return normalizePayload(data);
  }

  // Browser fallback (dev only). Note: if you are on HTTPS (Vercel), the browser will block
  // requests to http://127.0.0.1 due to mixed content. In Electron we should use window.lunaKiosk.
  const baseUrl = getBrowserTefBridgeBaseUrl().replace(/\/$/, '');
  const data = await httpJson(`${baseUrl}/tef/charge`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return normalizePayload(data);
}

export async function tefStatus(saleId: string): Promise<TefStatusPayload> {
  if (typeof window !== 'undefined' && window.lunaKiosk?.tef?.status) {
    const data = await window.lunaKiosk.tef.status(saleId);
    return normalizePayload(data);
  }

  const baseUrl = getBrowserTefBridgeBaseUrl().replace(/\/$/, '');
  const data = await httpJson(`${baseUrl}/tef/status/${encodeURIComponent(saleId)}`, {
    method: 'GET',
  });
  return normalizePayload(data);
}

export async function tefConfirm(saleId: string, printedOk: boolean = true): Promise<any> {
  if (typeof window !== 'undefined' && window.lunaKiosk?.tef?.confirm) {
    return window.lunaKiosk.tef.confirm(saleId, printedOk);
  }

  const baseUrl = getBrowserTefBridgeBaseUrl().replace(/\/$/, '');
  return httpJson(`${baseUrl}/tef/confirm/${encodeURIComponent(saleId)}`, {
    method: 'POST',
    body: JSON.stringify({ printedOk }),
  });
}

export type TefReceiptResponse = {
  customerText?: string | null;
  merchantText?: string | null;
  paths?: Record<string, unknown> | null;
  printedAt?: string | null;
  printStatus?: string | null;
};

export async function tefReceipt(saleId: string): Promise<TefReceiptResponse> {
  const baseUrl = getBrowserTefBridgeBaseUrl().replace(/\/$/, '');
  return httpJson(`${baseUrl}/tef/receipt/${encodeURIComponent(saleId)}`, { method: 'GET' });
}

export type TefPrintOptions = {
  force?: boolean;
};

export async function tefPrint(saleId: string, opts: TefPrintOptions = {}): Promise<any> {
  const baseUrl = getBrowserTefBridgeBaseUrl().replace(/\/$/, '');
  const force = opts.force === true;
  const query = force ? '?force=true' : '';
  const data = await httpJson(`${baseUrl}/tef/print/${encodeURIComponent(saleId)}${query}`, { method: 'POST' });
  if (data && data.ok === false) {
    const err = new Error(String(data.error || 'print failed'));
    (err as any).details = data;
    throw err;
  }
  return data;
}

export async function tefHealth(): Promise<any> {
  const baseUrl = getBrowserTefBridgeBaseUrl().replace(/\/$/, '');
  return httpJson(`${baseUrl}/api/health`, { method: 'GET' });
}

export async function tefServiceStatus(): Promise<TefServiceControlStatus> {
  if (typeof window !== 'undefined' && window.lunaKiosk?.tefService?.status) {
    try {
      const data = await window.lunaKiosk.tefService.status();
      return {
        supported: true,
        ok: Boolean(data?.ok),
        running: Boolean(data?.running),
        ...data,
      };
    } catch (e: any) {
      return {
        ok: false,
        supported: true,
        running: false,
        error: String(e?.message || 'service_status_failed'),
      };
    }
  }

  try {
    const res = await fetch('/api/tef/service/status', {
      method: 'GET',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    return {
      supported: true,
      ok: Boolean(data?.ok),
      running: Boolean(data?.running),
      ...(data || {}),
      error: !res.ok ? String(data?.error || `service_status_http_${res.status}`) : data?.error,
    };
  } catch (e: any) {
    return {
      ok: false,
      supported: true,
      running: false,
      error: String(e?.message || 'service_status_failed'),
    };
  }
}

export async function tefServiceStart(password?: string): Promise<TefServiceControlStatus> {
  if (typeof window !== 'undefined' && window.lunaKiosk?.tefService?.start) {
    try {
      const data = await window.lunaKiosk.tefService.start();
      return {
        supported: true,
        ok: Boolean(data?.ok),
        running: Boolean(data?.running),
        ...data,
      };
    } catch (e: any) {
      return {
        ok: false,
        supported: true,
        running: false,
        error: String(e?.message || 'service_start_failed'),
      };
    }
  }

  try {
    const res = await fetch('/api/tef/service/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: String(password || '') }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    return {
      supported: true,
      ok: Boolean(data?.ok),
      running: Boolean(data?.running),
      ...(data || {}),
      error: !res.ok ? String(data?.error || `service_start_http_${res.status}`) : data?.error,
    };
  } catch (e: any) {
    return {
      ok: false,
      supported: true,
      running: false,
      error: String(e?.message || 'service_start_failed'),
    };
  }
}

export async function tefServiceStop(password?: string): Promise<TefServiceControlStatus> {
  if (typeof window !== 'undefined' && window.lunaKiosk?.tefService?.stop) {
    try {
      const data = await window.lunaKiosk.tefService.stop();
      return {
        supported: true,
        ok: Boolean(data?.ok),
        running: Boolean(data?.running),
        ...data,
      };
    } catch (e: any) {
      return {
        ok: false,
        supported: true,
        running: false,
        error: String(e?.message || 'service_stop_failed'),
      };
    }
  }

  try {
    const res = await fetch('/api/tef/service/stop', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: String(password || '') }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    return {
      supported: true,
      ok: Boolean(data?.ok),
      running: Boolean(data?.running),
      ...(data || {}),
      error: !res.ok ? String(data?.error || `service_stop_http_${res.status}`) : data?.error,
    };
  } catch (e: any) {
    return {
      ok: false,
      supported: true,
      running: false,
      error: String(e?.message || 'service_stop_failed'),
    };
  }
}

export async function tefServiceApplyStoreCode(storeCode: string, password?: string): Promise<TefServiceStoreCodeResult> {
  try {
    const res = await fetch('/api/tef/service/store-code', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        password: String(password || ''),
        storeCode: String(storeCode || ''),
      }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    return {
      ok: Boolean(data?.ok),
      storeCode: String(data?.storeCode || ''),
      requestedStoreCode: data?.requestedStoreCode ? String(data.requestedStoreCode) : undefined,
      service: (data?.service || null) as TefServiceControlStatus | null,
      rollback: (data?.rollback || null) as any,
      error: !res.ok ? String(data?.error || `store_code_http_${res.status}`) : data?.error,
    };
  } catch (e: any) {
    return {
      ok: false,
      storeCode: '',
      service: null,
      rollback: null,
      error: String(e?.message || 'store_code_apply_failed'),
    };
  }
}

export async function tefCancel(saleId: string): Promise<any> {
  const baseUrl = getBrowserTefBridgeBaseUrl().replace(/\/$/, '');
  return httpJson(`${baseUrl}/tef/cancel/${encodeURIComponent(saleId)}`, { method: 'POST' });
}

export async function tefBack(saleId: string): Promise<any> {
  const baseUrl = getBrowserTefBridgeBaseUrl().replace(/\/$/, '');
  return httpJson(`${baseUrl}/tef/back/${encodeURIComponent(saleId)}`, { method: 'POST' });
}

export async function tefPendingRun(): Promise<any> {
  const baseUrl = getBrowserTefBridgeBaseUrl().replace(/\/$/, '');
  return httpJson(`${baseUrl}/tef/pending/run`, { method: 'POST' });
}

export async function tefPendingStatus(): Promise<any> {
  const baseUrl = getBrowserTefBridgeBaseUrl().replace(/\/$/, '');
  return httpJson(`${baseUrl}/tef/pending/status`, { method: 'GET' });
}

export type TefAdminRunInput = {
  saleId: string;
  command: number;
  amountCents?: number;
  orderRef?: string | null;
  operatorId?: string | null;
};

export async function tefAdminRun(input: TefAdminRunInput): Promise<any> {
  const baseUrl = getBrowserTefBridgeBaseUrl().replace(/\/$/, '');
  return httpJson(`${baseUrl}/tef/admin/run`, {
    method: 'POST',
    body: JSON.stringify({
      saleId: input.saleId,
      command: input.command,
      amountCents: input.amountCents ?? 0,
      orderRef: input.orderRef ?? null,
      operatorId: input.operatorId ?? null,
    }),
  });
}

export async function tefAdminTrace(saleId: string): Promise<any> {
  const baseUrl = getBrowserTefBridgeBaseUrl().replace(/\/$/, '');
  return httpJson(`${baseUrl}/tef/admin/trace/${encodeURIComponent(saleId)}`, { method: 'GET' });
}

export type TefAdminCommandInput = {
  /** Usually a menu selection like "1" or a key like "F1" / "ESC" (depends on the siTEF flow). */
  command: string;
};

export async function tefAdminCommand(saleId: string, command: string): Promise<any> {
  const baseUrl = getBrowserTefBridgeBaseUrl().replace(/\/$/, '');
  return httpJson(`${baseUrl}/tef/admin/command/${encodeURIComponent(saleId)}`, {
    method: 'POST',
    body: JSON.stringify({ command }),
  });
}

/**
 * Initiate a refund (devolução) via TEF Admin Menu.
 * Sequence: Start admin flow (command 200) → Select refund option → Provide original transaction reference
 */
export type TefRefundInput = {
  saleId: string;
  originalSaleId: string;
  amountCents?: number; // Optional: partial refund support
  operatorId?: string;
};

export async function tefRefund(input: TefRefundInput): Promise<any> {
  const baseUrl = getBrowserTefBridgeBaseUrl().replace(/\/$/, '');
  return httpJson(`${baseUrl}/api/tef/refund`, {
    method: 'POST',
    body: JSON.stringify({
      saleId: input.saleId,
      originalSaleId: input.originalSaleId,
      amountCents: input.amountCents ?? null,
      operatorId: input.operatorId ?? null,
    }),
  });
}

export type PollTefOptions = {
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onProgress?: (status: TefStatusPayload) => void;
};

export async function pollTefStatus(saleId: string, opts: PollTefOptions = {}): Promise<TefStatusPayload> {
  const intervalMs = Math.max(250, opts.intervalMs ?? 1000);
  const timeoutMs = Math.max(1_000, opts.timeoutMs ?? 120_000);
  const startedAt = Date.now();

  while (true) {
    if (opts.signal?.aborted) {
      throw new Error('cancelled');
    }

    const status = await tefStatus(saleId);
    
    // Call progress callback if provided
    if (opts.onProgress) {
      try {
        opts.onProgress(status);
      } catch (e) {
        console.warn('[pollTefStatus] onProgress callback error:', e);
      }
    }
    
    if (status.status !== 'IN_PROGRESS') {
      return status;
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('timeout');
    }

    await new Promise<void>((resolve, reject) => {
      const handle = setTimeout(() => resolve(), intervalMs);
      if (opts.signal) {
        const onAbort = () => {
          clearTimeout(handle);
          reject(new Error('cancelled'));
        };
        opts.signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }
}
