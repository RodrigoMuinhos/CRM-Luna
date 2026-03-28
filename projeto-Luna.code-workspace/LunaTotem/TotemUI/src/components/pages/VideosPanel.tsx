"use client";

import { useEffect, useState } from 'react';
import { RotateCw, Film } from 'lucide-react';
import { Button } from '../Button';

interface Video {
  id: string;
  url: string;
  title: string;
  filename?: string;
  filePath?: string;
  editingTitle?: boolean;
}

const inputClass =
  'w-full rounded-2xl border border-[#E5D9CE] bg-white px-4 py-3 text-sm text-[#4F3F2E] placeholder:text-[#B09985] focus:outline-none focus:ring-2 focus:ring-[#D3A67F]/40 focus:border-[#D3A67F]';

export function VideosPanel() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [inactivityTimeout, setInactivityTimeout] = useState(3);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Carregar vídeos atuais
  const loadVideos = async () => {
    setLoading(true);
    try {
      // Apenas carrega do localStorage (não carrega exemplos padrão)
      const customVideos = localStorage.getItem('custom-videos');
      if (customVideos) {
        setVideos(JSON.parse(customVideos));
      } else {
        setVideos([]);
      }

      // Carregar tempo de inatividade salvo
      const savedTimeout = localStorage.getItem('video-inactivity-timeout');
      if (savedTimeout) {
        const timeoutValue = Number.parseInt(savedTimeout, 10);
        if (timeoutValue >= 1 && timeoutValue <= 5) {
          setInactivityTimeout(timeoutValue);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar vídeos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  // Adicionar novos vídeos
  const handleAddVideos = async (urls: string[]) => {
    if (urls.length === 0) return;

    setSaving(true);
    setMessage(null);

    const newVideos = urls.map((url, i) => ({
      id: `video-${Date.now()}-${i}`,
      url: url.trim(),
      title: `Vídeo ${videos.length + i + 1}`,
      sizeBytes: 0
    }));

    try {
      const updatedVideos = [...videos, ...newVideos];
      
      // Salvar no localStorage
      localStorage.setItem('custom-videos', JSON.stringify(updatedVideos));
      
      setMessage({ type: 'success', text: `✅ ${urls.length} vídeo(s) adicionado(s) com sucesso!` });
      setVideos(updatedVideos);
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Erro: ${(error as Error).message}` });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Remover vídeo
  const handleRemoveVideo = async (id: string) => {
    const confirmed = window.confirm('Remover este vídeo?');
    if (!confirmed) return;

    setSaving(true);
    setMessage(null);

    const updatedVideos = videos.filter(v => v.id !== id);
    
    try {
      // Salvar no localStorage
      localStorage.setItem('custom-videos', JSON.stringify(updatedVideos));
      
      setMessage({ type: 'success', text: '✅ Vídeo removido com sucesso!' });
      setVideos(updatedVideos);
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Erro: ${(error as Error).message}` });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Editar nome do vídeo
  const handleUpdateVideoTitle = (id: string, newTitle: string) => {
    const updatedVideos = videos.map(v => 
      v.id === id ? { ...v, title: newTitle } : v
    );
    setVideos(updatedVideos);
    localStorage.setItem('custom-videos', JSON.stringify(updatedVideos));
    setMessage({ type: 'success', text: '✅ Nome atualizado!' });
    setTimeout(() => setMessage(null), 3000);
  };

  // Salvar configurações de tempo
  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Salvar no localStorage
      localStorage.setItem('video-inactivity-timeout', String(inactivityTimeout));
      
      setMessage({ type: 'success', text: '✅ Configurações salvas com sucesso!' });
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Erro: ${(error as Error).message}` });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6 text-[#4F3F2E]">
      {/* Mensagem de status */}
      {message && (
        <div className={`rounded-2xl p-4 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      {/* Header */}
      <section className="rounded-[32px] border border-[#E9DAD1] bg-white/90 px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#C8A580]">Biblioteca</p>
            <h2 className="text-3xl font-semibold text-[#8C7155] flex items-center gap-2">
              <Film size={28} className="text-[#D3A67F]" />
              Gerenciar Vídeos
            </h2>
            <p className="text-sm text-[#7B6A5A]">
              Adicione vídeos do Gumlet, YouTube, Vimeo ou qualquer fonte
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-2xl bg-[#F7EFE6] px-4 py-2 text-sm text-[#7B6A5A]">
              <span className="text-xl font-semibold text-[#8C7155]">{videos.length}</span>
              <span className="text-[#B09985]"> vídeos</span>
            </div>
            <Button
              onClick={loadVideos}
              disabled={loading}
              variant="secondary"
              className="flex items-center justify-center rounded-full border border-[#CFB6A1] bg-white px-3 py-3 text-[#8C7155] hover:bg-[#F8F1EA]"
              size="sm"
              title="Atualizar lista"
            >
              <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </section>

      {/* Lista de vídeos configurados */}
      {videos.length > 0 && (
        <section className="rounded-[32px] border border-[#E9DAD1] bg-white/90 px-6 py-5 shadow-sm">
          <h3 className="text-xl font-semibold text-[#8C7155] mb-4">
            📋 Vídeos Configurados ({videos.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {videos.map((video, index) => (
              <div
                key={video.id}
                className="flex items-center gap-3 bg-[#FFFCF8] rounded-[20px] p-4 border border-[#EFE2D7]"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#F0E2D3] flex items-center justify-center text-sm font-bold text-[#8C7155]">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={video.title}
                    onChange={(e) => handleUpdateVideoTitle(video.id, e.target.value)}
                    className="w-full font-semibold text-[#4F3F2E] bg-transparent border-none focus:outline-none focus:bg-white focus:border focus:border-[#D3A67F] focus:rounded-lg focus:px-2 focus:py-1"
                  />
                  <div className="text-xs text-[#7B6A5A] truncate">
                    {video.url || video.filePath}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveVideo(video.id)}
                  className="flex-shrink-0 px-4 py-2 bg-red-50 text-red-600 rounded-full text-sm font-medium hover:bg-red-100 border border-red-200"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Adicionar novos vídeos */}
      <section className="rounded-[32px] border border-[#E9DAD1] bg-white/90 px-6 py-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-2xl font-semibold text-[#8C7155] mb-2">
            ➕ Adicionar Novos Vídeos
          </h3>
          <p className="text-sm text-[#7B6A5A]">
            Cole as URLs dos seus vídeos (uma por linha)
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#4F3F2E] mb-2">
              URLs dos Vídeos
            </label>
            <textarea
              rows={6}
              placeholder="https://play.gumlet.io/embed/6768cde5...&#10;https://video.gumlet.io/abc123/main.mp4&#10;https://www.youtube.com/embed/VIDEO_ID"
              className={inputClass}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  const urls = e.currentTarget.value.trim().split('\n').filter(Boolean);
                  if (urls.length > 0) {
                    handleAddVideos(urls);
                    e.currentTarget.value = '';
                  }
                }
              }}
              onBlur={(e) => {
                const urls = e.target.value.trim().split('\n').filter(Boolean);
                if (urls.length > 0) {
                  handleAddVideos(urls);
                  e.target.value = '';
                }
              }}
            />
            <p className="text-xs text-[#A38C77] mt-1">
              💡 Cole várias URLs de uma vez (uma por linha). Clique fora ou Ctrl+Enter para adicionar.
            </p>
          </div>


        </div>
      </section>

      {/* Configuração de tempo */}
      <section className="rounded-[32px] border border-[#E9DAD1] bg-white/90 px-6 py-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-[#8C7155]">⏱️ Tempo de Inatividade</h3>
          <p className="text-sm text-[#7B6A5A]">
            Tempo sem interação antes de voltar aos vídeos
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={5}
              value={inactivityTimeout}
              onChange={(e) => {
                const val = Number.parseInt(e.target.value, 10);
                setInactivityTimeout(Math.max(1, Math.min(5, val || 3)));
              }}
              className={inputClass + ' w-24'}
            />
            <span className="text-sm text-[#7B6A5A]">minutos (entre 1 e 5)</span>
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full rounded-2xl bg-[#8C7155] text-white hover:bg-[#7C6248] px-6 py-3 font-medium"
          >
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
        </div>
      </section>
    </div>
  );
}
