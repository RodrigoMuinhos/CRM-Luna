import { useState, useEffect } from 'react';

interface Video {
  id: string;
  filename: string;
  title: string;
  description: string;
  filePath: string;
}

interface VideoCarouselProps {
  autoplay?: boolean;
  autoplayInterval?: number;
  mute?: boolean;
}

export function VideoCarousel({ 
  autoplay = true, 
  autoplayInterval = 8000,
  mute = true 
}: VideoCarouselProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(mute);

  // Load active videos from API
  useEffect(() => {
    const loadVideos = async () => {
      try {
        const response = await fetch('/api/videos/active');
        const data = await response.json();
        if (data.success && data.videos && data.videos.length > 0) {
          // Map videos with correct file paths
          const mappedVideos = data.videos.map((video: any) => ({
            id: video.id,
            filename: video.filename,
            title: video.title,
            description: video.description,
            filePath: video.filePath || (video.filename ? `/uploads/videos/${video.filename}` : ''),
          }));
          setVideos(mappedVideos);
        }
      } catch (error) {
        console.error('Erro ao carregar vídeos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, []);

  // Autoplay effect
  useEffect(() => {
    if (!isPlaying || videos.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % videos.length);
    }, autoplayInterval);

    return () => clearInterval(interval);
  }, [isPlaying, videos.length, autoplayInterval]);

  if (loading) {
    return (
      <div className="w-full bg-gray-900 rounded-xl flex items-center justify-center aspect-video">
        <div className="text-white text-lg">⏳ Carregando vídeos...</div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="w-full bg-gray-900 rounded-xl flex items-center justify-center aspect-video">
        <div className="text-white text-lg">Nenhum vídeo disponível</div>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];

  return (
    <div className="w-full space-y-4">
      {/* Video Player */}
      <div className="relative w-full bg-black rounded-xl overflow-hidden shadow-lg group">
        <video
          key={currentVideo.id}
          src={currentVideo.filePath}
          className="w-full h-auto aspect-video object-cover"
          autoPlay
          muted={isMuted}
          controls={false}
          loop={videos.length === 1}
          onEnded={() => {
            if (videos.length > 1) {
              setCurrentIndex((prev) => (prev + 1) % videos.length);
            }
          }}
        />

        {/* Controls Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
          {/* Top Controls */}
          <div className="flex justify-between items-center">
            <div className="bg-black/50 px-3 py-1 rounded-full text-white text-sm">
              {currentIndex + 1} / {videos.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition"
                title={isMuted ? 'Desmutar' : 'Mutar'}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition"
                title={isPlaying ? 'Pausar' : 'Reproduzir'}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
            </div>
          </div>

          {/* Bottom Info */}
          <div className="space-y-2">
            {currentVideo.title && (
              <h3 className="text-white font-bold text-lg">{currentVideo.title}</h3>
            )}
            {currentVideo.description && (
              <p className="text-white/80 text-sm">{currentVideo.description}</p>
            )}
          </div>
        </div>

        {/* Click to Play/Pause */}
        {videos.length > 1 && (
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
          />
        )}
      </div>

      {/* Thumbnail Navigation */}
      {videos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {videos.map((video, index) => (
            <button
              key={video.id}
              onClick={() => {
                setCurrentIndex(index);
                setIsPlaying(true);
              }}
              className={`relative flex-shrink-0 rounded-lg overflow-hidden transition transform hover:scale-105 ${
                index === currentIndex ? 'ring-2 ring-[#D3A67F]' : 'opacity-60 hover:opacity-100'
              }`}
              title={video.title}
            >
              <video
                src={video.filePath}
                className="w-20 h-12 object-cover bg-gray-900"
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{index + 1}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Progress Indicators (Dots) */}
      {videos.length > 1 && (
        <div className="flex justify-center gap-2">
          {videos.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                setIsPlaying(true);
              }}
              className={`h-2 rounded-full transition ${
                index === currentIndex ? 'bg-[#D3A67F] w-8' : 'bg-gray-400 w-2 hover:bg-gray-500'
              }`}
              title={`Vídeo ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Info Text */}
      <div className="text-center text-sm text-[#4A4A4A]/60">
        {isPlaying ? '▶️ Reproduzindo automaticamente' : '⏸️ Pausado'}
      </div>
    </div>
  );
}
