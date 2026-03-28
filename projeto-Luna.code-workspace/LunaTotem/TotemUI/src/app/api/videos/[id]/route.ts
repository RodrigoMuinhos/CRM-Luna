export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import {
  readVideos,
  sanitizeVideo,
  writeVideos,
  VideoRecord,
} from '../videoStore';

interface RouteParams {
  params: { id: string };
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const payload = await request.json();
    const videos = await readVideos();
    const index = videos.findIndex((video) => video.id === params.id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Vídeo não encontrado.' },
        { status: 404 }
      );
    }

    const current = videos[index];
    const updated: VideoRecord = {
      ...current,
      title: typeof payload.title === 'string' ? payload.title : current.title,
      description:
        typeof payload.description === 'string'
          ? payload.description
          : current.description,
      displayOrder:
        typeof payload.displayOrder === 'number'
          ? payload.displayOrder
          : current.displayOrder,
      isActive:
        typeof payload.isActive === 'boolean' ? payload.isActive : current.isActive,
      status: typeof payload.status === 'string' ? payload.status : current.status,
      updatedAt: new Date().toISOString(),
    };

    videos[index] = updated;
    await writeVideos(videos);

    return NextResponse.json({ success: true, video: sanitizeVideo(updated) });
  } catch (error) {
    console.error('Erro ao atualizar vídeo', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao atualizar vídeo.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const videos = await readVideos();
    const index = videos.findIndex((video) => video.id === params.id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Vídeo não encontrado.' },
        { status: 404 }
      );
    }

    const [removed] = videos.splice(index, 1);
    await writeVideos(videos);

    if (removed?.filePath) {
      const relative = removed.filePath.startsWith('/')
        ? removed.filePath.slice(1)
        : removed.filePath;
      const targetPath = path.join(process.cwd(), 'public', relative);
      try {
        await fs.unlink(targetPath);
      } catch (error) {
        console.warn('Falha ao remover arquivo de vídeo', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover vídeo', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao remover vídeo.' },
      { status: 500 }
    );
  }
}
