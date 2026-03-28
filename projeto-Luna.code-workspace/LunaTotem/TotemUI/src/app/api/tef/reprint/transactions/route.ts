import { NextResponse } from 'next/server';
import { getTotemApiBaseUrl } from '../../../_proxy';

import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

type StoredTefTransaction = {
  saleId: string;
  amountCents: number;
  type: 'DEBIT' | 'CREDIT' | 'PIX' | string;
  status: string;
  nsuHost?: string;
  marketName?: string;
  createdAt?: string;
  updatedAt?: string;
};

type StoreFileV1 = {
  version: 1;
  updatedAt: string;
  transactions: StoredTefTransaction[];
};

type PeriodFilter = 'day' | 'week' | 'month' | 'year' | 'all';
type ReceiptFilter = 'all' | 'with_receipt' | 'without_receipt';
type ReceiptFileMeta = {
  saleId: string;
  mtimeMs: number;
  amountCents: number | null;
  type: string | null;
  marketName: string | null;
};
type TraceRow = {
  saleId: string;
  amountCents: number;
  type: string;
  status: string;
  nsuHost: string | null;
  marketName: string | null;
  createdAt: string;
  updatedAt: string;
};
type ListedTx = {
  saleId: string;
  amountCents: number;
  type: string;
  status: string;
  nsuHost: string | null;
  marketName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  hasReceipt: boolean;
};

async function fetchDbReceiptSaleIds(saleIds: string[]): Promise<Set<string>> {
  const uniq = Array.from(new Set(saleIds.map((v) => String(v || '').trim()).filter(Boolean)));
  if (uniq.length === 0) return new Set<string>();

  const base = getTotemApiBaseUrl();
  if (!base) return new Set<string>();

  const terminalId = String(process.env.PRINT_TERMINAL_ID || 'TOTEM-001').trim() || 'TOTEM-001';
  const resp = await fetch(`${base}/api/print-queue/has-receipts`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      saleIds: uniq,
      terminalId,
    }),
    cache: 'no-store',
  }).catch(() => null);

  if (!resp || !resp.ok) return new Set<string>();
  const json = await resp.json().catch(() => null);
  const matched = Array.isArray(json?.matchedSaleIds) ? (json.matchedSaleIds as string[]) : [];
  return new Set(matched.map((v) => String(v || '').trim()).filter(Boolean));
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultDataDir(): string {
  if (process.env.LOCALAPPDATA) return path.join(process.env.LOCALAPPDATA, 'LunaKiosk');
  const home = os.homedir();
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'LunaKiosk');
  return path.join(home, '.local', 'share', 'LunaKiosk');
}

function uniqueStrings(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const full = path.resolve(value);
    if (seen.has(full)) continue;
    seen.add(full);
    out.push(full);
  }
  return out;
}

function walkUpDirs(startDir: string): string[] {
  const out: string[] = [];
  let current = path.resolve(startDir);
  while (true) {
    out.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return out;
}

function candidateDataDirs(): string[] {
  const cwd = process.cwd();
  const ups = walkUpDirs(cwd);
  const dirs: string[] = [defaultDataDir()];
  for (const base of ups) {
    dirs.push(path.join(base, 'sitef-bridge-published'));
    dirs.push(path.join(base, 'projeto-Luna.code-workspace', 'LunaKiosk', 'sitef-bridge'));
    dirs.push(path.join(base, 'projeto-Luna.code-workspace', 'LunaKiosk', 'sitef-bridge', 'sitef-bridge-published'));
  }
  return uniqueStrings(dirs);
}

function candidateTraceDirs(dataDirs: string[]): string[] {
  const dirs = [
    ...dataDirs.map((d) => path.join(d, 'trace')),
    path.join(process.cwd(), 'trace'),
  ];
  return uniqueStrings(dirs);
}

async function readTransactionsFile(filename: string): Promise<StoreFileV1 | null> {
  try {
    const raw = await fs.readFile(filename, 'utf8');
    const json = JSON.parse(raw) as StoreFileV1;
    if (!json || json.version !== 1 || !Array.isArray(json.transactions)) return null;
    return json;
  } catch (e: any) {
    if (e?.code === 'ENOENT') return null;
    throw e;
  }
}

async function readTransactionsFromAnyDir(dataDirs: string[]): Promise<{ file: string; store: StoreFileV1 } | null> {
  const files = uniqueStrings(dataDirs.map((d) => path.join(d, 'transactions.json')));
  for (const file of files) {
    const store = await readTransactionsFile(file);
    if (store) return { file, store };
  }
  return null;
}

function inferReceiptInfo(text: string): {
  amountCents: number | null;
  type: string | null;
  marketName: string | null;
} {
  const amountMatch =
    text.match(/(?:valor|total)\D{0,20}R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i) ||
    text.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i);
  const amountCents = amountMatch?.[1] ? parseBrlToCents(amountMatch[1]) : null;

  let type: string | null = null;
  if (/pix/i.test(text)) type = 'PIX';
  else if (/d[eé]bito|debit/i.test(text)) type = 'DEBIT';
  else if (/cr[eé]dito|credit/i.test(text)) type = 'CREDIT';

  const marketMatch =
    text.match(/(?:estab\.?|estabelecimento)\s*:\s*([^\r\n]+)/i) ||
    text.match(/(?:loja|mercado)\s*:\s*([^\r\n]+)/i);
  const marketName = marketMatch?.[1] ? String(marketMatch[1]).trim() : null;

  return { amountCents, type, marketName };
}

async function collectReceiptFiles(receiptsDirs: string[]): Promise<ReceiptFileMeta[]> {
  const out: ReceiptFileMeta[] = [];

  for (const root of receiptsDirs) {
    const stack: string[] = [root];
    while (stack.length > 0) {
      const dir = stack.pop() as string;
      const entries: Dirent[] = await fs.readdir(dir, { withFileTypes: true }).catch((e: any) => {
        if (e?.code === 'ENOENT') return [] as Dirent[];
        throw e;
      });

      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
          continue;
        }
        if (!entry.isFile()) continue;
        if (!entry.name.toLowerCase().endsWith('.txt')) continue;
        if (entry.name.toLowerCase() === 'sequence.txt' || entry.name.toLowerCase() === '_sequence.txt') continue;

        const rel = path.relative(root, full);
        const relParts = rel.split(path.sep).filter(Boolean);

        // Format A (current): receipts/<saleId>/<arquivo>.txt
        // Format B (legacy): receipts/<saleId>-<via>.txt
        let saleId = '';
        if (relParts.length >= 2) {
          saleId = String(relParts[0] || '').trim();
        } else {
          const match = entry.name.match(/^(.*)-([^-]+)\.txt$/i);
          if (match?.[1]) saleId = String(match[1] || '').trim();
        }
        if (!saleId) continue;

        const stat = await fs.stat(full);
        const txt = await fs.readFile(full, 'utf8').catch(() => '');
        const info = inferReceiptInfo(String(txt || ''));
        out.push({
          saleId,
          mtimeMs: stat.mtimeMs,
          amountCents: info.amountCents,
          type: info.type,
          marketName: info.marketName,
        });
      }
    }
  }

  return out;
}

function parseDateInput(input: string | null): Date | null {
  const value = String(input || '').trim();
  if (!value) return null;

  // Browser localized string fallback (e.g. "16/02/2026 15:30").
  const br = value.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2})(?::(\d{2})(?::(\d{2}))?)?)?$/
  );
  if (br) {
    const day = Number(br[1]);
    const month = Number(br[2]) - 1;
    const year = Number(br[3]);
    const hh = Number(br[4] || '0');
    const mm = Number(br[5] || '0');
    const ss = Number(br[6] || '0');
    const local = new Date(year, month, day, hh, mm, ss, 0);
    if (!Number.isNaN(local.getTime())) return local;
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function periodBounds(period: PeriodFilter): { from: Date | null; to: Date | null } {
  if (period === 'all') return { from: null, to: null };

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === 'week') {
    start.setDate(start.getDate() - 6);
  } else if (period === 'month') {
    start.setMonth(start.getMonth() - 1);
  } else if (period === 'year') {
    start.setFullYear(start.getFullYear() - 1);
  }

  // Keep "to" open to avoid excluding fresh records due to clock skew.
  return { from: start, to: null };
}

function txTimestampMs(tx: StoredTefTransaction): number {
  const primary = String(tx.updatedAt || tx.createdAt || '').trim();
  if (!primary) return 0;
  const ms = Date.parse(primary);
  return Number.isFinite(ms) ? ms : 0;
}

function clampLimit(input: string | null): number {
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return 120;
  return Math.max(1, Math.min(1000, Math.floor(n)));
}

function parseBrlToCents(value: string): number | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw.replace(/\./g, '').replace(',', '.');
  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

function toIsoOrNull(value: string): string | null {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function inferTraceRow(input: any, fallbackSaleId: string, fileMtimeMs: number): TraceRow | null {
  const saleId = String(input?.saleId || fallbackSaleId || '').trim();
  if (!saleId) return null;

  const segments = Array.isArray(input?.segments) ? input.segments : [];
  const texts = segments
    .map((s: any) => String(s?.text || '').trim())
    .filter((s: string) => Boolean(s));
  const joined = texts.join('\n');
  const lower = joined.toLowerCase();

  let status = 'PENDING';
  if (
    /pagamento confirmado|transa[çc][aã]o aprovad|transacao aprovad|aprovad/i.test(joined) ||
    /approved/i.test(joined)
  ) {
    status = 'APPROVED';
  } else if (/cancelad|anulad|opera[çc][aã]o anulad|transacao cancelad/i.test(joined)) {
    status = 'CANCELED';
  } else if (
    /declin|negad|n[ãa]o autorizad|nao autorizad|erro|error|operacao nao permitida/i.test(joined)
  ) {
    status = 'ERROR';
  } else if (input?.ok === true) {
    status = 'PENDING';
  } else if (input?.ok === false) {
    status = 'ERROR';
  }

  let type = 'UNKNOWN';
  if (/pix/i.test(joined)) type = 'PIX';
  else if (/d[eé]bito|debit/i.test(joined)) type = 'DEBIT';
  else if (/cr[eé]dito|credit/i.test(joined)) type = 'CREDIT';

  let amountCents = 0;
  const amountMatch =
    joined.match(/(?:valor|venda|total)\D{0,20}R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i) ||
    joined.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i);
  if (amountMatch?.[1]) {
    amountCents = parseBrlToCents(amountMatch[1]) ?? 0;
  } else {
    // Heuristic from host integer amount: 00007 => R$ 7,00
    const smallInt = joined.match(/\b0{0,4}([1-9][0-9]{0,4})\b/);
    if (smallInt?.[1] && Number(smallInt[1]) <= 50000 && lower.includes('aprov')) {
      amountCents = Number(smallInt[1]) * 100;
    }
  }

  const nsuHostMatch = joined.match(/(?:nsu\s*host|host)\D*([0-9]{3,})/i);
  const nsuHost = nsuHostMatch?.[1] ? String(nsuHostMatch[1]) : null;
  const marketMatch =
    joined.match(/(?:estab\.?|estabelecimento)\s*:\s*([^\r\n]+)/i) ||
    joined.match(/(?:loja|mercado)\s*:\s*([^\r\n]+)/i);
  const marketName = marketMatch?.[1] ? String(marketMatch[1]).trim() : null;

  const firstTsRaw = segments
    .map((s: any) => String(s?.ts || '').trim())
    .find((ts: string) => Boolean(ts));
  const firstTs = firstTsRaw ? toIsoOrNull(firstTsRaw) : null;
  const persistedIso = toIsoOrNull(String(input?.persistedAt || ''));
  const mtimeIso = new Date(fileMtimeMs).toISOString();

  const createdAt = firstTs || persistedIso || mtimeIso;
  const updatedAt = persistedIso || mtimeIso;

  return {
    saleId,
    amountCents,
    type,
    status,
    nsuHost,
    marketName,
    createdAt,
    updatedAt,
  };
}

async function collectTraceRows(traceDirs: string[]): Promise<TraceRow[]> {
  const out: TraceRow[] = [];

  for (const dir of traceDirs) {
    const entries: Dirent[] = await fs.readdir(dir, { withFileTypes: true }).catch((e: any) => {
      if (e?.code === 'ENOENT') return [] as Dirent[];
      throw e;
    });

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.toLowerCase().endsWith('.json')) continue;

      const full = path.join(dir, entry.name);
      const stat = await fs.stat(full).catch(() => null);
      if (!stat) continue;

      const raw = await fs.readFile(full, 'utf8').catch(() => null);
      if (!raw) continue;

      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }

      const fallbackSaleId = path.basename(entry.name, '.json');
      const tx = inferTraceRow(parsed, fallbackSaleId, stat.mtimeMs);
      if (!tx) continue;
      out.push(tx);
    }
  }

  return out;
}

function txRowMs(tx: {
  updatedAt?: string | null;
  createdAt?: string | null;
}): number {
  const primary = String(tx.updatedAt || tx.createdAt || '').trim();
  if (!primary) return 0;
  const ms = Date.parse(primary);
  return Number.isFinite(ms) ? ms : 0;
}

function mergeTx(base: ListedTx | null, incoming: ListedTx): ListedTx {
  if (!base) return incoming;

  const baseMs = txRowMs(base);
  const incomingMs = txRowMs(incoming);
  const recent = incomingMs >= baseMs ? incoming : base;
  const old = incomingMs >= baseMs ? base : incoming;

  const status =
    recent.status && recent.status !== 'RECEIPT_ONLY'
      ? recent.status
      : old.status || recent.status;
  const type =
    recent.type && recent.type !== 'RECEIPT'
      ? recent.type
      : old.type || recent.type;

  return {
    saleId: recent.saleId,
    amountCents: recent.amountCents || old.amountCents || 0,
    type,
    status,
    nsuHost: recent.nsuHost || old.nsuHost || null,
    marketName: recent.marketName || old.marketName || null,
    createdAt: recent.createdAt || old.createdAt,
    updatedAt: recent.updatedAt || old.updatedAt,
    hasReceipt: recent.hasReceipt || old.hasReceipt,
  };
}

async function atomicWriteFile(filename: string, content: string): Promise<void> {
  const dir = path.dirname(filename);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${filename}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, filename);
}

function normalizeStoredTx(input: ListedTx): StoredTefTransaction {
  const now = nowIso();
  return {
    saleId: input.saleId,
    amountCents: Number(input.amountCents || 0),
    type: String(input.type || 'UNKNOWN'),
    status: String(input.status || 'PENDING'),
    nsuHost: input.nsuHost || undefined,
    marketName: input.marketName || undefined,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

async function syncTransactionsStore(rows: ListedTx[]): Promise<{ file: string; synced: number } | null> {
  try {
    const file = path.join(defaultDataDir(), 'transactions.json');
    const existing = await readTransactionsFile(file);
    const base: StoreFileV1 = existing ?? {
      version: 1,
      updatedAt: nowIso(),
      transactions: [],
    };

    const map = new Map<string, StoredTefTransaction>();
    for (const tx of base.transactions) {
      const saleId = String(tx.saleId || '').trim();
      if (!saleId) continue;
      map.set(saleId, tx);
    }

    for (const row of rows) {
      const saleId = String(row.saleId || '').trim();
      if (!saleId) continue;
      const incoming = normalizeStoredTx(row);
      const current = map.get(saleId);
      if (!current) {
        map.set(saleId, incoming);
        continue;
      }

      const currentMs = Date.parse(String(current.updatedAt || current.createdAt || '')) || 0;
      const incomingMs = Date.parse(String(incoming.updatedAt || incoming.createdAt || '')) || 0;
      const preferred = incomingMs >= currentMs ? incoming : current;
      const fallback = incomingMs >= currentMs ? current : incoming;

      map.set(saleId, {
        ...preferred,
        amountCents: preferred.amountCents || fallback.amountCents || 0,
        type:
          preferred.type && preferred.type !== 'RECEIPT'
            ? preferred.type
            : fallback.type || preferred.type,
        status:
          preferred.status && preferred.status !== 'RECEIPT_ONLY'
            ? preferred.status
            : fallback.status || preferred.status,
        nsuHost: preferred.nsuHost || fallback.nsuHost,
        marketName: preferred.marketName || fallback.marketName,
      });
    }

    const merged = Array.from(map.values()).sort((a, b) => txTimestampMs(b) - txTimestampMs(a));
    const next: StoreFileV1 = {
      version: 1,
      updatedAt: nowIso(),
      transactions: merged,
    };
    await atomicWriteFile(file, JSON.stringify(next, null, 2));
    return { file, synced: rows.length };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const periodRaw = String(url.searchParams.get('period') || 'all').trim().toLowerCase();
    const period: PeriodFilter = ['day', 'week', 'month', 'year', 'all'].includes(periodRaw)
      ? (periodRaw as PeriodFilter)
      : 'all';
    const receiptRaw = String(url.searchParams.get('receipt') || 'all').trim().toLowerCase();
    const receipt: ReceiptFilter = ['all', 'with_receipt', 'without_receipt'].includes(receiptRaw)
      ? (receiptRaw as ReceiptFilter)
      : 'all';

    const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
    const limit = clampLimit(url.searchParams.get('limit'));

    const fallbackRange = periodBounds(period);
    const explicitFrom = parseDateInput(url.searchParams.get('from'));
    const explicitTo = parseDateInput(url.searchParams.get('to'));
    const from = explicitFrom || fallbackRange.from;
    const to = explicitTo || fallbackRange.to;

    const dataDirs = candidateDataDirs();
    const receiptsDirs = uniqueStrings(dataDirs.map((d) => path.join(d, 'receipts')));
    const traceDirs = candidateTraceDirs(dataDirs);
    const loaded = await readTransactionsFromAnyDir(dataDirs);
    const receiptFiles = await collectReceiptFiles(receiptsDirs);
    const traceRows = await collectTraceRows(traceDirs);

    const receiptHints = new Map<
      string,
      {
        mtimeMs: number;
        amountCents: number;
        type: string;
        marketName: string | null;
      }
    >();
    for (const item of receiptFiles) {
      const prev = receiptHints.get(item.saleId) ?? {
        mtimeMs: 0,
        amountCents: 0,
        type: 'RECEIPT',
        marketName: null,
      };
      const next = { ...prev };
      if (item.mtimeMs > next.mtimeMs) next.mtimeMs = item.mtimeMs;
      if (Number(item.amountCents || 0) > 0) next.amountCents = Number(item.amountCents || 0);
      if (item.type) next.type = item.type;
      if (item.marketName) next.marketName = item.marketName;
      receiptHints.set(item.saleId, next);
    }

    const fromMs = from ? from.getTime() : null;
    const toMs = to ? to.getTime() : null;

    const sourceTransactions = Array.isArray(loaded?.store?.transactions) ? loaded!.store.transactions : [];
    const mergedBySale = new Map<string, ListedTx>();

    for (const tx of sourceTransactions) {
      const saleId = String(tx.saleId || '').trim();
      if (!saleId) continue;
      const row: ListedTx = {
        saleId,
        amountCents: Number(tx.amountCents || 0),
        type: String(tx.type || ''),
        status: String(tx.status || ''),
        nsuHost: tx.nsuHost ? String(tx.nsuHost) : null,
        marketName: tx.marketName ? String(tx.marketName) : null,
        createdAt: tx.createdAt || null,
        updatedAt: tx.updatedAt || null,
        hasReceipt: receiptHints.has(saleId),
      };
      mergedBySale.set(saleId, mergeTx(mergedBySale.get(saleId) || null, row));
    }

    for (const tx of traceRows) {
      const saleId = String(tx.saleId || '').trim();
      if (!saleId) continue;
      const row: ListedTx = {
        saleId,
        amountCents: Number(tx.amountCents || 0),
        type: String(tx.type || ''),
        status: String(tx.status || ''),
        nsuHost: tx.nsuHost || null,
        marketName: tx.marketName || null,
        createdAt: tx.createdAt || null,
        updatedAt: tx.updatedAt || null,
        hasReceipt: receiptHints.has(saleId),
      };
      mergedBySale.set(saleId, mergeTx(mergedBySale.get(saleId) || null, row));
    }

    for (const [saleId, receiptMeta] of receiptHints.entries()) {
      const receiptIso = new Date(receiptMeta.mtimeMs).toISOString();
      const row: ListedTx = {
        saleId,
        amountCents: Number(receiptMeta.amountCents || 0),
        type: String(receiptMeta.type || 'RECEIPT'),
        status: 'RECEIPT_ONLY',
        nsuHost: null,
        marketName: receiptMeta.marketName || null,
        createdAt: receiptIso,
        updatedAt: receiptIso,
        hasReceipt: true,
      };
      mergedBySale.set(saleId, mergeTx(mergedBySale.get(saleId) || null, row));
    }

    const allRowsBase = Array.from(mergedBySale.values());
    const dbReceiptSaleIds = await fetchDbReceiptSaleIds(allRowsBase.map((row) => row.saleId));
    const allRows = allRowsBase.map((row) => ({
      ...row,
      hasReceipt: row.hasReceipt || dbReceiptSaleIds.has(String(row.saleId || '').trim()),
    }));
    void syncTransactionsStore(allRows);

    const filtered = allRows
      .filter((row) => {
        const ts = txRowMs(row);
        if (fromMs !== null && ts < fromMs) return false;
        if (toMs !== null && ts > toMs) return false;
        return true;
      })
      .filter((row) => {
        if (receipt === 'with_receipt') return row.hasReceipt;
        if (receipt === 'without_receipt') return !row.hasReceipt;
        return true;
      })
      .filter((row) => {
        if (!q) return true;
        const hay = [
          row.saleId,
          row.nsuHost || '',
          row.type,
          row.status,
          row.marketName || '',
          row.createdAt || '',
          row.updatedAt || '',
          row.hasReceipt ? 'comprovante' : '',
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });

    const items = filtered
      .sort((a, b) => {
        const aMs = Date.parse(String(a.updatedAt || a.createdAt || '')) || 0;
        const bMs = Date.parse(String(b.updatedAt || b.createdAt || '')) || 0;
        return bMs - aMs;
      })
      .slice(0, limit);

    return NextResponse.json({
      ok: true,
      at: nowIso(),
      period,
      receipt,
      from: from?.toISOString() || null,
      to: to?.toISOString() || null,
      sourceFile: loaded?.file || null,
      diagnostics: {
        dataDirs,
        traceDirs,
        sourceTransactions: sourceTransactions.length,
        fromReceipts: receiptHints.size,
        fromPrintQueueDb: dbReceiptSaleIds.size,
        fromTrace: traceRows.length,
      },
      total: allRows.length,
      count: items.length,
      transactions: items,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'failed_to_list_reprint_transactions' },
      { status: 500 }
    );
  }
}
