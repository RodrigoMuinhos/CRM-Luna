export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import {
  createVideoId,
  readVideos,
  sanitizeVideo,
  VideoRecord,
  writeVideos,
} from '../videoStore';
import { readVideoSettings } from '../settingsStore';

export async function POST(request: Request) {
  try {
    const settings = await readVideoSettings();
    if (settings.source !== 'uploads') {
      return NextResponse.json(
        {
          success: false,
          error:
            settings.source === 'folder'
              ? 'Upload desabilitado: o Totem está configurado para usar vídeos de uma pasta local.'
              : 'Upload desabilitado: o Totem está configurado para usar vídeos de uma playlist (URL).',
        },
        { status: 409 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const title = String(formData.get('title') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Arquivo inválido.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
    await fs.mkdir(uploadDir, { recursive: true });

    const originalName = file.name || 'video.mp4';
    const ext = path.extname(originalName) || '.mp4';
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = path.join(uploadDir, storedFilename);
    await fs.writeFile(filePath, buffer);

    const dbPath = `/uploads/videos/${storedFilename}`;
    const videos = await readVideos();
    const now = new Date().toISOString();

    const newVideo: VideoRecord = {
      id: createVideoId(),
      filename: storedFilename,
      originalName: safeName,
      title: title || safeName,
      description,
      filePath: dbPath,
      fileSize: file.size,
      displayOrder: videos.length + 1,
      isActive: videos.length === 0, // ativa o primeiro vídeo automaticamente
      status: videos.length === 0 ? 'ACTIVE' : 'PENDING',
      createdAt: now,
      updatedAt: now,
    };

    videos.push(newVideo);
    await writeVideos(videos);

    return NextResponse.json(
      { success: true, video: sanitizeVideo(newVideo) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao fazer upload de vídeo', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao enviar vídeo.' },
      { status: 500 }
    );
  }
}
