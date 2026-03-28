export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getTotemApiBaseUrl } from '../../_proxy';

export async function GET(request: Request) {
  try {
    const baseUrl = getTotemApiBaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: 'TotemAPI não configurado para carregar a playlist.' },
        { status: 500 }
      );
    }

    const headers = new Headers({ accept: 'application/json' });
    const authHeader = request.headers.get('authorization');
    const userEmail = request.headers.get('x-user-email');
    if (authHeader) {
      headers.set('authorization', authHeader);
    }
    if (userEmail) {
      headers.set('x-user-email', userEmail);
    }

    const upstreamResponse = await fetch(`${baseUrl}/api/video-playlist`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const responseText = await upstreamResponse.text();
    let payload: any = {};
    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch {
      payload = { success: upstreamResponse.ok, raw: responseText };
    }

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: payload?.error || 'Erro ao carregar playlist do TotemAPI',
        },
        { status: upstreamResponse.status }
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Erro ao carregar playlist autenticada:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar playlist autenticada' },
      { status: 500 }
    );
  }
}
