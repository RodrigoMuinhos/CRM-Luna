import { NextResponse } from 'next/server';
import { getTotemApiBaseUrl } from '../../_proxy';

export async function POST(request: Request) {
  try {
    const { videos } = await request.json();

    if (!videos || !Array.isArray(videos)) {
      return NextResponse.json(
        { error: 'Lista de vídeos inválida' },
        { status: 400 }
      );
    }

    const baseUrl = getTotemApiBaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: 'TotemAPI não configurado para persistir a playlist.' },
        { status: 500 }
      );
    }

    const headers = new Headers({ 'Content-Type': 'application/json' });
    const authHeader = request.headers.get('authorization');
    const userEmail = request.headers.get('x-user-email');
    if (authHeader) {
      headers.set('authorization', authHeader);
    }
    if (userEmail) {
      headers.set('x-user-email', userEmail);
    }

    const upstreamResponse = await fetch(`${baseUrl}/api/video-playlist`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ videos }),
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
          error: payload?.error || 'Erro ao salvar playlist no TotemAPI',
        },
        { status: upstreamResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Playlist salva com sucesso',
      count: Array.isArray(payload?.videos) ? payload.videos.length : videos.length,
      updatedAt: payload?.updatedAt,
    });
  } catch (error) {
    console.error('Erro ao salvar playlist:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar playlist' },
      { status: 500 }
    );
  }
}
