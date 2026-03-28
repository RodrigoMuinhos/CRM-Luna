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
  createdAt?: string;
  updatedAt?: string;

  // Optional audit fields (backward compatible)
  reprintRequestedAt?: string;
  reprintRequestedCount?: number;
};

type StoreFileV1 = {
  version: 1;
  updatedAt: string;
  transactions: StoredTefTransaction[];
};

type ReceiptItem = {
  saleId: string;
  via: string;
  filename: string;
  bytes: number;
  text?: string;
  downloadUrl: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

async function appendReprintDebugLog(event: Record<string, any>): Promise<void> {
  try {
    const dir = path.join(process.cwd(), 'comprovantes');
    await fs.mkdir(dir, { recursive: true });
    const logFile = path.join(dir, 'reprint-debug.log');
    const line = JSON.stringify({
      at: nowIso(),
      ...event,
    });
    await fs.appendFile(logFile, `${line}\n`, 'utf8');
  } catch {
    // best effort log only
  }
}

function defaultDataDir(): string {
  if (process.env.LOCALAPPDATA) return path.join(process.env.LOCALAPPDATA, 'LunaKiosk');
  const home = os.homedir();
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'LunaKiosk');
  return path.join(home, '.local', 'share', 'LunaKiosk');
}

function defaultComprovantesDir(): string {
  const envDir = String(process.env.TEF_COMPROVANTES_DIR || '').trim();
  if (envDir) return path.resolve(envDir);
  return path.join(process.cwd(), 'comprovantes');
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

function sanitizeVia(via: string): string {
  const s = String(via || '').trim() || 'unknown';
  return s.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 32);
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

async function atomicWriteFile(filename: string, content: string): Promise<void> {
  const dir = path.dirname(filename);
  await fs.mkdir(dir, { recursive: true });

  const tmp = `${filename}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(tmp, content, 'utf8');

  try {
    await fs.rename(tmp, filename);
  } catch (e: any) {
    if (e?.code === 'EPERM' || e?.code === 'EEXIST') {
      try {
        await fs.unlink(filename);
      } catch {
        // ignore
      }
      await fs.rename(tmp, filename);
      return;
    }
    throw e;
  }
}

function compactTimestamp(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

async function writeComprovantesReport(input: {
  requestedSaleId: string;
  requestedNsuHost: string;
  saleId: string;
  matchedBy: 'nsuHost' | 'saleId' | 'last' | 'last_with_receipt' | 'none';
  receiptsDir: string;
  receipts: ReceiptItem[];
}): Promise<{ dir: string; latestReport: string; timestampedReport: string }> {
  const dir = defaultComprovantesDir();
  await fs.mkdir(dir, { recursive: true });

  const now = new Date();
  const at = now.toISOString();
  const stamp = compactTimestamp(now);

  const report = {
    ok: true,
    at,
    requestedSaleId: input.requestedSaleId || null,
    requestedNsuHost: input.requestedNsuHost || null,
    resolvedSaleId: input.saleId,
    matchedBy: input.matchedBy,
    receiptsDir: input.receiptsDir,
    receiptsCount: input.receipts.length,
    receipts: input.receipts.map((r) => ({
      saleId: r.saleId,
      via: r.via,
      filename: r.filename,
      bytes: r.bytes,
      fullPath: path.join(input.receiptsDir, r.filename),
      downloadUrl: r.downloadUrl,
    })),
  };

  const latestReport = path.join(dir, 'ultima-reimpressao.json');
  const timestampedReport = path.join(dir, `reimpressao-${stamp}.json`);
  const payload = JSON.stringify(report, null, 2);
  await atomicWriteFile(latestReport, payload);
  await atomicWriteFile(timestampedReport, payload);
  return { dir, latestReport, timestampedReport };
}

async function markReprintRequested(transactionsFile: string, saleId: string): Promise<void> {
  const file = await readTransactionsFile(transactionsFile);
  if (!file) return;

  const idx = file.transactions.findIndex((t) => String(t.saleId) === saleId);
  if (idx < 0) return;

  const prev = file.transactions[idx];
  const next: StoredTefTransaction = {
    ...prev,
    reprintRequestedAt: nowIso(),
    reprintRequestedCount: Math.max(0, Number(prev.reprintRequestedCount ?? 0)) + 1,
  };
  file.transactions[idx] = next;
  file.updatedAt = nowIso();

  await atomicWriteFile(transactionsFile, JSON.stringify(file, null, 2));
}

type ReceiptLookup = {
  items: ReceiptItem[];
  latestMtimeMs: number;
};

function parseViaFromNestedFilename(name: string): string {
  const noExt = String(name || '').replace(/\.txt$/i, '');
  const numbered = noExt.match(/^\d+-(.+)$/);
  if (numbered?.[1]) return String(numbered[1]).trim();
  return noExt.trim();
}

function decodePayloadToText(payload: string): string {
  const raw = String(payload || '').trim();
  if (!raw) return '';
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    if (decoded && /[\r\n]|[a-zA-Z0-9]/.test(decoded)) return decoded;
  } catch {
    // fallback to raw
  }
  return raw;
}

function parseMetadataVia(metadata: string): string {
  const raw = String(metadata || '').trim();
  if (!raw) return '';
  try {
    const json = JSON.parse(raw) as Record<string, unknown>;
    return String(json?.via || '').trim();
  } catch {
    return '';
  }
}

function inferViaFromText(text: string): string {
  const t = String(text || '').toLowerCase();
  if (t.includes('cliente') || t.includes('customer')) return 'TEF-CUSTOMER';
  if (t.includes('estabelecimento') || t.includes('merchant')) return 'TEF-MERCHANT';
  return 'DB';
}

async function listReceiptItemsFromPrintJobs(saleId: string): Promise<ReceiptItem[]> {
  const base = getTotemApiBaseUrl();
  if (!base) return [];

  const terminalId = String(process.env.PRINT_TERMINAL_ID || 'TOTEM-001').trim() || 'TOTEM-001';
  const url = `${base}/api/print-queue/by-sale-id?saleId=${encodeURIComponent(saleId)}&terminalId=${encodeURIComponent(terminalId)}&limit=20`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json' },
    cache: 'no-store',
  }).catch(() => null);
  if (!resp || !resp.ok) return [];

  const json = await resp.json().catch(() => null);
  const jobs = Array.isArray(json?.jobs) ? (json.jobs as any[]) : [];
  const out: ReceiptItem[] = [];
  const seenVia = new Set<string>();

  for (const job of jobs) {
    const text = decodePayloadToText(String(job?.payload || ''));
    if (!text.trim()) continue;

    const viaRaw = parseMetadataVia(String(job?.metadata || '')) || inferViaFromText(text);
    const via = sanitizeVia(viaRaw);
    if (seenVia.has(via)) continue;
    seenVia.add(via);

    const jobId = String(job?.id || `job-${out.length + 1}`).trim();
    const filename = `db-${jobId}-${via}.txt`;
    out.push({
      saleId,
      via,
      filename,
      bytes: Buffer.byteLength(text, 'utf8'),
      text,
      downloadUrl: '',
    });
  }

  const rank = (via: string) => {
    const v = via.toLowerCase();
    if (v.includes('cliente') || v.includes('customer')) return 1;
    if (v.includes('estabele') || v.includes('merchant')) return 2;
    return 9;
  };

  out.sort((a, b) => rank(a.via) - rank(b.via));
  return out;
}

async function listReceiptItems(receiptsDir: string, saleId: string): Promise<ReceiptLookup> {
  const dirItems: Dirent[] = await fs.readdir(receiptsDir, { withFileTypes: true }).catch((e: any) => {
    if (e?.code === 'ENOENT') return [] as Dirent[];
    throw e;
  });

  const prefix = `${saleId}-`;
  const files = dirItems
    .filter((d) => d.isFile() && d.name.startsWith(prefix) && d.name.toLowerCase().endsWith('.txt'))
    .map((d) => d.name);

  const items: ReceiptItem[] = [];
  const seen = new Set<string>();
  let latestMtimeMs = 0;

  // Format A (legacy): <receiptsDir>/<saleId>-<via>.txt
  for (const name of files) {
    const full = path.join(receiptsDir, name);
    const stat = await fs.stat(full);
    latestMtimeMs = Math.max(latestMtimeMs, stat.mtimeMs);

    const viaRaw = name.slice(prefix.length).replace(/\.txt$/i, '');
    const via = sanitizeVia(viaRaw);

    // Read full text for printing. Receipt sizes are usually small.
    const text = await fs.readFile(full, 'utf8');

    items.push({
      saleId,
      via,
      filename: name,
      bytes: stat.size,
      text,
      downloadUrl: `/api/tef/receipts/download?saleId=${encodeURIComponent(saleId)}&via=${encodeURIComponent(via)}`,
    });
    seen.add(`${via}|${name}`);
  }

  // Format B (current): <receiptsDir>/<saleId>/<000001-TEF-CUSTOMER.txt>
  const saleDir = path.join(receiptsDir, saleId);
  const saleDirEntries: Dirent[] = await fs.readdir(saleDir, { withFileTypes: true }).catch((e: any) => {
    if (e?.code === 'ENOENT') return [] as Dirent[];
    throw e;
  });

  for (const entry of saleDirEntries) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith('.txt')) continue;
    if (entry.name.toLowerCase() === 'sequence.txt' || entry.name.toLowerCase() === '_sequence.txt') continue;

    const full = path.join(saleDir, entry.name);
    const stat = await fs.stat(full);
    latestMtimeMs = Math.max(latestMtimeMs, stat.mtimeMs);

    const viaRaw = parseViaFromNestedFilename(entry.name);
    const via = sanitizeVia(viaRaw);
    const filename = path.join(saleId, entry.name);
    const key = `${via}|${filename}`;
    if (seen.has(key)) continue;

    const text = await fs.readFile(full, 'utf8');
    items.push({
      saleId,
      via,
      filename,
      bytes: stat.size,
      text,
      downloadUrl: `/api/tef/receipts/download?saleId=${encodeURIComponent(saleId)}&via=${encodeURIComponent(via)}`,
    });
    seen.add(key);
  }

  // Prefer deterministic ordering: cliente, estabelecimento, then others.
  const rank = (via: string) => {
    const v = via.toLowerCase();
    if (v.includes('cliente') || v.includes('customer')) return 1;
    if (v.includes('estabele') || v.includes('merchant')) return 2;
    if (v === 'tef') return 3;
    if (v === 'fallback') return 4;
    return 9;
  };

  items.sort((a, b) => rank(a.via) - rank(b.via));
  return { items, latestMtimeMs };
}

async function listReceiptItemsFromAnyDir(receiptsDirs: string[], saleId: string): Promise<{ items: ReceiptItem[]; receiptsDirUsed: string }> {
  let best: { items: ReceiptItem[]; receiptsDirUsed: string; latestMtimeMs: number } = {
    items: [],
    receiptsDirUsed: receiptsDirs[0] || '',
    latestMtimeMs: 0,
  };

  for (const dir of receiptsDirs) {
    const found = await listReceiptItems(dir, saleId);
    if (found.items.length === 0) continue;
    if (found.latestMtimeMs >= best.latestMtimeMs) {
      best = {
        items: found.items,
        receiptsDirUsed: dir,
        latestMtimeMs: found.latestMtimeMs,
      };
    }
  }

  return { items: best.items, receiptsDirUsed: best.receiptsDirUsed };
}

async function findMostRecentSaleIdWithReceipts(receiptsDirs: string[]): Promise<{ saleId: string; receiptsDirUsed: string } | null> {
  let best: { saleId: string; receiptsDirUsed: string; mtimeMs: number } | null = null;

  for (const dir of receiptsDirs) {
    const stack: string[] = [dir];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      const entries: Dirent[] = await fs.readdir(current, { withFileTypes: true }).catch((e: any) => {
        if (e?.code === 'ENOENT') return [] as Dirent[];
        throw e;
      });

      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
          continue;
        }
        if (!entry.isFile()) continue;
        if (!entry.name.toLowerCase().endsWith('.txt')) continue;
        if (entry.name.toLowerCase() === 'sequence.txt' || entry.name.toLowerCase() === '_sequence.txt') continue;

        const rel = path.relative(dir, full);
        const relParts = rel.split(path.sep).filter(Boolean);
        let saleId = '';
        if (relParts.length >= 2) {
          saleId = String(relParts[0] || '').trim();
        } else {
          const m = entry.name.match(/^(.*)-([^-]+)\.txt$/i);
          if (m?.[1]) saleId = String(m[1] || '').trim();
        }
        if (!saleId) continue;

        const stat = await fs.stat(full);
        if (!best || stat.mtimeMs > best.mtimeMs) {
          best = { saleId, receiptsDirUsed: dir, mtimeMs: stat.mtimeMs };
        }
      }
    }
  }

  if (!best) return null;
  return { saleId: best.saleId, receiptsDirUsed: best.receiptsDirUsed };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as any;

    const inputSaleId = String(body?.saleId || '').trim();
    const inputNsuHost = String(body?.nsuHost || '').trim();
    const strictSaleId = Boolean(body?.strictSaleId);
    await appendReprintDebugLog({
      stage: 'request',
      strictSaleId,
      saleId: inputSaleId || null,
      nsuHost: inputNsuHost || null,
    });

    if (strictSaleId && !inputSaleId) {
      return NextResponse.json(
        { ok: false, error: 'saleId_required_for_strict_reprint' },
        { status: 400 }
      );
    }

    const dataDir = defaultDataDir();
    const dataDirs = candidateDataDirs();
    const transactionsFile = path.join(dataDir, 'transactions.json');
    const receiptsDirs = uniqueStrings(dataDirs.map((d) => path.join(d, 'receipts')));

    const store = await readTransactionsFile(transactionsFile);

    let saleIdToUse = inputSaleId;
    let matchedBy: 'nsuHost' | 'saleId' | 'last' | 'last_with_receipt' | 'none' = 'none';

    if (inputNsuHost && store?.transactions?.length) {
      const hit = store.transactions.find((t) => String(t.nsuHost || '') === inputNsuHost);
      if (hit?.saleId) {
        saleIdToUse = String(hit.saleId);
        matchedBy = 'nsuHost';
      }
    }

    if (!strictSaleId && !saleIdToUse && store?.transactions?.length) {
      saleIdToUse = String(store.transactions[0].saleId || '');
      if (saleIdToUse) matchedBy = 'last';
    }

    if (saleIdToUse && matchedBy === 'none') matchedBy = 'saleId';

    if (!strictSaleId && !saleIdToUse) {
      const mostRecent = await findMostRecentSaleIdWithReceipts(receiptsDirs);
      if (mostRecent?.saleId) {
        saleIdToUse = mostRecent.saleId;
        matchedBy = 'last_with_receipt';
      }
    }

    if (!saleIdToUse) {
      return NextResponse.json(
        { ok: false, error: 'no_saleId_available', matchedBy },
        { status: 404 }
      );
    }

    let { items, receiptsDirUsed } = await listReceiptItemsFromAnyDir(receiptsDirs, saleIdToUse);
    if (items.length === 0) {
      const dbItems = await listReceiptItemsFromPrintJobs(saleIdToUse);
      if (dbItems.length > 0) {
        items = dbItems;
        receiptsDirUsed = 'db:print_jobs';
      }
    }

    // If requested/derived saleId has no receipt files, fallback to the latest
    // transaction that does have saved receipts. This keeps F2 usable for operators.
    if (!strictSaleId && items.length === 0 && store?.transactions?.length) {
      for (const tx of store.transactions) {
        const candidateSaleId = String(tx?.saleId || '').trim();
        if (!candidateSaleId || candidateSaleId === saleIdToUse) continue;

        const found = await listReceiptItemsFromAnyDir(receiptsDirs, candidateSaleId);
        let candidateItems = found.items;
        let candidateDir = found.receiptsDirUsed;
        if (candidateItems.length === 0) {
          candidateItems = await listReceiptItemsFromPrintJobs(candidateSaleId);
          if (candidateItems.length > 0) candidateDir = 'db:print_jobs';
        }
        if (candidateItems.length === 0) continue;

        saleIdToUse = candidateSaleId;
        items = candidateItems;
        receiptsDirUsed = candidateDir;
        matchedBy = 'last_with_receipt';
        break;
      }
    }

    if (!strictSaleId && items.length === 0) {
      const mostRecent = await findMostRecentSaleIdWithReceipts(receiptsDirs);
      if (mostRecent?.saleId && mostRecent.saleId !== saleIdToUse) {
        const found = await listReceiptItemsFromAnyDir(receiptsDirs, mostRecent.saleId);
        let candidateItems = found.items;
        let candidateDir = found.receiptsDirUsed;
        if (candidateItems.length === 0) {
          candidateItems = await listReceiptItemsFromPrintJobs(mostRecent.saleId);
          if (candidateItems.length > 0) candidateDir = 'db:print_jobs';
        }
        if (candidateItems.length > 0) {
          saleIdToUse = mostRecent.saleId;
          items = candidateItems;
          receiptsDirUsed = candidateDir;
          matchedBy = 'last_with_receipt';
        }
      }
    }

    if (strictSaleId && items.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'no_receipts_for_sale',
          saleId: saleIdToUse,
          matchedBy,
        },
        { status: 404 }
      );
    }

    // Evidence: mark the reprint attempt on local transaction store.
    await markReprintRequested(transactionsFile, saleIdToUse);
    const effectiveReceiptsDir = receiptsDirUsed || receiptsDirs[0] || path.join(dataDir, 'receipts');
    const report = await writeComprovantesReport({
      requestedSaleId: inputSaleId,
      requestedNsuHost: inputNsuHost,
      saleId: saleIdToUse,
      matchedBy,
      receiptsDir: effectiveReceiptsDir,
      receipts: items,
    });
    await appendReprintDebugLog({
      stage: 'success',
      strictSaleId,
      requestedSaleId: inputSaleId || null,
      requestedNsuHost: inputNsuHost || null,
      resolvedSaleId: saleIdToUse,
      matchedBy,
      receiptsDir: effectiveReceiptsDir,
      receiptsCount: items.length,
    });

    return NextResponse.json({
      ok: true,
      at: nowIso(),
      matchedBy,
      requestedSaleId: inputSaleId || null,
      requestedNsuHost: inputNsuHost || null,
      saleId: saleIdToUse,
      receiptsDir: effectiveReceiptsDir,
      receipts: items,
      comprovantesDir: report.dir,
      reportFile: report.latestReport,
      reportArchiveFile: report.timestampedReport,
    });
  } catch (e: any) {
    await appendReprintDebugLog({
      stage: 'error',
      error: String(e?.message || 'reprint_resolve_failed'),
    });
    return NextResponse.json(
      { ok: false, error: e?.message || 'reprint_resolve_failed' },
      { status: 500 }
    );
  }
}
