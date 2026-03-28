export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { readVideos, sanitizeVideo } from '../videoStore';
import { readVideoSettings } from '../settingsStore';

const ALLOWED_EXTS = new Set(['.mp4', '.mov', '.avi', '.webm', '.mkv']);

async function listFolderVideos(folderPath: string) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => ALLOWED_EXTS.has(path.extname(name).toLowerCase()));

  files.sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const limited = files.slice(0, 15);
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
        filePath: `/api/videos/local/${encodeURIComponent(x.name)}`,
      };
    });
}

async function fetchPlaylist(playlistUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(playlistUrl, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as any;
    const items = Array.isArray(data?.items) ? data.items : [];
    return items
      .map((it: any) => {
        const key = typeof it?.key === 'string' ? it.key : '';
        const url = typeof it?.url === 'string' ? it.url : '';
        return { key: key.trim(), url: url.trim() };
      })
      .filter((x) => x.key && x.url);
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  try {
    const settings = await readVideoSettings();

    if (settings.source === 'playlist') {
      if (!settings.playlistUrl) {
        return NextResponse.json({
          success: true,
          videos: [],
          warning: 'Configure a URL da playlist para carregar os vídeos do descanso.',
        });
      }

      try {
        const items = await fetchPlaylist(settings.playlistUrl);
        const limited = items.slice(0, 15);

        const videos = limited.map((item, idx) => {
          const key = item.key;
          const filename = key.split('/').pop() || key;
          const title = filename.replace(/\.[^.]+$/, '');
          return {
            id: `playlist:${key}`,
            filename,
            title,
            description: '',
            displayOrder: idx + 1,
            fileSize: 0,
            isActive: true,
            status: 'ACTIVE',
            createdAt: new Date(0).toISOString(),
            filePath: item.url,
          };
        });

        return NextResponse.json({ success: true, videos });
      } catch (error) {
        console.error('Erro ao carregar playlist remota', error);
        return NextResponse.json({
          success: true,
          videos: [],
          warning:
            'Não foi possível carregar a playlist de vídeos (verifique a URL e se está pública).',
        });
      }
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
    const activeVideos = videos
      .filter((video) => video.isActive || video.status === 'ACTIVE')
      .sort((a, b) => a.displayOrder - b.displayOrder);

    return NextResponse.json({
      success: true,
      videos: activeVideos.map(sanitizeVideo),
    });
  } catch (error) {
    console.error('Erro ao carregar vídeos ativos', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar vídeos ativos.' },
      { status: 500 }
    );
  }
}
