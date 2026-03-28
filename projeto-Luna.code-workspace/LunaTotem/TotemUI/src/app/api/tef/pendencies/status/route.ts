import { NextResponse } from 'next/server';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createTefClient } from '@/tef/tefClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type StoreFileV1 = {
  version: 1;
  updatedAt: string;
  transactions: any[];
  // Extended metadata (backward compatible)
  pendencies?: any;
};

type PendingStatusResponse = {
  running: boolean;
  lastRunAt?: string | null;
  lastResult?: any;
  lastError?: string | null;
  saleId?: string | null;
};

type PendingCountResponse = {
  ok?: boolean;
  pendingCount?: number;
  note?: string;
  error?: string;
};

type PendencyItem = {
  id: string;
  title: string;
  status: 'ok' | 'warn' | 'error' | 'running';
  details?: string;
  suggestedAction?: string;
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

function buildItems(input: {
  pendingCount: number;
  status: PendingStatusResponse;
}): PendencyItem[] {
  const items: PendencyItem[] = [];

  const pc = Math.max(0, Number(input.pendingCount || 0));
  if (pc === 0) {
    items.push({
      id: 'count',
      title: 'Pendências detectadas',
      status: 'ok',
      details: 'Nenhuma transação pendente reportada pelo siTEF.',
    });
  } else {
    items.push({
      id: 'count',
      title: 'Pendências detectadas',
      status: 'warn',
      details: `${pc} pendência(s) pendente(s) no siTEF.`,
      suggestedAction: 'Clique em “Tratar pendências (130)”.',
    });
  }

  if (input.status?.running) {
    items.push({
      id: 'running',
      title: 'Tratamento (130) em execução',
      status: 'running',
      details: `saleId=${input.status.saleId ?? '—'}`,
      suggestedAction: 'Aguarde finalizar e atualize “Pendências”.',
    });
  } else {
    items.push({
      id: 'running',
      title: 'Tratamento (130) em execução',
      status: 'ok',
      details: 'Não está em execução.',
    });
  }

  if (input.status?.lastError) {
    items.push({
      id: 'lastError',
      title: 'Última execução (130)',
      status: 'error',
      details: String(input.status.lastError),
      suggestedAction: 'Verifique configuração do bridge (CNPJ/TERMINAL/ParmsClient).',
    });
  } else if (input.status?.lastRunAt) {
    items.push({
      id: 'lastRunAt',
      title: 'Última execução (130)',
      status: 'ok',
      details: `Executado em ${input.status.lastRunAt}`,
    });
  } else {
    items.push({
      id: 'lastRunAt',
      title: 'Última execução (130)',
      status: 'warn',
      details: 'Ainda não há histórico de execução.',
      suggestedAction: pc > 0 ? 'Execute “Tratar pendências (130)”.' : undefined,
    });
  }

  return items;
}

async function fetchJson(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; json?: any; text: string }> {
  const resp = await fetch(url, {
    ...init,
    cache: 'no-store',
  });
  const text = await resp.text();
  let json: any = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { ok: resp.ok, status: resp.status, json, text };
}

export async function GET() {
  try {
    const client = createTefClient();
    const base = client.baseUrl.replace(/\/+$/, '');

    const [countResp, statusResp] = await Promise.all([
      fetchJson(`${base}/tef/pending/count`, { method: 'GET' }),
      fetchJson(`${base}/tef/pending/status`, { method: 'GET' }),
    ]);

    const status: PendingStatusResponse = (statusResp.json ?? {}) as PendingStatusResponse;

    // pending/count can fail in older builds; treat as 0 with diagnostics.
    const countPayload: PendingCountResponse = (countResp.json ?? {}) as PendingCountResponse;
    const pendingCount = Math.max(0, Number(countPayload?.pendingCount ?? 0));

    const items = buildItems({ pendingCount, status });

    // Persist metadata in TransactionStore file (backward compatible): top-level pendencies.
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
      pendingCount,
      bridge: {
        count: countResp.json ?? { ok: false, status: countResp.status, text: countResp.text },
        status: statusResp.json ?? { ok: false, status: statusResp.status, text: statusResp.text },
      },
      items,
      resolved: pendingCount === 0,
    };

    store.pendencies = {
      lastCheckedAt: snapshot.at,
      pendingCount,
      running: Boolean(status?.running),
      lastRunAt: status?.lastRunAt ?? null,
      lastError: status?.lastError ?? null,
      resolvedAt: pendingCount === 0 ? snapshot.at : store.pendencies?.resolvedAt ?? null,
      lastSnapshot: snapshot,
    };
    store.updatedAt = snapshot.at;

    // Evidence: overwrite a single file for easy download.
    await fs.mkdir(receiptsDir, { recursive: true });
    const evidenceFile = path.join(receiptsDir, 'pendencies-evidence.json');
    await atomicWriteFile(evidenceFile, JSON.stringify({ type: 'status', ...snapshot }, null, 2));
    const stat = await fs.stat(evidenceFile);

    await atomicWriteFile(transactionsFile, JSON.stringify(store, null, 2));

    return NextResponse.json({
      ok: true,
      at: snapshot.at,
      pendingCount,
      running: Boolean(status?.running),
      status,
      items,
      evidence: {
        filename: path.basename(evidenceFile),
        bytes: stat.size,
        downloadUrl: '/api/tef/pendencies/evidence',
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'pendencies_status_failed' },
      { status: 500 }
    );
  }
}
