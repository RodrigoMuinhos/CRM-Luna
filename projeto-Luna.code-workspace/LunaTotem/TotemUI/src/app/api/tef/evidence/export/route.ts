import { NextResponse } from 'next/server';

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import archiver from 'archiver';

import { createTefClient } from '@/tef/tefClient';

type StoredTefTransaction = {
  saleId: string;
  amountCents: number;
  type: string;
  status: string;

  nsuHost?: string;
  nsuSitef?: string;

  createdAt?: string;
  updatedAt?: string;

  lastMessage?: string;
  resultCode?: string;

  // audit fields (optional)
  reprintRequestedAt?: string;
  reprintRequestedCount?: number;
  cancelRequestedAt?: string;
  cancelRequestedCount?: number;
  canceledAt?: string;
  cancelError?: string;
};

type StoreFileV1 = {
  version: 1;
  updatedAt: string;
  transactions: StoredTefTransaction[];
  // backward compatible: may include extra keys (pendencies, etc.)
  [k: string]: any;
};

type ManifestEntry = {
  zipPath: string;
  sourcePath?: string;
  bytes?: number;
  mtime?: string;
  note?: string;
};

type MissingEntry = {
  kind: string;
  path: string;
  reason: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function formatTsForFilename(d = new Date()): string {
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const HH = String(d.getHours()).padStart(2, '0');
  const MM = String(d.getMinutes()).padStart(2, '0');
  const SS = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${HH}${MM}${SS}`;
}

function defaultDataDir(): string {
  // Mirrors kiosk-core TransactionStore default.
  if (process.env.LOCALAPPDATA) return path.join(process.env.LOCALAPPDATA, 'LunaKiosk');

  const home = os.homedir();
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'LunaKiosk');
  return path.join(home, '.local', 'share', 'LunaKiosk');
}

function safeFilenamePart(input: string, fallback: string): string {
  const s = String(input || '').trim();
  if (!s) return fallback;
  const cleaned = s.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 64);
  return cleaned || fallback;
}

async function safeReadJsonFile<T>(filename: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filename, 'utf8');
    return JSON.parse(raw) as T;
  } catch (e: any) {
    if (e?.code === 'ENOENT') return null;
    throw e;
  }
}

async function safeStat(p: string): Promise<{ ok: true; bytes: number; mtime: string } | { ok: false; reason: string }> {
  try {
    const st = await fs.stat(p);
    return { ok: true, bytes: st.size, mtime: st.mtime.toISOString() };
  } catch (e: any) {
    return { ok: false, reason: String(e?.code || e?.message || e) };
  }
}

async function isDir(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function walkFiles(root: string, opts?: { maxFiles?: number }): Promise<string[]> {
  const out: string[] = [];
  const maxFiles = Math.max(0, Number(opts?.maxFiles ?? 50_000));

  if (!(await isDir(root))) return out;

  const stack: string[] = [root];
  while (stack.length) {
    const cur = stack.pop()!;
    let items: fsSync.Dirent[] = [];
    try {
      items = await fs.readdir(cur, { withFileTypes: true });
    } catch {
      // If permission denied, just stop walking this branch.
      continue;
    }

    for (const it of items) {
      const p = path.join(cur, it.name);
      if (it.isDirectory()) stack.push(p);
      else if (it.isFile()) out.push(p);

      if (out.length >= maxFiles) return out;
    }
  }

  return out;
}

function getEnvSnapshot(): Record<string, string | null> {
  const keys = [
    'TEF_BRIDGE_URL',
    'SITEF_BRIDGE_URL',
    'SITEF_BRIDGE_HOST',
    'SITEF_BRIDGE_PORT',
    'SITEF_NATIVE_DIR',
    'TEF_NATIVE_DIR',
    'SITEF_PINPAD_COM',
    'SITEF_PINPAD_PORT',
    'SITEF_FORCE_PINPAD_PORT',
    'KIOSK_DATA_DIR',
    'LOCALAPPDATA',
    'APPDATA',
  ];

  const out: Record<string, string | null> = {};
  for (const k of keys) {
    const v = (process.env as any)[k];
    out[k] = typeof v === 'string' && v.trim() ? v.trim() : null;
  }
  return out;
}

function guessNativeDirFromEnv(): string | null {
  const env = process.env;
  const v = String(env.SITEF_NATIVE_DIR || env.TEF_NATIVE_DIR || '').trim();
  return v || null;
}

function candidateLogDirs(dataDir: string): string[] {
  const dirs: string[] = [];

  // local data folder used by TransactionStore
  dirs.push(path.join(dataDir, 'logs'));

  // common Electron pattern: %APPDATA%\logs (kiosk-electron uses dirname(userData)\logs)
  if (process.env.APPDATA) {
    dirs.push(path.join(process.env.APPDATA, 'logs'));
    dirs.push(path.join(process.env.APPDATA, 'LunaKiosk', 'logs'));
  }

  // workspace / dev fallback
  dirs.push(path.join(process.cwd(), 'logs'));

  // de-dupe
  return Array.from(new Set(dirs.map((d) => path.resolve(d))));
}

function candidateBridgeLogFiles(logDirs: string[]): string[] {
  const names = [
    'sitef-bridge.stdout.log',
    'sitef-bridge.stderr.log',
    'sitef-bridge.log',
    'sitef-bridge.err.log',
  ];

  const out: string[] = [];
  for (const d of logDirs) {
    for (const n of names) out.push(path.join(d, n));
  }
  return out;
}

async function addFileToArchive(params: {
  archive: archiver.Archiver;
  manifest: ManifestEntry[];
  missing: MissingEntry[];
  sourcePath: string;
  zipPath: string;
  kind: string;
}): Promise<void> {
  const st = await safeStat(params.sourcePath);
  if (!st.ok) {
    params.missing.push({ kind: params.kind, path: params.sourcePath, reason: st.reason });
    return;
  }

  params.archive.file(params.sourcePath, { name: params.zipPath });
  params.manifest.push({
    zipPath: params.zipPath,
    sourcePath: params.sourcePath,
    bytes: st.bytes,
    mtime: st.mtime,
  });
}

async function addDirToArchive(params: {
  archive: archiver.Archiver;
  manifest: ManifestEntry[];
  missing: MissingEntry[];
  dirPath: string;
  zipRoot: string;
  kind: string;
  maxFiles?: number;
}): Promise<void> {
  const dirOk = await isDir(params.dirPath);
  if (!dirOk) {
    params.missing.push({ kind: params.kind, path: params.dirPath, reason: 'dir_not_found' });
    return;
  }

  const files = await walkFiles(params.dirPath, { maxFiles: params.maxFiles });
  for (const f of files) {
    const rel = path.relative(params.dirPath, f).split(path.sep).join('/');
    const zipPath = path.posix.join(params.zipRoot, rel);
    await addFileToArchive({
      archive: params.archive,
      manifest: params.manifest,
      missing: params.missing,
      sourcePath: f,
      zipPath,
      kind: params.kind,
    });
  }
}

function toChecklistLine(p: string, note?: string): string {
  return `${p}${note ? `  # ${note}` : ''}`;
}

export async function POST(req: Request) {
  const at = nowIso();
  try {
    const body = (await req.json().catch(() => null)) as any;

    const dataDir = defaultDataDir();
    const exportsDir = path.join(dataDir, 'exports');
    const receiptsDir = path.join(dataDir, 'receipts');
    const transactionsFile = path.join(dataDir, 'transactions.json');

    const store = (await safeReadJsonFile<StoreFileV1>(transactionsFile)) ?? null;

    const inputSaleId = String(body?.saleId || '').trim();
    const storeSaleId = String(store?.transactions?.[0]?.saleId || '').trim();
    const saleIdToUse = inputSaleId || storeSaleId;

    if (!saleIdToUse) {
      return NextResponse.json(
        { ok: false, error: 'saleId_required_or_local_transactions_empty', at },
        { status: 400 }
      );
    }

    const saleIdPart = safeFilenamePart(saleIdToUse, 'SEM-SALEID');
    const ts = formatTsForFilename(new Date());
    const zipName = `evidencias-tef-${saleIdPart}-${ts}.zip`;
    const zipPath = path.join(exportsDir, zipName);

    await fs.mkdir(exportsDir, { recursive: true });

    const tefClient = createTefClient();
    const health = await tefClient.health();

    const envSnapshot = getEnvSnapshot();
    const nativeDir = guessNativeDirFromEnv();

    // Build a concise "last actions" summary from local store.
    const lastTx = store?.transactions?.[0] ?? null;
    const recent = Array.isArray(store?.transactions) ? store!.transactions.slice(0, 10) : [];
    const recentActions = recent
      .map((t) => ({
        saleId: t.saleId,
        status: t.status,
        updatedAt: t.updatedAt ?? null,
        nsuHost: t.nsuHost ?? null,
        reprintRequestedAt: (t as any).reprintRequestedAt ?? null,
        reprintRequestedCount: (t as any).reprintRequestedCount ?? null,
        cancelRequestedAt: (t as any).cancelRequestedAt ?? null,
        cancelRequestedCount: (t as any).cancelRequestedCount ?? null,
        canceledAt: (t as any).canceledAt ?? null,
        cancelError: (t as any).cancelError ?? null,
      }))
      .filter((t) => t.reprintRequestedAt || t.cancelRequestedAt || t.canceledAt);

    const diagnostic = {
      ok: true,
      generatedAt: at,
      saleId: saleIdToUse,
      system: {
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        hostname: os.hostname(),
        release: os.release(),
      },
      paths: {
        dataDir,
        receiptsDir,
        transactionsFile,
        exportsDir,
        nativeDir,
      },
      tefBridge: {
        baseUrl: tefClient.baseUrl,
        health,
      },
      localStore: {
        exists: Boolean(store),
        updatedAt: store?.updatedAt ?? null,
        lastTransaction: lastTx,
        pendencies: (store as any)?.pendencies ?? null,
        recentActions,
      },
      env: envSnapshot,
    };

    const manifest: ManifestEntry[] = [];
    const missing: MissingEntry[] = [];

    const out = fsSync.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    const done = new Promise<void>((resolve, reject) => {
      out.on('close', () => resolve());
      out.on('error', (err) => reject(err));
      archive.on('warning', (err) => reject(err));
      archive.on('error', (err) => reject(err));
    });

    archive.pipe(out);

    // 1) diagnostics JSON
    archive.append(JSON.stringify(diagnostic, null, 2), { name: 'diagnostico.json' });
    manifest.push({ zipPath: 'diagnostico.json', note: 'generated' });

    // 2) sitef-bridge logs (if any)
    const logDirs = candidateLogDirs(dataDir);
    const logCandidates = candidateBridgeLogFiles(logDirs);
    for (const f of logCandidates) {
      const base = path.basename(f);
      await addFileToArchive({
        archive,
        manifest,
        missing,
        sourcePath: f,
        zipPath: path.posix.join('logs', base),
        kind: 'sitef-bridge-log',
      });
    }

    // 3) receipts/
    await addDirToArchive({
      archive,
      manifest,
      missing,
      dirPath: receiptsDir,
      zipRoot: 'receipts',
      kind: 'receipts',
    });

    // 4) siTEF files: LOG/, audit/, *.dmp (best-effort)
    const sitChecklist: string[] = [];
    if (!nativeDir) {
      sitChecklist.push(toChecklistLine('SITEF_NATIVE_DIR', 'não configurado; informe o path da pasta do CliSiTef'));
    } else {
      sitChecklist.push(toChecklistLine(nativeDir, 'nativeDir'));

      const candidates = [
        path.join(nativeDir, 'LOG'),
        path.join(nativeDir, 'audit'),
        path.join(path.dirname(nativeDir), 'LOG'),
        path.join(path.dirname(nativeDir), 'audit'),
      ];

      for (const d of candidates) {
        if (await isDir(d)) {
          await addDirToArchive({
            archive,
            manifest,
            missing,
            dirPath: d,
            zipRoot: path.posix.join('sitef', path.basename(d)),
            kind: 'sitef-dir',
            maxFiles: 25_000,
          });
        } else {
          sitChecklist.push(toChecklistLine(d, 'não encontrado (ou sem permissão)'));
        }
      }

      // DMPs
      try {
        const files = await walkFiles(nativeDir, { maxFiles: 50_000 });
        const dmps = files.filter((p) => p.toLowerCase().endsWith('.dmp'));
        if (dmps.length === 0) {
          sitChecklist.push(toChecklistLine(path.join(nativeDir, '*.dmp'), 'nenhum .dmp encontrado'));
        }
        for (const f of dmps) {
          await addFileToArchive({
            archive,
            manifest,
            missing,
            sourcePath: f,
            zipPath: path.posix.join('sitef', 'dmp', path.basename(f)),
            kind: 'sitef-dmp',
          });
        }
      } catch (e: any) {
        sitChecklist.push(toChecklistLine(path.join(nativeDir, '*.dmp'), `falha ao varrer: ${String(e?.message || e)}`));
      }
    }

    archive.append(sitChecklist.join('\n') + '\n', { name: 'sitef-checklist.txt' });
    manifest.push({ zipPath: 'sitef-checklist.txt', note: 'generated' });

    // ZIP manifest
    const zipManifest = {
      generatedAt: at,
      saleId: saleIdToUse,
      zipName,
      zipPath,
      included: manifest,
      missing,
    };
    archive.append(JSON.stringify(zipManifest, null, 2), { name: 'manifest.json' });

    await archive.finalize();
    await done;

    const zipStat = await fs.stat(zipPath);

    const downloadUrl = `/api/tef/exports/download?name=${encodeURIComponent(zipName)}`;
    const showInFolderUrl = `/api/tef/exports/show?name=${encodeURIComponent(zipName)}`;

    return NextResponse.json({
      ok: true,
      at,
      saleId: saleIdToUse,
      zipName,
      zipPath,
      bytes: zipStat.size,
      downloadUrl,
      showInFolderUrl,
      exportsDir,
      missingCount: missing.length,
    });
  } catch (e: any) {
    const msg = String(e?.message || e);
    return NextResponse.json(
      { ok: false, error: msg, at },
      { status: 500 }
    );
  }
}
