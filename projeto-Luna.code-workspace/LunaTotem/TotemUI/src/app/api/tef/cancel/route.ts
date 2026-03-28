import { NextResponse } from 'next/server';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createTefClient } from '@/tef/tefClient';

type StoredTefTransaction = {
  saleId: string;
  amountCents: number;
  type: 'DEBIT' | 'CREDIT' | 'PIX' | string;
  status: 'STARTED' | 'ERROR' | 'APPROVED' | 'DENIED' | 'CANCELED' | 'PENDING' | string;

  nsuHost?: string;
  nsuSitef?: string;

  createdAt?: string;
  updatedAt?: string;

  lastMessage?: string;
  resultCode?: string;
  raw?: unknown;

  // Optional audit fields (backward compatible)
  cancelRequestedAt?: string;
  cancelRequestedCount?: number;
  canceledAt?: string;
  cancelError?: string;
};

type StoreFileV1 = {
  version: 1;
  updatedAt: string;
  transactions: StoredTefTransaction[];
};

type EvidenceFile = {
  filename: string;
  bytes: number;
  downloadUrl: string;
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

function findByNsuHost(file: StoreFileV1 | null, nsuHost: string): StoredTefTransaction | null {
  const wanted = String(nsuHost || '').trim();
  if (!wanted || !file?.transactions?.length) return null;
  return file.transactions.find((t) => String(t.nsuHost || '') === wanted) ?? null;
}

function findBySaleId(file: StoreFileV1 | null, saleId: string): StoredTefTransaction | null {
  const wanted = String(saleId || '').trim();
  if (!wanted || !file?.transactions?.length) return null;
  return file.transactions.find((t) => String(t.saleId || '') === wanted) ?? null;
}

function upsertTx(file: StoreFileV1, tx: StoredTefTransaction): void {
  const idx = file.transactions.findIndex((t) => String(t.saleId) === String(tx.saleId));
  if (idx >= 0) file.transactions[idx] = tx;
  else file.transactions.push(tx);

  // newest first
  file.transactions.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

async function markCancel(
  transactionsFile: string,
  input: {
    saleId: string;
    status: 'CANCELED' | 'ERROR';
    nsuHost?: string;
    nsuSitef?: string;
    lastMessage?: string;
    resultCode?: string;
    raw?: unknown;
    errorMessage?: string;
  }
): Promise<StoredTefTransaction | null> {
  const file = (await readTransactionsFile(transactionsFile)) ?? {
    version: 1 as const,
    updatedAt: nowIso(),
    transactions: [] as StoredTefTransaction[],
  };

  const prev = findBySaleId(file, input.saleId);
  const now = nowIso();

  const next: StoredTefTransaction = {
    saleId: input.saleId,
    amountCents: prev?.amountCents ?? 0,
    type: prev?.type ?? 'CREDIT',
    status: input.status,

    nsuHost: input.nsuHost ?? prev?.nsuHost,
    nsuSitef: input.nsuSitef ?? prev?.nsuSitef,

    createdAt: prev?.createdAt ?? now,
    updatedAt: now,

    lastMessage: input.lastMessage ?? prev?.lastMessage,
    resultCode: input.resultCode ?? prev?.resultCode,

    raw: input.raw ?? prev?.raw,

    cancelRequestedAt: now,
    cancelRequestedCount: Math.max(0, Number(prev?.cancelRequestedCount ?? 0)) + 1,
    canceledAt: input.status === 'CANCELED' ? now : prev?.canceledAt,
    cancelError: input.status === 'ERROR' ? (input.errorMessage || input.lastMessage || prev?.cancelError) : undefined,
  };

  upsertTx(file, next);
  file.updatedAt = now;

  await atomicWriteFile(transactionsFile, JSON.stringify(file, null, 2));
  return next;
}

async function sendSupervisorPassword(baseUrl: string, saleId: string, password: string): Promise<void> {
  const sid = String(saleId || '').trim();
  if (!sid) return;

  const pw = String(password || '');
  if (!pw) return;

  const url = `${baseUrl.replace(/\/+$/, '')}/tef/supervisor/${encodeURIComponent(sid)}`;

  // Do not log/return the password.
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: pw }),
  });

  // Password delivery is best-effort.
  // If this fails, the cancel request may still work depending on the bridge/flow.
  if (!res.ok) {
    // Avoid reading body (could contain sensitive echoes if misconfigured).
    throw new Error(`Falha ao enviar senha do supervisor (HTTP ${res.status})`);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as any;

    const inputSaleId = String(body?.saleId || '').trim();
    const inputNsuHost = String(body?.nsuHost || '').trim();
    const supervisorPassword = String(body?.supervisorPassword || '');
    const confirmLastApproved = Boolean(body?.confirmLastApproved);

    if (!supervisorPassword) {
      return NextResponse.json({ ok: false, error: 'supervisor_password_required' }, { status: 400 });
    }

    const dataDir = defaultDataDir();
    const transactionsFile = path.join(dataDir, 'transactions.json');
    const receiptsDir = path.join(dataDir, 'receipts');

    const store = await readTransactionsFile(transactionsFile);

    let saleIdToCancel = inputSaleId;
    let matchedBy: 'nsuHost' | 'saleId' | 'none' = 'none';

    if (inputNsuHost) {
      const hit = findByNsuHost(store, inputNsuHost);
      if (!hit?.saleId) {
        return NextResponse.json(
          { ok: false, error: 'nsuHost_not_found', nsuHost: inputNsuHost },
          { status: 404 }
        );
      }
      saleIdToCancel = String(hit.saleId);
      matchedBy = 'nsuHost';
    }

    if (!saleIdToCancel) {
      return NextResponse.json(
        { ok: false, error: 'saleId_required', matchedBy },
        { status: 400 }
      );
    }

    if (matchedBy === 'none') matchedBy = 'saleId';

    // If no NSU, require explicit confirmation to cancel the last APPROVED transaction of this saleId.
    if (!inputNsuHost) {
      const tx = findBySaleId(store, saleIdToCancel);
      if (!tx || String(tx.status) !== 'APPROVED') {
        return NextResponse.json(
          {
            ok: false,
            error: 'no_approved_transaction_for_saleId',
            saleId: saleIdToCancel,
            status: tx?.status ?? null,
          },
          { status: 409 }
        );
      }

      if (!confirmLastApproved) {
        return NextResponse.json(
          {
            ok: false,
            error: 'confirm_required_without_nsuHost',
            saleId: saleIdToCancel,
            message: 'NSU Host não informado. Confirme o cancelamento da última transação aprovada deste saleId.',
          },
          { status: 409 }
        );
      }
    }

    const client = createTefClient();

    // Requirement: require supervisor password (masked in UI). We deliver it server-side.
    // Best-effort; if it fails, we still try to cancel.
    try {
      await sendSupervisorPassword(client.baseUrl, saleIdToCancel, supervisorPassword);
    } catch {
      // ignore best-effort failures
    }

    const cancelResult = await client.cancel(saleIdToCancel);

    const ok = Boolean(cancelResult.ok);

    // Save evidence JSON in receipts/ as cancel-<saleId>.json
    await fs.mkdir(receiptsDir, { recursive: true });

    const evidenceFilename = path.join(receiptsDir, `cancel-${saleIdToCancel}.json`);

    const evidencePayload = {
      ok,
      action: 'cancel',
      at: nowIso(),
      matchedBy,
      input: {
        saleId: inputSaleId || undefined,
        nsuHost: inputNsuHost || undefined,
        // supervisorPassword: intentionally omitted
      },
      saleId: saleIdToCancel,
      bridge: {
        ok: cancelResult.ok,
        action: cancelResult.action,
        saleId: cancelResult.saleId,
        at: cancelResult.at,
        result: cancelResult.ok ? cancelResult.result : undefined,
        error: !cancelResult.ok
          ? {
              message: cancelResult.error?.message,
              // Avoid huge dumps, but keep some diagnostics.
              details: cancelResult.error?.details,
            }
          : undefined,
      },
    };

    await atomicWriteFile(evidenceFilename, JSON.stringify(evidencePayload, null, 2));
    const evidenceStat = await fs.stat(evidenceFilename);

    const evidence: EvidenceFile = {
      filename: path.basename(evidenceFilename),
      bytes: evidenceStat.size,
      downloadUrl: `/api/tef/cancel/evidence?saleId=${encodeURIComponent(saleIdToCancel)}`,
    };

    const nsuHostFromBridge = (cancelResult as any)?.result?.nsuHost;
    const nsuSitefFromBridge = (cancelResult as any)?.result?.nsuSitef;

    const updated = await markCancel(transactionsFile, {
      saleId: saleIdToCancel,
      status: ok ? 'CANCELED' : 'ERROR',
      nsuHost:
        (typeof nsuHostFromBridge === 'string' ? nsuHostFromBridge : undefined) ??
        (inputNsuHost || undefined),
      nsuSitef: typeof nsuSitefFromBridge === 'string' ? nsuSitefFromBridge : undefined,
      lastMessage: ok ? 'Cancelamento solicitado (cmd 23)' : cancelResult.error?.message,
      raw: cancelResult.ok ? cancelResult.result : cancelResult.error,
      errorMessage: cancelResult.error?.message,
    });

    return NextResponse.json({
      ok,
      at: nowIso(),
      matchedBy,
      saleId: saleIdToCancel,
      supervisorAuth: true,
      transaction: updated,
      evidence,
      bridge: cancelResult,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'cancel_failed' },
      { status: 500 }
    );
  }
}
