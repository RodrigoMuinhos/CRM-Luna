import { NextResponse } from 'next/server';

import { getServiceStatus } from '../_lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await getServiceStatus();
    return NextResponse.json(status, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        supported: true,
        running: false,
        error: String(e?.message || 'service_status_failed'),
      },
      { status: 500 }
    );
  }
}
