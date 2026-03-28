import { Button } from '../Button';
import { Card } from '../Card';
import { PageContainer } from '../PageContainer';
import { ActionFooter } from '../ActionFooter';
import { Appointment } from '../../types';
import { maskCPFWithHiddenCenter } from '@/lib/cpf';
import { getFlowSteps } from '@/lib/flowSteps';
import { formatTime24h } from '@/lib/time';

interface PaymentDecisionProps {
  appointment: Appointment;
  onAwait: () => void;
  onProceed: () => void;
  onBack: () => void;
  mode?: 'checkin' | 'payment';
}

export function PaymentDecision({
  appointment,
  onAwait,
  onProceed,
  onBack,
  mode = 'payment',
}: PaymentDecisionProps) {
  const flow = mode === 'checkin' ? 'checkin' : 'payment';
  const steps = getFlowSteps(flow);
  const currentStep = flow === 'checkin' ? 3 : 1;

  return (
    <PageContainer steps={steps} currentStep={currentStep}>
      <div className="w-full flex flex-col items-center gap-8">
        <div className="text-center space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-[#D3A67F]/70">
            Consulta confirmada
          </p>
          <h2 className="text-3xl md:text-4xl text-[#D3A67F]">
            Como deseja prosseguir?
          </h2>
          <p className="text-lg text-[#4A4A4A]/70 max-w-2xl mx-auto">
            {mode === 'checkin'
              ? 'Você pode aguardar pelo atendimento ou adiantar o pagamento agora mesmo.'
              : 'Escolha entre aguardar seu horário ou seguir para o pagamento no totem.'}
          </p>
        </div>

        <Card className="w-full max-w-2xl">
          <div className="p-8 md:p-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-left">
              <div>
                <p className="text-sm text-[#4A4A4A]/70 mb-1">Paciente</p>
                <h3 className="text-2xl text-[#D3A67F]">{appointment.patient.name}</h3>
                <p className="text-[#4A4A4A]/70">
                  CPF {maskCPFWithHiddenCenter(appointment.patient.cpf ?? appointment.cpf ?? '')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#4A4A4A]/70 mb-1">Profissional</p>
                <p className="text-lg text-[#D3A67F]">{appointment.doctor}</p>
                <p className="text-sm text-[#4A4A4A]/70">{appointment.specialty}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-center">
              <div className="space-y-1 rounded-2xl bg-[#F8F6F1] p-4">
                <p className="text-sm text-[#4A4A4A]/60">Data</p>
                <p className="text-xl text-[#D3A67F]">{appointment.date}</p>
              </div>
              <div className="space-y-1 rounded-2xl bg-[#F8F6F1] p-4">
                <p className="text-sm text-[#4A4A4A]/60">Horário</p>
                <p className="text-xl text-[#D3A67F]">{formatTime24h(appointment.time)}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="w-full max-w-2xl space-y-4">
          <Button
            variant="ghost"
            size="xl"
            onClick={onAwait}
            className="w-full border border-[#D3A67F] text-[#D3A67F] hover:bg-[#F8F6F1]"
          >
            Aguardar atendimento
          </Button>
          <Button variant="primary" size="xl" onClick={onProceed} className="w-full">
            Ir para pagamento
          </Button>
        </div>

        <ActionFooter onBack={onBack} showConfirm={false} />
      </div>
    </PageContainer>
  );
}
