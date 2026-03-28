import { useState } from 'react';
import { PageContainer } from '../PageContainer';
import { ActionFooter } from '../ActionFooter';
import { FlowType, getFlowSteps } from '@/lib/flowSteps';

interface InstallmentSelectionProps {
  amount: number;
  maxInstallments?: number;
  onSelectInstallment: (installments: number) => void;
  onBack: () => void;
  flow?: FlowType;
}

export function InstallmentSelection({
  amount,
  maxInstallments = 12,
  onSelectInstallment,
  onBack,
  flow = 'payment',
}: InstallmentSelectionProps) {
  const [showInstallmentOptions, setShowInstallmentOptions] = useState(false);
  const safeMaxInstallments = Math.max(1, Math.min(12, Math.trunc(maxInstallments)));
  const installmentOptions = Array.from({ length: Math.max(0, safeMaxInstallments - 1) }, (_, i) => i + 2);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const steps = getFlowSteps(flow);
  const currentStep = flow === 'checkin' ? 3 : 1;

  return (
    <PageContainer steps={steps} currentStep={currentStep}>
      <div className="w-full flex flex-col items-center gap-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl text-[#D3A67F]">
            {showInstallmentOptions ? 'Selecione a quantidade de parcelas' : 'Crédito'}
          </h2>
          <p className="text-xl text-[#4A4A4A]/70">
            Total: {formatCurrency(amount)}
          </p>
          {showInstallmentOptions ? (
            <p className="text-sm text-[#4A4A4A]/60">
              Sem juros - até {safeMaxInstallments}x
            </p>
          ) : (
            <p className="text-sm text-[#4A4A4A]/60">
              Escolha entre pagamento à vista ou parcelado
            </p>
          )}
        </div>

        <div className="w-full max-w-2xl space-y-3 mb-24">
          {!showInstallmentOptions ? (
            <>
              <button
                onClick={() => onSelectInstallment(1)}
                className="w-full bg-white hover:bg-[#D3A67F] hover:text-white text-[#4A4A4A] rounded-2xl p-6 shadow-lg transition-all duration-200 active:scale-95 flex justify-between items-center group"
              >
                <span className="text-xl">
                  Crédito à vista
                </span>
                <span className="text-sm opacity-70">
                  1x de {formatCurrency(amount)}
                </span>
              </button>

              {safeMaxInstallments > 1 && (
                <button
                  onClick={() => setShowInstallmentOptions(true)}
                  className="w-full bg-white hover:bg-[#D3A67F] hover:text-white text-[#4A4A4A] rounded-2xl p-6 shadow-lg transition-all duration-200 active:scale-95 flex justify-between items-center group"
                >
                  <span className="text-xl">
                    Crédito parcelado
                  </span>
                  <span className="text-sm opacity-70">
                    Até {safeMaxInstallments}x sem juros
                  </span>
                </button>
              )}
            </>
          ) : (
            installmentOptions.map((installments) => {
              const installmentValue = amount / installments;
              return (
                <button
                  key={installments}
                  onClick={() => onSelectInstallment(installments)}
                  className="w-full bg-white hover:bg-[#D3A67F] hover:text-white text-[#4A4A4A] rounded-2xl p-6 shadow-lg transition-all duration-200 active:scale-95 flex justify-between items-center group"
                >
                  <span className="text-xl">
                    {installments}x de {formatCurrency(installmentValue)}
                  </span>
                  <span className="text-sm opacity-70">
                    Total: {formatCurrency(amount)}
                  </span>
                </button>
              );
            })
          )}
        </div>
        <ActionFooter
          onBack={() => {
            if (showInstallmentOptions) {
              setShowInstallmentOptions(false);
              return;
            }
            onBack();
          }}
          showConfirm={false}
        />
      </div>
    </PageContainer>
  );
}
