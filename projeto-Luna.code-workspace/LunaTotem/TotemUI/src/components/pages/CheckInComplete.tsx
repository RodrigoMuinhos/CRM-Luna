import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../Button';
import { PageContainer } from '../PageContainer';
import { Appointment } from '../../types';
import { getFlowSteps } from '@/lib/flowSteps';

interface CheckInCompleteProps {
  appointment: Appointment;
  onFinish: () => void;
  onPayNow?: () => void;
}

export function CheckInComplete({ appointment, onFinish, onPayNow }: CheckInCompleteProps) {
  const timersRef = useRef<{ timeout?: ReturnType<typeof setTimeout>; interval?: ReturnType<typeof setInterval> }>({});

  const totalSeconds = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_CHECKIN_COMPLETE_SECONDS;
    const parsed = raw ? Number.parseInt(String(raw), 10) : NaN;
    const effective = Number.isFinite(parsed) && parsed > 0 ? parsed : 120; // default 2 minutes
    // clamp 10s .. 10min
    return Math.min(600, Math.max(10, effective));
  }, []);

  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(totalSeconds);

  const clearTimers = () => {
    if (timersRef.current.timeout) {
      clearTimeout(timersRef.current.timeout);
      timersRef.current.timeout = undefined;
    }
    if (timersRef.current.interval) {
      clearInterval(timersRef.current.interval);
      timersRef.current.interval = undefined;
    }
  };

  useEffect(() => {
    clearTimers();
    setTimeLeftSeconds(totalSeconds);

    const startAt = Date.now();
    const totalMs = totalSeconds * 1000;

    const tick = () => {
      const elapsed = Date.now() - startAt;
      const remaining = Math.max(0, totalMs - elapsed);
      const remainingSeconds = Math.ceil(remaining / 1000);
      setTimeLeftSeconds(remainingSeconds);
      if (remaining <= 0) {
        clearTimers();
        onFinish();
      }
    };

    timersRef.current.interval = setInterval(tick, 250);
    timersRef.current.timeout = setTimeout(() => {
      clearTimers();
      onFinish();
    }, totalMs);
    tick();

    return () => {
      clearTimers();
    };
  }, [onFinish, totalSeconds]);

  const formatTimeLeft = (seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds));
    const mm = Math.floor(safe / 60);
    const ss = safe % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  const handlePayNow = () => {
    clearTimers();
    onPayNow?.();
  };

  const handleBackToMenu = () => {
    clearTimers();
    onFinish();
  };

  return (
    <PageContainer
      showLogo={false}
      showHelp={false}
      steps={getFlowSteps('checkin')}
      currentStep={4}
    >
      <div className="w-full flex flex-col items-center gap-8 text-center">
        {/* Success Icon */}
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#D3A67F] to-[#C89769] flex items-center justify-center shadow-2xl animate-[scale_0.5s_ease-out]">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl text-[#D3A67F]">
            Tudo certo!
          </h2>
          <p className="text-xl md:text-2xl text-[#4A4A4A]">
            Você confirmou sua chegada
          </p>
        </div>

        {/* Doctor Info Card */}
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-6">
            {/* Doctor Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D3A67F]/20 to-[#CDDCDC]/30 flex items-center justify-center flex-shrink-0">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#D3A67F"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>

            <div className="text-left flex-1">
              <p className="text-sm text-[#4A4A4A]/70 mb-1">
                Você será atendida por:
              </p>
              <h3 className="text-2xl text-[#D3A67F]">
                {appointment.doctor}
              </h3>
              <p className="text-[#4A4A4A]/70">
                {appointment.specialty}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-lg text-[#4A4A4A]/70">
            Aguarde ser chamada na recepção
          </p>
          <p className="text-sm text-[#4A4A4A]/50">
            Retornando ao menu inicial em {formatTimeLeft(timeLeftSeconds)}...
          </p>
          <div className="flex flex-col items-center gap-3">
            {onPayNow && (
              <p className="text-sm text-[#4A4A4A]/70">Deseja pagar agora?</p>
            )}
            <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                variant="outline"
                size="lg"
                onClick={handleBackToMenu}
                className="w-full sm:w-auto sm:min-w-[200px]"
              >
                Voltar ao menu
              </Button>
              {onPayNow && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handlePayNow}
                  className="w-full sm:w-auto sm:min-w-[220px]"
                >
                  Ir para Pagamento
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
