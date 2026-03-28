import { useState, useEffect, useRef } from 'react';
import { PageContainer } from '../PageContainer';
import { getFlowSteps } from '@/lib/flowSteps';

interface PhotoCaptureProps {
  onCapture?: (dataUrl: string) => void;
}

export function PhotoCapture({ onCapture }: PhotoCaptureProps) {
  const [countdown, setCountdown] = useState(3);
  const [status, setStatus] = useState<'waiting' | 'captured'>('waiting');
  const [captured, setCaptured] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let active = true;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        });
        if (active && videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error('Camera access failed', err);
      }
    };

    startCamera();

    return () => {
      active = false;
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }

    if (status === 'waiting') {
      const captureTimer = setTimeout(() => {
        capture();
      }, 500);
      return () => clearTimeout(captureTimer);
    }
  }, [countdown, status]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCaptured(dataUrl);
    setStatus('captured');
    // Do not advance automatically; wait for user to tap "Seguir"
    // We keep the dataUrl for the parent callback when proceeding
  };

  return (
    <PageContainer showLogo={false} steps={getFlowSteps('checkin')} currentStep={2}>
      <div className="w-full flex flex-col items-center gap-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl text-[#D3A67F]">Sorria! 😊</h2>
          <p className="text-xl text-[#4A4A4A]/70">Hora da foto!</p>
        </div>

        <div className="relative w-full max-w-lg aspect-square rounded-full shadow-[0_25px_60px_rgba(0,0,0,0.25)] overflow-hidden bg-[#2D2D2D]">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            playsInline
            style={{ clipPath: 'circle(48% at 50% 50%)' }}
          />
          {captured && (
            <img
              src={captured}
              alt="Preview"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ clipPath: 'circle(48% at 50% 50%)' }}
            />
          )}
          <canvas ref={canvasRef} className="hidden" />

          <div className="absolute inset-4 border-2 border-white/40 rounded-full pointer-events-none" />

          {countdown > 0 && status === 'waiting' && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-white text-9xl animate-pulse">{countdown}</div>
            </div>
          )}

          {status === 'captured' && (
            <div className="absolute inset-0 bg-[#d3a67f]/30 flex items-center justify-center">
              <span className="text-white text-5xl font-semibold">OK</span>
            </div>
          )}
        </div>

        <div className="text-center space-y-2">
          <p className="text-lg text-[#4A4A4A]/70">Posicione-se no centro da tela</p>
          {countdown > 0 && status === 'waiting' && (
            <p className="text-xl text-[#D3A67F]">Foto em {countdown}...</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 w-full max-w-lg">
          <button
            className="flex-1 rounded-lg border border-[#D3A67F]/40 bg-white px-6 py-3 text-[#4A4A4A] shadow-sm transition hover:bg-[#F8F6F1]"
            onClick={() => {
              // Allow recapture by resetting state
              setCaptured(null);
              setStatus('waiting');
              setCountdown(3);
            }}
          >
            Refazer Foto
          </button>
          <button
            className="flex-1 rounded-lg bg-[#D3A67F] px-6 py-3 text-white shadow-[0_10px_20px_rgba(0,0,0,0.25)] transition hover:scale-[1.02] disabled:opacity-50"
            disabled={!captured}
            onClick={() => {
              if (captured) {
                onCapture?.(captured);
              }
            }}
          >
            Seguir
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
