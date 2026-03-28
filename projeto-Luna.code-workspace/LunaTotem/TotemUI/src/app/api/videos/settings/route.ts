export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { readVideoSettings, writeVideoSettings } from '../settingsStore';

function isWindowsAbsolutePath(value: string) {
  return /^[a-zA-Z]:[\\/]/.test(value);
}

function isAbsoluteLike(value: string) {
  return path.isAbsolute(value) || isWindowsAbsolutePath(value);
}

function isHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const settings = await readVideoSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Erro ao ler configurações de vídeo', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao ler configurações de vídeo.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json();

    // The system now uses a single, AppWeb-friendly approach: public playlist URL (Cloudflare Worker + R2).
    const desiredSource = 'playlist';
    const desiredPlaylistUrl =
      typeof payload?.playlistUrl === 'string'
        ? payload.playlistUrl.trim()
        : payload?.playlistUrl === null
          ? ''
          : '';

    if (!desiredPlaylistUrl) {
      return NextResponse.json(
        { success: false, error: 'Informe a URL da playlist (ex: https://.../playlist.json).' },
        { status: 400 }
      );
    }
    if (!isHttpUrl(desiredPlaylistUrl)) {
      return NextResponse.json(
        { success: false, error: 'A URL da playlist deve começar com http:// ou https://.' },
        { status: 400 }
      );
    }

    const settings = await writeVideoSettings({
      source: desiredSource,
      folderPath: null,
      playlistUrl: desiredPlaylistUrl,
      inactivityMinutes: payload?.inactivityMinutes,
    });
    const warning =
      'Modo playlist: os vídeos virão de uma URL pública (ex: Cloudflare Worker + R2).';
    return NextResponse.json({ success: true, settings, warning });
  } catch (error) {
    console.error('Erro ao salvar configurações de vídeo', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao salvar configurações de vídeo.' },
      { status: 500 }
    );
  }
}
