'use client';

import { useState, useEffect } from 'react';
import { AUTH_STORAGE_KEYS } from '@/lib/apiConfig';

interface Video {
  id: string;
  url: string;
  title: string;
  sizeBytes?: number;
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [newVideo, setNewVideo] = useState({ url: '', title: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const buildAuthHeaders = () => {
    if (typeof window === 'undefined') {
      return {};
    }

    const token = window.localStorage.getItem(AUTH_STORAGE_KEYS.token);
    const email = window.localStorage.getItem(AUTH_STORAGE_KEYS.email);
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (email) {
      headers['X-User-Email'] = email;
    }

    return headers;
  };

  // Carregar vídeos atuais
  useEffect(() => {
    fetch('/api/videos/admin-playlist', {
      headers: buildAuthHeaders(),
    })
      .then(res => res.json())
      .then(data => {
        setVideos(data.videos || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao carregar vídeos:', err);
        setLoading(false);
      });
  }, []);

  // Adicionar novo vídeo
  const handleAddVideo = () => {
    if (!newVideo.url || !newVideo.title) {
      alert('Preencha URL e título do vídeo');
      return;
    }

    const video: Video = {
      id: `video-${Date.now()}`,
      url: newVideo.url,
      title: newVideo.title,
      sizeBytes: 0
    };

    setVideos([...videos, video]);
    setNewVideo({ url: '', title: '' });
  };

  // Remover vídeo
  const handleRemoveVideo = (id: string) => {
    setVideos(videos.filter(v => v.id !== id));
  };

  // Salvar playlist
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/videos/save-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(),
        },
        body: JSON.stringify({ videos })
      });

      if (response.ok) {
        alert('✅ Playlist salva com sucesso!');
      } else {
        const data = await response.json().catch(() => null);
        alert(`❌ ${data?.error || 'Erro ao salvar playlist'}`);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro ao salvar playlist');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Gerenciar Vídeos do Totem</h1>

        {/* Lista de vídeos atuais */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Vídeos Ativos ({videos.length})
          </h2>
          
          {videos.length === 0 ? (
            <p className="text-gray-500">Nenhum vídeo adicionado ainda</p>
          ) : (
            <div className="space-y-3">
              {videos.map((video, index) => (
                <div
                  key={video.id}
                  className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {index + 1}. {video.title}
                    </div>
                    <div className="text-sm text-gray-600 truncate max-w-md">
                      {video.url}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveVideo(video.id)}
                    className="ml-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Adicionar novo vídeo */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Adicionar Novo Vídeo</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                URL do Vídeo (Gumlet ou qualquer fonte)
              </label>
              <input
                type="text"
                value={newVideo.url}
                onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                placeholder="https://play.gumlet.io/embed/6768cde5c2d4a0e7dfbb9e9e"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cole a URL do vídeo (Gumlet, YouTube, Vimeo, MP4 direto, etc)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Título do Vídeo
              </label>
              <input
                type="text"
                value={newVideo.title}
                onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                placeholder="Ex: 5 Motivos para Cuidar da Saúde Íntima"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleAddVideo}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              ➕ Adicionar Vídeo
            </button>
          </div>
        </div>

        {/* Botão salvar */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <button
            onClick={handleSave}
            disabled={saving || videos.length === 0}
            className="w-full px-6 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saving ? '💾 Salvando...' : '💾 Salvar Playlist'}
          </button>
          <p className="text-sm text-gray-500 mt-2 text-center">
            Os vídeos serão carregados automaticamente no totem após salvar
          </p>
        </div>

        {/* Instruções */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Como usar:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Faça upload dos vídeos no Gumlet</li>
            <li>Copie a URL do vídeo (embed ou direto)</li>
            <li>Cole aqui e adicione um título</li>
            <li>Clique em "Salvar Playlist"</li>
            <li>Os vídeos aparecerão no totem automaticamente!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
