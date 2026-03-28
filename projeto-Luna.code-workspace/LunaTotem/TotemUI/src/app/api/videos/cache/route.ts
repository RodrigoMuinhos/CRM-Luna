/**
 * POST /api/videos/cache
 * 
 * Baixa vídeos da playlist R2 e salva localmente para cache.
 * Útil para ambientes offline ou melhor performance.
 */

import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Diretório onde os vídeos serão cacheados
const CACHE_DIR = path.join(process.cwd(), 'public', 'uploads', 'videos', 'cache');

async function ensureCacheDir() {
  try {
    await fs.access(CACHE_DIR);
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoUrl, videoId } = body;

    if (!videoUrl || !videoId) {
      return Response.json(
        { success: false, error: 'videoUrl e videoId são obrigatórios' },
        { status: 400 }
      );
    }

    await ensureCacheDir();

    // Nome do arquivo local
    const filename = `${videoId}.mp4`;
    const localPath = path.join(CACHE_DIR, filename);

    // Verifica se já existe em cache
    try {
      await fs.access(localPath);
      return Response.json({
        success: true,
        cached: true,
        localPath: `/uploads/videos/cache/${filename}`,
        message: 'Vídeo já está em cache',
      });
    } catch {
      // Arquivo não existe, precisa baixar
    }

    // Baixa o vídeo do R2
    console.log(`[CACHE] Baixando vídeo: ${videoUrl}`);
    const response = await fetch(videoUrl);

    if (!response.ok) {
      throw new Error(`Falha ao baixar vídeo: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await fs.writeFile(localPath, Buffer.from(buffer));

    console.log(`[CACHE] Vídeo salvo: ${localPath}`);

    return Response.json({
      success: true,
      cached: false,
      localPath: `/uploads/videos/cache/${filename}`,
      sizeBytes: buffer.byteLength,
      message: 'Vídeo baixado e cacheado com sucesso',
    });
  } catch (error: any) {
    console.error('[CACHE] Erro ao cachear vídeo:', error);
    return Response.json(
      {
        success: false,
        error: error?.message || 'Erro ao cachear vídeo',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/videos/cache
 * 
 * Lista vídeos cacheados localmente
 */
export async function GET() {
  try {
    await ensureCacheDir();
    const files = await fs.readdir(CACHE_DIR);
    
    const cachedVideos = await Promise.all(
      files
        .filter((f) => f.endsWith('.mp4'))
        .map(async (filename) => {
          const filePath = path.join(CACHE_DIR, filename);
          const stats = await fs.stat(filePath);
          return {
            filename,
            path: `/uploads/videos/cache/${filename}`,
            sizeBytes: stats.size,
            cachedAt: stats.mtime.toISOString(),
          };
        })
    );

    return Response.json({
      success: true,
      videos: cachedVideos,
    });
  } catch (error: any) {
    console.error('[CACHE] Erro ao listar cache:', error);
    return Response.json(
      {
        success: false,
        error: error?.message || 'Erro ao listar cache',
        videos: [],
      },
      { status: 500 }
    );
  }
}
