import { NextResponse } from 'next/server';

import { startService, validateServiceControlPassword } from '../_lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as any;
    const password = String(body?.password || '');

    const pw = validateServiceControlPassword(password);
    if (!pw.ok) {
      return NextResponse.json(
        {
          ok: false,
          supported: true,
          running: false,
          error: pw.error || 'password_required',
        },
        { status: pw.error === 'invalid_password' ? 403 : 400 }
      );
    }

    const status = await startService();
    const delayedStartup = status.error === 'sitef_start_timeout_waiting_health';
    return NextResponse.json(status, {
      status: status.ok || delayedStartup ? 200 : 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        supported: true,
        running: false,
        error: String(e?.message || 'service_start_failed'),
      },
      { status: 500 }
    );
  }
}
