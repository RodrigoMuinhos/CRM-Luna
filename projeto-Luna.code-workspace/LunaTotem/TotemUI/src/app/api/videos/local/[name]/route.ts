export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { readVideoSettings } from '../../settingsStore';

interface RouteParams {
  params: { name: string };
}

const ALLOWED_EXTS = new Set(['.mp4', '.mov', '.avi', '.webm', '.mkv']);

function inferContentType(ext: string): string {
  switch (ext) {
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mov':
      return 'video/quicktime';
    case '.avi':
      return 'video/x-msvideo';
    case '.mkv':
      return 'video/x-matroska';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    if (process.platform !== 'win32') {
      return NextResponse.json(
        {
          success: false,
          error: 'Streaming de pasta local só funciona no kiosk (Windows).',
        },
        { status: 400 }
      );
    }

    const settings = await readVideoSettings();
    if (settings.source !== 'folder' || !settings.folderPath) {
      return NextResponse.json(
        { success: false, error: 'Fonte de vídeos local não configurada.' },
        { status: 400 }
      );
    }

    const decoded = decodeURIComponent(params.name || '');
    const baseName = path.basename(decoded);
    // Prevent path traversal / nested paths.
    if (!baseName || baseName !== decoded) {
      return NextResponse.json({ success: false, error: 'Arquivo inválido.' }, { status: 400 });
    }

    const ext = path.extname(baseName).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      return NextResponse.json({ success: false, error: 'Tipo de arquivo não permitido.' }, { status: 415 });
    }

    const fullPath = path.join(settings.folderPath, baseName);

    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) {
      return NextResponse.json({ success: false, error: 'Arquivo não encontrado.' }, { status: 404 });
    }

    const nodeStream = createReadStream(fullPath);
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': inferContentType(ext),
        'Content-Length': String(stat.size),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Erro ao servir vídeo local', error);
    return NextResponse.json({ success: false, error: 'Falha ao carregar vídeo.' }, { status: 500 });
  }
}
