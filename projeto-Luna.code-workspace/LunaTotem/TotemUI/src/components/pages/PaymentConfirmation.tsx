import { Card } from '../Card';
import { PageContainer } from '../PageContainer';
import { ActionFooter } from '../ActionFooter';
import { Appointment, PaymentMethod } from '../../types';
import { FlowType, getFlowSteps } from '@/lib/flowSteps';
import { CreditCard, QrCode, Wallet } from 'lucide-react';

interface PaymentConfirmationProps {
  appointment: Appointment;
  onSelectMethod: (method: PaymentMethod) => void;
  onBack: () => void;
  flow?: FlowType;
  creditOnlyAvista?: boolean;
  creditMaxInstallments?: number;
}

export function PaymentConfirmation({
  appointment,
  onSelectMethod,
  onBack,
  flow = 'payment',
  creditOnlyAvista = false,
  creditMaxInstallments = 12,
}: PaymentConfirmationProps) {
  const handleSelectPix = () => {
    onSelectMethod('pix');
  };

  const handleSelectCredit = () => {
    onSelectMethod('credit');
  };

  const handleSelectDebit = () => {
    onSelectMethod('debit');
  };
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
            Escolha a forma de pagamento
          </h2>
        </div>

        <Card className="w-full max-w-2xl">
          <div className="p-8 md:p-12 space-y-8">
            {/* Patient Info */}
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-[#D3A67F]/20 flex items-center justify-center flex-shrink-0">
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
              <div className="text-left">
                <h3 className="text-2xl text-[#D3A67F]">
                  {appointment.patient.name}
                </h3>
                <p className="text-[#4A4A4A]/70">
                  {appointment.doctor} - {appointment.specialty}
                </p>
              </div>
            </div>

            {/* Amount */}
            <div className="bg-gradient-to-br from-[#CDDCDC]/30 to-white rounded-2xl p-8 text-center">
              <p className="text-sm text-[#4A4A4A]/70 mb-2">Valor a pagar</p>
              <p className="text-5xl md:text-6xl text-[#D3A67F]">
                {formatCurrency(appointment.amount)}
              </p>
            </div>
          </div>
        </Card>


        {creditOnlyAvista ? (
          <div className="w-full max-w-2xl mb-24">
            <button
              type="button"
              onClick={handleSelectCredit}
              className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#D3A67F] bg-white px-6 py-8 text-[#D3A67F] transition hover:bg-[#F8F6F1] active:scale-95"
            >
              <CreditCard size={40} />
              <span className="text-base font-semibold">Cartão de Crédito</span>
              <span className="text-sm font-medium">À vista (sem parcelamento)</span>
            </button>
          </div>
        ) : (
          <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-24">
            <button
              type="button"
              onClick={handleSelectPix}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#D3A67F] bg-white px-6 py-6 text-[#D3A67F] transition hover:bg-[#F8F6F1] active:scale-95"
            >
              <QrCode size={36} />
              <span className="text-sm font-medium">PIX</span>
            </button>
            <button
              type="button"
              onClick={handleSelectCredit}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#D3A67F] bg-white px-6 py-6 text-[#D3A67F] transition hover:bg-[#F8F6F1] active:scale-95"
            >
              <CreditCard size={36} />
              <span className="text-sm font-medium">Crédito</span>
            </button>
            <button
              type="button"
              onClick={handleSelectDebit}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#D3A67F] bg-white px-6 py-6 text-[#D3A67F] transition hover:bg-[#F8F6F1] active:scale-95"
            >
              <Wallet size={36} />
              <span className="text-sm font-medium">Débito</span>
            </button>
          </div>
        )}
        <ActionFooter onBack={onBack} showConfirm={false} />
      </div>
    </PageContainer>
  );
}
