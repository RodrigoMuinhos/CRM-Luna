import { NextResponse } from 'next/server';

import {
  getConfiguredStoreCode,
  restartService,
  setConfiguredStoreCode,
  validateServiceControlPassword,
} from '../_lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeStoreCode(raw: unknown): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

export async function GET() {
  try {
    const storeCode = await getConfiguredStoreCode();
    return NextResponse.json(
      {
        ok: true,
        storeCode,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        storeCode: '',
        error: String(e?.message || 'store_code_get_failed'),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as any;
    const password = String(body?.password || '');
    const pw = validateServiceControlPassword(password);
    if (!pw.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: pw.error || 'password_required',
        },
        { status: pw.error === 'invalid_password' ? 403 : 400 }
      );
    }

    const storeCode = normalizeStoreCode(body?.storeCode);
    if (storeCode.length !== 8) {
      return NextResponse.json(
        {
          ok: false,
          error: 'store_code_invalid_length',
        },
        { status: 400 }
      );
    }

    const previousStoreCode = await getConfiguredStoreCode();
    const savedStoreCode = await setConfiguredStoreCode(storeCode);
    const status = await restartService({ storeCode: savedStoreCode });

    if (!status?.ok) {
      let rollbackStatus: any = null;
      let rollbackError: string | null = null;
      let rollbackOk = false;

      try {
        const rollbackStoreCode = previousStoreCode || '00000000';
        await setConfiguredStoreCode(rollbackStoreCode);
        rollbackStatus = await restartService({ storeCode: rollbackStoreCode });
        rollbackOk = Boolean(rollbackStatus?.ok);
      } catch (e: any) {
        rollbackError = String(e?.message || 'rollback_failed');
      }

      return NextResponse.json(
        {
          ok: false,
          error: String(status?.error || 'store_code_apply_restart_failed'),
          requestedStoreCode: savedStoreCode,
          storeCode: previousStoreCode || '00000000',
          service: status,
          rollback: {
            attempted: true,
            ok: rollbackOk,
            storeCode: previousStoreCode || '00000000',
            service: rollbackStatus,
            error: rollbackError,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: Boolean(status?.ok),
        storeCode: savedStoreCode,
        service: status,
      },
      {
        status: status?.ok ? 200 : 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: String(e?.message || 'store_code_apply_failed'),
      },
      { status: 500 }
    );
  }
}
