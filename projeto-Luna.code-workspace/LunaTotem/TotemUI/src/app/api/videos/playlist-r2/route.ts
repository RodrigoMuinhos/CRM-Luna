/**
 * GET /api/videos/playlist-r2
 *
 * Primeiro tenta carregar a playlist remota salva no TotemAPI.
 * Se não existir ou o backend estiver indisponível, cai para os vídeos padrão do R2.
 */

export const dynamic = 'force-dynamic';

import { getTotemApiBaseUrl } from '../../_proxy';

interface R2Video {
  id: string;
  url: string;
  title: string;
  duration?: number;
  sizeBytes?: number;
  displayOrder?: number;
}

function getPlaylistTenantId(requestUrl: URL) {
  return (
    requestUrl.searchParams.get('tenantId')?.trim() ||
    process.env.VIDEO_PLAYLIST_TENANT_ID?.trim() ||
    process.env.NEXT_PUBLIC_VIDEO_TENANT_ID?.trim() ||
    process.env.NEXT_PUBLIC_PRINT_TENANT_ID?.trim() ||
    'default'
  );
}

async function getRemotePlaylist(requestUrl: URL) {
  const baseUrl = getTotemApiBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const tenantId = getPlaylistTenantId(requestUrl);
  const response = await fetch(
    `${baseUrl}/api/video-playlist/public?tenantId=${encodeURIComponent(tenantId)}`,
    {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(`TotemAPI respondeu HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data?.success || !Array.isArray(data?.videos)) {
    throw new Error('Resposta inválida da playlist remota');
  }

  const videos = data.videos
    .map((video: any, index: number) => ({
      id: String(video?.id ?? `video-${index + 1}`),
      url: String(video?.url ?? '').trim(),
      title: String(video?.title ?? '').trim(),
      sizeBytes:
        typeof video?.sizeBytes === 'number' && Number.isFinite(video.sizeBytes)
          ? video.sizeBytes
          : undefined,
      displayOrder:
        typeof video?.displayOrder === 'number' && Number.isFinite(video.displayOrder)
          ? video.displayOrder
          : index + 1,
    }))
    .filter((video: R2Video) => video.url && video.title);

  return {
    success: true,
    videos,
    count: videos.length,
    source: 'totemapi-video-playlist',
    tenantId,
    updatedAt: typeof data?.updatedAt === 'string' ? data.updatedAt : undefined,
  };
}

export async function GET(request: Request) {
  try {
    try {
      const remote = await getRemotePlaylist(new URL(request.url));
      if (remote) {
        return Response.json(remote);
      }
    } catch (remoteError) {
      console.error('Erro ao buscar playlist remota no TotemAPI:', remoteError);
    }

    // 🎬 VÍDEOS REAIS DO R2 - Lista dos 5 vídeos hospedados
    const R2_BASE_URL = 'https://pub-59812e445a4c4fd38663f7cb852f3c24.r2.dev';
    const videos: R2Video[] = [
      {
        id: 'video-001',
        url: `${R2_BASE_URL}/Videos/5Motivos.mp4`,
        title: '5 Motivos para Cuidar da Saúde Íntima',
        sizeBytes: 86210000,
      },
      {
        id: 'video-002',
        url: `${R2_BASE_URL}/Videos/Microscópio.mp4`,
        title: 'Microscópio',
        sizeBytes: 53790000,
      },
      {
        id: 'video-003',
        url: `${R2_BASE_URL}/Videos/fraxx.mp4`,
        title: 'Fraxx',
        sizeBytes: 50480000,
      },
      {
        id: 'video-004',
        url: `${R2_BASE_URL}/Videos/menopausa.mp4`,
        title: 'Menopausa',
        sizeBytes: 47260000,
      },
      {
        id: 'video-005',
        url: `${R2_BASE_URL}/Videos/pH%20Vaginal.mp4`,
        title: 'pH Vaginal',
        sizeBytes: 59020000,
      },
    ];

    return Response.json({
      success: true,
      videos,
      source: 'cloudflare-r2',
      cacheControl: 'public, max-age=3600', // Cache por 1 hora
    });
  } catch (error) {
    console.error('Erro ao buscar playlist R2:', error);
    return Response.json(
      {
        success: false,
        error: 'Erro ao buscar vídeos do R2',
        videos: [],
      },
      { status: 500 }
    );
  }
}
