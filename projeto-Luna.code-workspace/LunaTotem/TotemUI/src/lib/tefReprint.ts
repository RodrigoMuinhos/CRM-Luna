import { API_BASE_URL, AUTH_STORAGE_KEYS, PRINT_TERMINAL_ID, resolvePrintTenantId } from '@/lib/apiConfig';
import { getTefBridgeBaseUrl, tefPrint } from '@/lib/tefBridge';

type LocalTx = {
  saleId: string;
  amountCents: number;
  type: string;
  status: string;
  nsuHost?: string;
  updatedAt?: string;
};

type ReprintReceipt = {
  saleId: string;
  via: string;
  filename: string;
  bytes: number;
  text?: string;
  downloadUrl: string;
};

type ReprintResolveResponse = {
  ok: boolean;
  saleId?: string;
  matchedBy?: 'nsuHost' | 'saleId' | 'last' | 'last_with_receipt' | 'none';
  receipts?: ReprintReceipt[];
  comprovantesDir?: string;
  reportFile?: string;
  reportArchiveFile?: string;
  error?: string;
};

type LastTransactionResponse = {
  ok: boolean;
  transaction?: Partial<LocalTx> | null;
  error?: string;
};

export type TriggerTefReprintOptions = {
  saleId?: string;
  nsuHost?: string;
  source?: string;
  preferDirectPrint?: boolean;
};

export type TriggerTefReprintResult = {
  ok: true;
  strategy: 'bridge-print' | 'local-reprint' | 'bridge-action';
  saleId: string;
  matchedBy?: ReprintResolveResponse['matchedBy'];
  printedCount?: number;
};

function toBase64Utf8(text: string): string {
  const utf8 = encodeURIComponent(text).replace(
    /%([0-9A-F]{2})/g,
    (_, p1) => String.fromCharCode(parseInt(p1, 16))
  );
  return btoa(utf8);
}

function normalizeLocalTx(input: any): LocalTx | null {
  if (!input || typeof input !== 'object') return null;

  const saleId = String(input.saleId || '').trim();
  if (!saleId) return null;

  const amountRaw = Number(input.amountCents);
  const amountCents = Number.isFinite(amountRaw) ? amountRaw : 0;

  return {
    saleId,
    amountCents,
    type: String(input.type || 'TEF'),
    status: String(input.status || 'APPROVED'),
    nsuHost: input.nsuHost ? String(input.nsuHost) : undefined,
    updatedAt: input.updatedAt ? String(input.updatedAt) : new Date().toISOString(),
  };
}

function readLastSaleIdFromSession(): string {
  try {
    if (typeof window === 'undefined') return '';
    return String(window.sessionStorage.getItem('lv_last_sale_id') || '').trim();
  } catch {
    return '';
  }
}

function rememberLastSaleId(saleId: string): void {
  const sid = String(saleId || '').trim();
  if (!sid) return;
  try {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('lv_last_sale_id', sid);
  } catch {
    // ignore sessionStorage failures
  }
}

async function parseJsonSafe(resp: Response): Promise<any | null> {
  const text = await resp.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function enqueuePrintText(input: {
  saleId: string;
  via: string;
  receiptText: string;
  source?: string;
}): Promise<void> {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem(AUTH_STORAGE_KEYS.token) : null;
  const tenantId = resolvePrintTenantId(token);
  const res = await fetch(`${API_BASE_URL}/api/print-queue/enqueue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      terminalId: PRINT_TERMINAL_ID,
      tenantId,
      receiptType: 'PAYMENT',
      payload: toBase64Utf8(input.receiptText),
      priority: 0,
      metadata: JSON.stringify({
        source: input.source || 'GlobalF2Reprint',
        strategy: 'local-reprint',
        saleId: input.saleId,
        via: input.via,
        requestedAt: new Date().toISOString(),
      }),
    }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(String(data?.error || data?.message || `print_queue_http_${res.status}`));
  }
}

async function resolveLastReprint(opts: {
  saleId?: string;
  nsuHost?: string;
}): Promise<ReprintResolveResponse | null> {
  try {
    const body: Record<string, string> = {};
    const saleId = String(opts.saleId || '').trim();
    const nsuHost = String(opts.nsuHost || '').trim();
    if (saleId) body.saleId = saleId;
    if (nsuHost) body.nsuHost = nsuHost;

    const resp = await fetch('/api/tef/reprint/resolve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await parseJsonSafe(resp)) as ReprintResolveResponse | null;
    if (!resp.ok || !data) return null;
    return data;
  } catch {
    return null;
  }
}

async function getLastLocalTxFromApi(): Promise<LocalTx | null> {
  try {
    const resp = await fetch('/api/tef/transactions/last', {
      method: 'GET',
      cache: 'no-store',
    });
    const data = (await parseJsonSafe(resp)) as LastTransactionResponse | null;
    if (!resp.ok) return null;
    return normalizeLocalTx(data?.transaction);
  } catch {
    return null;
  }
}

async function requestBridgeReprintLast(targetSaleId: string): Promise<void> {
  const tefBaseUrl = getTefBridgeBaseUrl().replace(/\/$/, '');
  const resp = await fetch(`${tefBaseUrl}/tef/admin/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      saleId: targetSaleId,
      action: 'REPRINT_LAST',
      amount: 0,
    }),
  });
  const data = await parseJsonSafe(resp);
  if (!resp.ok || data?.ok === false) {
    throw new Error(String(data?.error || data?.message || `bridge_reprint_http_${resp.status}`));
  }
}

export async function triggerTefReprint(opts: TriggerTefReprintOptions = {}): Promise<TriggerTefReprintResult> {
  const source = String(opts.source || 'GlobalF2Reprint');
  const fallbackSaleId = readLastSaleIdFromSession();
  const requestedSaleId = String(opts.saleId || fallbackSaleId || '').trim();
  const requestedNsuHost = String(opts.nsuHost || '').trim();
  const tryDirectPrintFirst = opts.preferDirectPrint !== false;

  if (tryDirectPrintFirst && requestedSaleId) {
    try {
      await tefPrint(requestedSaleId, { force: true });
      rememberLastSaleId(requestedSaleId);
      return {
        ok: true,
        strategy: 'bridge-print',
        saleId: requestedSaleId,
      };
    } catch {
      // fallback below
    }
  }

  const resolved = await resolveLastReprint({ saleId: requestedSaleId, nsuHost: requestedNsuHost });
  const resolvedSaleId = String(resolved?.saleId || requestedSaleId || '').trim();
  const receipts = Array.isArray(resolved?.receipts) ? resolved.receipts : [];

  if (tryDirectPrintFirst && resolvedSaleId) {
    try {
      await tefPrint(resolvedSaleId, { force: true });
      rememberLastSaleId(resolvedSaleId);
      return {
        ok: true,
        strategy: 'bridge-print',
        saleId: resolvedSaleId,
        matchedBy: resolved?.matchedBy,
      };
    } catch {
      // fallback to local saved receipts
    }
  }

  if (receipts.length > 0) {
    let printedCount = 0;
    for (const receipt of receipts) {
      if (!receipt?.text) continue;
      try {
        await enqueuePrintText({
          saleId: resolvedSaleId || receipt.saleId,
          via: receipt.via,
          receiptText: String(receipt.text),
          source,
        });
        printedCount += 1;
      } catch {
        // Continue trying other receipts.
      }
    }

    if (printedCount > 0) {
      const usedSaleId = resolvedSaleId || String(receipts[0]?.saleId || '').trim();
      rememberLastSaleId(usedSaleId);
      return {
        ok: true,
        strategy: 'local-reprint',
        saleId: usedSaleId,
        matchedBy: resolved?.matchedBy,
        printedCount,
      };
    }
  }

  const txFromApi = await getLastLocalTxFromApi();
  const bridgeSaleId =
    resolvedSaleId || String(txFromApi?.saleId || '').trim() || `REPRINT-${Date.now()}`;

  await requestBridgeReprintLast(bridgeSaleId);
  rememberLastSaleId(bridgeSaleId);

  return {
    ok: true,
    strategy: 'bridge-action',
    saleId: bridgeSaleId,
    matchedBy: resolved?.matchedBy,
  };
}
