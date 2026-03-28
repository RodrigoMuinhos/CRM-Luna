'use client';

import { useEffect, useState } from 'react';

export function GlobalClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const dateLabel = now
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(now)
    : '--/--/----';

  const timeLabel = now
    ? new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(now)
    : '--:--:--';

  return (
    <div className="fixed left-4 top-4 z-[70] pointer-events-none select-none">
      <div className="rounded-full border border-[#D3A67F]/30 bg-white/35 px-4 py-2 text-sm md:text-base text-[#D3A67F]/85 shadow-sm backdrop-blur-sm tabular-nums whitespace-nowrap">
        {dateLabel} {timeLabel}
      </div>
    </div>
  );
}

