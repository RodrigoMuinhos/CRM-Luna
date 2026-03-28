"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';

import { triggerTefReprint } from '@/lib/tefReprint';

function isF2Key(event: KeyboardEvent): boolean {
  return event.key === 'F2' || event.code === 'F2' || event.keyCode === 113;
}

export function GlobalF2ReprintHotkey() {
  const pathname = usePathname();
  const runningRef = useRef(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isF2Key(event)) return;
      if (event.defaultPrevented) return;
      if (event.repeat) return;

      // Dedicated payment success screen owns F2 and maps it to the visible print button.
      if (typeof document !== 'undefined' && document.body.dataset.lvF2Scope === 'payment-success') {
        return;
      }

      // Dedicated screen already handles F2/F3 with supervisor + full audit flow.
      if (pathname?.startsWith('/system/tef/110')) return;

      if (event.cancelable) event.preventDefault();
      event.stopPropagation();

      if (runningRef.current) return;
      runningRef.current = true;

      const lastSaleId =
        typeof window !== 'undefined'
          ? String(window.sessionStorage.getItem('lv_last_sale_id') || '').trim()
          : '';

      void triggerTefReprint({
        saleId: lastSaleId || undefined,
        source: 'GlobalF2Hotkey',
        preferDirectPrint: Boolean(lastSaleId),
      })
        .then((result) => {
          if (result.strategy === 'local-reprint') {
            toast.success(`Reimpressão enviada (${result.printedCount || 1} via).`);
            return;
          }
          if (result.strategy === 'bridge-print') {
            toast.success('Comprovante enviado para impressão.');
            return;
          }
          toast.success('Reimpressão solicitada no terminal (F2).');
        })
        .catch((error: any) => {
          toast.error(String(error?.message || 'Não foi possível reimprimir agora.'));
        })
        .finally(() => {
          runningRef.current = false;
        });
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [pathname]);

  return null;
}
