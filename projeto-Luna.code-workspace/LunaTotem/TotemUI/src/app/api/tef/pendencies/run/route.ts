import { NextResponse } from 'next/server';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createTefClient } from '@/tef/tefClient';

type StoreFileV1 = {
  version: 1;
  updatedAt: string;
  transactions: any[];
  pendencies?: any;
};

type PendingStatusResponse = {
  running: boolean;
  lastRunAt?: string | null;
  lastResult?: any;
  lastError?: string | null;
  saleId?: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

function defaultDataDir(): string {
  if (process.env.LOCALAPPDATA) return path.join(process.env.LOCALAPPDATA, 'LunaKiosk');
  const home = os.homedir();
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'LunaKiosk');
  return path.join(home, '.local', 'share', 'LunaKiosk');
}

async function readJsonFile<T>(filename: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filename, 'utf8');
    return JSON.parse(raw) as T;
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

export async function POST() {
  try {
    const client = createTefClient();

    // This calls /tef/pending/run (command 130) and returns a snapshot.
    const started = await client.pendencias();

    const ok = Boolean(started.ok);

    // Persist metadata + evidence.
    const dataDir = defaultDataDir();
    const transactionsFile = path.join(dataDir, 'transactions.json');
    const receiptsDir = path.join(dataDir, 'receipts');

    const store = (await readJsonFile<StoreFileV1>(transactionsFile)) ?? {
      version: 1 as const,
      updatedAt: nowIso(),
      transactions: [] as any[],
    };

    const snapshot = {
      at: nowIso(),
      ok,
      bridge: started,
      note: 'pendencias(130) started (or already running)',
    };

    store.pendencies = {
      ...(store.pendencies ?? {}),
      lastRunRequestedAt: snapshot.at,
      lastRunRequestOk: ok,
      lastRunRequest: snapshot,
    };

    store.updatedAt = snapshot.at;

    await fs.mkdir(receiptsDir, { recursive: true });
    const evidenceFile = path.join(receiptsDir, 'pendencies-evidence.json');
    await atomicWriteFile(evidenceFile, JSON.stringify({ type: 'run', ...snapshot }, null, 2));
    const stat = await fs.stat(evidenceFile);

    await atomicWriteFile(transactionsFile, JSON.stringify(store, null, 2));

    // Return the "status" snapshot if available for UI polling.
    const resultStatus: PendingStatusResponse | undefined = (started.ok ? (started.result as any) : undefined) as any;

    return NextResponse.json({
      ok,
      at: snapshot.at,
      started,
      status: resultStatus,
      evidence: {
        filename: path.basename(evidenceFile),
        bytes: stat.size,
        downloadUrl: '/api/tef/pendencies/evidence',
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'pendencies_run_failed' },
      { status: 500 }
    );
  }
}
