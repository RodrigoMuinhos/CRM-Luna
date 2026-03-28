import { NextResponse } from 'next/server';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

type StoredTefTransaction = {
  saleId: string;
  amountCents: number;
  type: 'DEBIT' | 'CREDIT' | 'PIX' | string;
  status: 'STARTED' | 'ERROR' | 'APPROVED' | 'DENIED' | 'CANCELED' | 'PENDING' | string;

  nsuHost?: string;
  nsuSitef?: string;

  createdAt: string;
  updatedAt: string;

  lastMessage?: string;
  resultCode?: string;

  raw?: unknown;
};

type StoreFileV1 = {
  version: 1;
  updatedAt: string;
  transactions: StoredTefTransaction[];
};

function defaultDataDir(): string {
  // Mirrors kiosk-core TransactionStore default.
  if (process.env.LOCALAPPDATA) return path.join(process.env.LOCALAPPDATA, 'LunaKiosk');

  const home = os.homedir();
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'LunaKiosk');
  return path.join(home, '.local', 'share', 'LunaKiosk');
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = path.resolve(v);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
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

function candidateTraceDirs(): string[] {
  const cwd = process.cwd();
  const ups = walkUpDirs(cwd);

  const dirs: string[] = [path.join(defaultDataDir(), 'trace')];
  for (const base of ups) {
    dirs.push(path.join(base, 'sitef-bridge-published', 'trace'));
    dirs.push(path.join(base, 'projeto-Luna.code-workspace', 'LunaKiosk', 'sitef-bridge', 'trace'));
    dirs.push(
      path.join(base, 'projeto-Luna.code-workspace', 'LunaKiosk', 'sitef-bridge', 'sitef-bridge-published', 'trace')
    );
  }

  return uniqueStrings(dirs);
}

async function readLocalTransactionsFile(): Promise<StoreFileV1 | null> {
  const filename = path.join(defaultDataDir(), 'transactions.json');
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

function parseBrlAmountToCents(raw: string): number | null {
  const cleaned = String(raw || '').trim().replace(/\./g, '').replace(',', '.');
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

function inferTxFromTrace(input: any, fallbackSaleId: string, mtimeIso: string): StoredTefTransaction | null {
  const saleId = String(input?.saleId || fallbackSaleId || '').trim();
  if (!saleId) return null;

  const segments = Array.isArray(input?.segments) ? input.segments : [];
  const texts = segments
    .map((s: any) => String(s?.text || '').trim())
    .filter((s: string) => Boolean(s));

  const full = texts.join('\n');

  let amountCents = 0;
  const mValue = full.match(/Valor:\s*([0-9\.,]+)/i);
  if (mValue?.[1]) {
    amountCents = parseBrlAmountToCents(mValue[1]) ?? 0;
  }

  let type: StoredTefTransaction['type'] = 'CREDIT';
  if (/debito|debit/i.test(full)) type = 'DEBIT';
  else if (/pix/i.test(full)) type = 'PIX';
  else if (/credito|credit/i.test(full)) type = 'CREDIT';

  let status: StoredTefTransaction['status'] = 'PENDING';
  if (/transacao\s+aprov|aprovad/i.test(full)) status = 'APPROVED';
  else if (/operacao\s+cancel|cancelad/i.test(full)) status = 'CANCELED';
  else if (/negad|n[ãa]o\s+aprovad|declin|erro|error/i.test(full)) status = 'ERROR';

  let nsuHost = '';
  const mHost = full.match(/Host:\s*([0-9A-Za-z]+)/i);
  if (mHost?.[1]) nsuHost = String(mHost[1]);

  const firstTs = segments
    .map((s: any) => String(s?.ts || '').trim())
    .find((ts: string) => Boolean(ts));

  const lastMessage = texts.length ? texts[texts.length - 1] : undefined;

  return {
    saleId,
    amountCents,
    type,
    status,
    nsuHost: nsuHost || undefined,
    createdAt: firstTs || mtimeIso,
    updatedAt: mtimeIso,
    lastMessage,
    raw: input,
  };
}

async function readLatestTraceTransaction(): Promise<StoredTefTransaction | null> {
  const dirs = candidateTraceDirs();

  let best: { file: string; mtimeMs: number } | null = null;
  for (const dir of dirs) {
    let items: Array<{ name: string; full: string; mtimeMs: number }> = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isFile()) continue;
        if (!e.name.toLowerCase().endsWith('.json')) continue;
        const full = path.join(dir, e.name);
        const stat = await fs.stat(full);
        items.push({ name: e.name, full, mtimeMs: stat.mtimeMs });
      }
    } catch (e: any) {
      if (e?.code === 'ENOENT') continue;
      throw e;
    }

    items.sort((a, b) => b.mtimeMs - a.mtimeMs);
    const top = items[0];
    if (!top) continue;
    if (!best || top.mtimeMs > best.mtimeMs) {
      best = { file: top.full, mtimeMs: top.mtimeMs };
    }
  }

  if (!best) return null;

  const raw = await fs.readFile(best.file, 'utf8');
  const json = JSON.parse(raw);
  const stat = await fs.stat(best.file);
  const mtimeIso = stat.mtime.toISOString();
  const saleIdFromName = path.basename(best.file, '.json');
  return inferTxFromTrace(json, saleIdFromName, mtimeIso);
}

function toTimeMs(input?: string): number {
  if (!input) return 0;
  const ms = Date.parse(input);
  return Number.isFinite(ms) ? ms : 0;
}

export async function GET() {
  try {
    const file = await readLocalTransactionsFile();
    const storeLast = file?.transactions?.[0] ?? null;
    const traceLast = await readLatestTraceTransaction();

    const storeMs = toTimeMs(storeLast?.updatedAt || storeLast?.createdAt);
    const traceMs = toTimeMs(traceLast?.updatedAt || traceLast?.createdAt);

    const chosen = traceMs > storeMs ? traceLast : storeLast || traceLast;
    if (!chosen) {
      return NextResponse.json(
        { ok: false, error: 'no_local_transactions' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      at: new Date().toISOString(),
      source: traceMs > storeMs ? 'trace' : 'transactions',
      transaction: chosen,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'failed_to_read_local_transactions' },
      { status: 500 }
    );
  }
}
