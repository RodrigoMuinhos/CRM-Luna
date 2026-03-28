import { useCallback, useEffect, useRef, useState } from 'react';
import { PageContainer } from '../PageContainer';
import { Button } from '../Button';
import { FlowType, getFlowSteps } from '@/lib/flowSteps';
import { triggerTefReprint } from '@/lib/tefReprint';

interface PaymentSuccessProps {
  onFinish: () => void;
  flow?: FlowType;
  saleId?: string;
  autoPrintIssue?: string;
}

function isF2Key(event: KeyboardEvent): boolean {
  return event.key === 'F2' || event.code === 'F2' || event.keyCode === 113;
}

export function PaymentSuccess({ onFinish, flow = 'payment', saleId = '', autoPrintIssue = '' }: PaymentSuccessProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printFeedback, setPrintFeedback] = useState('');
  const [printFeedbackTone, setPrintFeedbackTone] = useState<'success' | 'warn'>('success');
  const f2RunningRef = useRef(false);
  const steps = getFlowSteps(flow);
  const currentStep = flow === 'checkin' ? 4 : 2;

  const handlePrint = useCallback(async () => {
    try {
      setIsPrinting(true);
      setPrintFeedback('');
      const result = await triggerTefReprint({
        saleId: String(saleId || '').trim(),
        source: 'PaymentSuccess',
        preferDirectPrint: true,
      });

      setPrintFeedbackTone('success');
      if (result.strategy === 'bridge-print') {
        setPrintFeedback('Comprovante enviado para impressão.');
        return;
      }
      if (result.strategy === 'local-reprint') {
        const label = result.matchedBy === 'last_with_receipt' ? 'última transação com comprovante' : 'comprovante';
        setPrintFeedback(`Reimpressão enviada (${label}).`);
        return;
      }
      setPrintFeedback('Reimpressão solicitada no terminal de pagamento.');
    } catch (error) {
      console.warn('[PAYMENT SUCCESS] Falha ao reimprimir comprovante TEF', error);
      setPrintFeedbackTone('warn');
      setPrintFeedback('Não foi possível reimprimir agora. Tente novamente.');
    } finally {
      setIsPrinting(false);
    }
  }, [saleId]);

  useEffect(() => {
    // Let the dedicated screen own F2 so it maps exactly to the "Imprimir comprovante" button.
    if (typeof document !== 'undefined') {
      document.body.dataset.lvF2Scope = 'payment-success';
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isF2Key(event)) return;
      if (event.defaultPrevented) return;
      if (event.repeat) return;
      if (f2RunningRef.current) return;

      if (event.cancelable) event.preventDefault();
      event.stopPropagation();

      f2RunningRef.current = true;
      void handlePrint().finally(() => {
        f2RunningRef.current = false;
      });
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      if (typeof document !== 'undefined' && document.body.dataset.lvF2Scope === 'payment-success') {
        delete document.body.dataset.lvF2Scope;
      }
    };
  }, [handlePrint]);

  return (
    <PageContainer showLogo={false} showHelp={false} steps={steps} currentStep={currentStep}>
      <div className="w-full flex flex-col items-center gap-8 text-center">
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#4CAF50] to-[#1B5E20] flex items-center justify-center shadow-2xl shadow-[#4CAF50]/40">
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
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl text-[#1B5E20]">Pagamento confirmado</h2>
          <p className="text-xl md:text-2xl text-[#2E7D32]">Aguarde sua consulta.</p>
        </div>

        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-[#2E7D32]">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-lg">Pagamento confirmado com sucesso</span>
            </div>
            <p className="text-[#2E7D32]/80">Você pode aguardar atendimento na recepção.</p>
            {autoPrintIssue ? (
              <p className="text-sm text-[#9C6B2F]">
                O comprovante não saiu automaticamente. Use o botão abaixo para imprimir.
              </p>
            ) : null}
            {printFeedback ? (
              <p className={`text-sm ${printFeedbackTone === 'success' ? 'text-[#2E7D32]' : 'text-[#9C6B2F]'}`}>
                {printFeedback}
              </p>
            ) : null}
          </div>
        </div>

        <div className="w-full max-w-md space-y-3">
          <Button variant="primary" size="lg" className="w-full" onClick={() => void handlePrint()} disabled={isPrinting}>
            {isPrinting ? 'Imprimindo...' : 'Imprimir comprovante'}
          </Button>
          <Button variant="outline" size="lg" className="w-full" onClick={onFinish}>
            Voltar ao início
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
