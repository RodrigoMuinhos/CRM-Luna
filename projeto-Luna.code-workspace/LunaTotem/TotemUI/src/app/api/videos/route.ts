export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { readVideos, sanitizeVideo } from './videoStore';
import { readVideoSettings } from './settingsStore';

const ALLOWED_EXTS = new Set(['.mp4', '.mov', '.avi', '.webm', '.mkv']);

async function listFolderVideos(folderPath: string) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => ALLOWED_EXTS.has(path.extname(name).toLowerCase()));

  files.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const limited = files.slice(0, 50);

  const stats = await Promise.all(
    limited.map(async (name) => {
      const fullPath = path.join(folderPath, name);
      try {
        const stat = await fs.stat(fullPath);
        return { name, stat };
      } catch {
        return { name, stat: null as any };
      }
    })
  );

  return stats
    .filter((x) => x.stat && x.stat.isFile())
    .map((x, idx) => {
      const ext = path.extname(x.name);
      const title = x.name.replace(new RegExp(`${ext}$`, 'i'), '');
      return {
        id: `local:${x.name}`,
        filename: x.name,
        title,
        description: '',
        displayOrder: idx + 1,
        fileSize: x.stat.size,
        isActive: true,
        status: 'ACTIVE',
        createdAt: new Date(x.stat.mtimeMs).toISOString(),
        updatedAt: new Date(x.stat.mtimeMs).toISOString(),
        filePath: `/api/videos/local/${encodeURIComponent(x.name)}`,
      };
    });
}

export async function GET() {
  try {
    const settings = await readVideoSettings();

    if (settings.source === 'playlist') {
      return NextResponse.json({
        success: true,
        videos: [],
        warning:
          'Modo playlist ativo: os vídeos são carregados de uma URL pública (ex: Cloudflare Worker + R2).',
      });
    }

    if (settings.source === 'folder' && settings.folderPath) {
      if (process.platform !== 'win32') {
        return NextResponse.json({
          success: true,
          videos: [],
          warning:
            'Pasta local está configurada, mas este ambiente não tem acesso ao disco do kiosk (ex: Vercel).',
        });
      }

      try {
        const videos = await listFolderVideos(settings.folderPath);
        return NextResponse.json({ success: true, videos });
      } catch (error) {
        console.error('Erro ao listar vídeos da pasta local', error);
        return NextResponse.json(
          {
            success: false,
            error: 'Não foi possível ler a pasta local configurada.',
          },
          { status: 400 }
        );
      }
    }

    const videos = await readVideos();
    return NextResponse.json({
      success: true,
      videos: videos.map(sanitizeVideo),
    });
  } catch (error) {
    console.error('Erro ao listar vídeos', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar vídeos.' },
      { status: 500 }
    );
  }
}
