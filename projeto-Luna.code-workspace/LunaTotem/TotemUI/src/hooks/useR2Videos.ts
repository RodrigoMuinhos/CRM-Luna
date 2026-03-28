/**
 * Hook para gerenciar vídeos do R2 com cache local
 */

import { useState, useEffect } from 'react';

interface R2Video {
  id: string;
  url: string;
  title: string;
  duration?: number;
  sizeBytes?: number;
  cachedPath?: string;
}

interface UseR2VideosOptions {
  autoCache?: boolean;
  playlistUrl?: string;
}

export function useR2Videos(options: UseR2VideosOptions = {}) {
  const { autoCache = true, playlistUrl = '/api/videos/playlist-r2' } = options;
  
  const [videos, setVideos] = useState<R2Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cachingProgress, setCachingProgress] = useState<Record<string, boolean>>({});

  // Carregar lista de vídeos
  useEffect(() => {
    let cancelled = false;

    const loadVideos = async () => {
      const customVideos = typeof window !== 'undefined' ? localStorage.getItem('custom-videos') : null;
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(playlistUrl);
        const data = await res.json();

        if (cancelled) return;

        if (!data.success || !Array.isArray(data.videos)) {
          throw new Error('Formato de resposta inválido');
        }

        console.log('[R2 VIDEOS] Carregados da API:', data.videos.length, 'vídeos');
        setVideos(data.videos);

        // Se autoCache habilitado e há playlist remota, tenta cachear os vídeos
        if (autoCache && data.videos.length > 0) {
          cacheVideos(data.videos);
        }
      } catch (err: any) {
        console.error('[R2 VIDEOS] Erro ao carregar:', err);
        if (cancelled) return;

        if (customVideos) {
          try {
            const parsedVideos = JSON.parse(customVideos);
            console.log('[R2 VIDEOS] Fallback localStorage:', parsedVideos.length, 'vídeos');
            setVideos(parsedVideos);
            setError('Usando playlist local em fallback.');
            return;
          } catch (storageError) {
            console.warn('[R2 VIDEOS] Falha ao usar fallback do localStorage:', storageError);
          }
        }

        setError(err?.message || 'Erro ao carregar vídeos');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadVideos();

    return () => {
      cancelled = true;
    };
  }, [playlistUrl, autoCache]);

  // Cachear vídeos localmente
  const cacheVideos = async (videosToCache: R2Video[]) => {
    for (const video of videosToCache) {
      try {
        setCachingProgress((prev) => ({ ...prev, [video.id]: true }));

        const res = await fetch('/api/videos/cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: video.id,
            videoUrl: video.url,
          }),
        });

        const data = await res.json();

        if (data.success && data.localPath) {
          // Atualiza o vídeo com o caminho cacheado
          setVideos((prev) =>
            prev.map((v) =>
              v.id === video.id ? { ...v, cachedPath: data.localPath } : v
            )
          );
          console.log('[R2 CACHE] Vídeo cacheado:', video.title, '→', data.localPath);
        }
      } catch (err) {
        console.warn('[R2 CACHE] Falha ao cachear:', video.title, err);
      } finally {
        setCachingProgress((prev) => ({ ...prev, [video.id]: false }));
      }
    }
  };

  // Retorna a lista de URLs dos vídeos (R2 direto, sem cache por enquanto)
  const getVideoUrls = (): string[] => {
    return videos.map((v) => v.url); // Usa sempre R2, mais confiável
  };

  return {
    videos,
    loading,
    error,
    cachingProgress,
    videoUrls: getVideoUrls(),
    cacheVideos: () => cacheVideos(videos),
  };
}
