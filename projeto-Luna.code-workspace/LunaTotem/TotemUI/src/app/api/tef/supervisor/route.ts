import { NextResponse } from 'next/server';

const DEFAULT_TEF_BRIDGE_URL = 'http://127.0.0.1:7071';

function getBridgeBaseUrl(): string {
  // Server-side: prefer non-public env if provided.
  const server = (process.env.TEF_BRIDGE_URL || '').trim();
  const pub = (process.env.NEXT_PUBLIC_TEF_BRIDGE_URL || '').trim();
  return server || pub || DEFAULT_TEF_BRIDGE_URL;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as any;
    const saleId = String(body?.saleId || '').trim();
    const password = String(body?.password || '').trim();

    if (!saleId) {
      return NextResponse.json({ ok: false, error: 'saleId_required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ ok: false, error: 'password_required' }, { status: 400 });
    }

    const baseUrl = getBridgeBaseUrl().replace(/\/$/, '');

    const upstream = await fetch(`${baseUrl}/tef/supervisor/${encodeURIComponent(saleId)}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      // IMPORTANT: do not log the password; do not include it in any response.
      body: JSON.stringify({ password }),
      cache: 'no-store',
    });

    if (!upstream.ok) {
      // Read upstream body safely, but never echo sensitive content.
      const text = await upstream.text().catch(() => '');
      const hasPasswordWord = /password/i.test(text);
      return NextResponse.json(
        {
          ok: false,
          saleId,
          error: 'bridge_rejected_supervisor_password',
          status: upstream.status,
          note: hasPasswordWord ? 'upstream_message_redacted' : undefined,
        },
        { status: upstream.status }
      );
    }

    return NextResponse.json({ ok: true, saleId, supervisorAuth: true });
  } catch {
    // Avoid leaking request body contents.
    return NextResponse.json({ ok: false, error: 'supervisor_forward_failed' }, { status: 500 });
  }
}
