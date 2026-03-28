import { Button } from '../Button';
import { Card } from '../Card';
import { PageContainer } from '../PageContainer';
import { ActionFooter } from '../ActionFooter';
import { Appointment } from '../../types';
import { maskCPFWithHiddenCenter } from '@/lib/cpf';
import { getFlowSteps } from '@/lib/flowSteps';
import { formatTime24h } from '@/lib/time';

interface PatientConfirmationProps {
  appointment: Appointment;
  onConfirm: () => void;
  onBack: () => void;
}

export function PatientConfirmation({
  appointment,
  onConfirm,
  onBack,
}: PatientConfirmationProps) {
  // Formatar data para exibição legível
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Formatar hora (HH:MM)
  const formatTime = (time: string): string => formatTime24h(time);

  // Mapear status para texto amigável e cor
  const getStatusDisplay = (status: string): { text: string; color: string } => {
    const statusUpper = status.toUpperCase();
    
    if (statusUpper === 'AGUARDANDO_CHEGADA') {
      return { text: 'Aguardando chegada', color: 'bg-yellow-100 text-yellow-800' };
    } else if (statusUpper === 'CONFIRMADA') {
      return { text: 'Confirmada', color: 'bg-green-100 text-green-800' };
    } else if (statusUpper === 'AGUARDANDO_PAGAMENTO') {
      return { text: 'Aguardando pagamento', color: 'bg-orange-100 text-orange-800' };
    } else if (statusUpper === 'EM_ATENDIMENTO') {
      return { text: 'Em atendimento', color: 'bg-blue-100 text-blue-800' };
    } else if (statusUpper === 'FINALIZADA') {
      return { text: 'Finalizada', color: 'bg-gray-100 text-gray-800' };
    } else if (statusUpper === 'CANCELADA') {
      return { text: 'Cancelada', color: 'bg-red-100 text-red-800' };
    } else if (statusUpper === 'SCHEDULED' || statusUpper === 'AGENDADO') {
      return { text: 'Agendado', color: 'bg-blue-100 text-blue-800' };
    } else {
      return { text: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const statusDisplay = getStatusDisplay(appointment.status);

  return (
    <PageContainer showLogo={false} steps={getFlowSteps('checkin')} currentStep={2}>
      <div className="w-full flex flex-col items-center gap-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl text-[#D3A67F]">
            Confirme seus dados
          </h2>
          <p className="text-lg text-[#4A4A4A]/70">
            Verifique as informações da sua consulta
          </p>
        </div>

        <Card className="w-full max-w-2xl">
          <div className="p-8 md:p-12 space-y-8 bg-gradient-to-br from-[#CDDCDC]/30 to-white rounded-2xl">
            {/* Patient Avatar */}
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-[#D3A67F]/20 flex items-center justify-center">
                <svg
                  width="48"
                  height="48"
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
            </div>

            {/* Patient Info */}
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl md:text-3xl text-[#D3A67F] mb-2">
                  {appointment.patient.name}
                </h3>
                <p className="text-[#4A4A4A]/70">
                  CPF: {maskCPFWithHiddenCenter(appointment.patient.cpf)}
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 space-y-5">
                {/* Data e Horário */}
                <div className="flex items-start gap-3">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#D3A67F"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0 mt-1"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-[#4A4A4A]/70">Data e horário</p>
                    <p className="text-lg text-[#4A4A4A] capitalize">
                      {formatDate(appointment.date)}
                    </p>
                    <p className="text-lg font-semibold text-[#D3A67F]">
                      às {formatTime(appointment.time)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-100"></div>

                {/* Profissional */}
                <div className="flex items-start gap-3">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#D3A67F"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0 mt-1"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-[#4A4A4A]/70">Profissional</p>
                    <p className="text-lg text-[#4A4A4A]">
                      {appointment.doctor}
                    </p>
                    <p className="text-sm text-[#4A4A4A]/70">
                      {appointment.specialty}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-100"></div>

                {/* Status */}
                <div className="flex items-start gap-3">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#D3A67F"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0 mt-1"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-[#4A4A4A]/70">Status da consulta</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-1 ${statusDisplay.color}`}>
                      {statusDisplay.text}
                    </span>
                  </div>
                </div>

                {/* Valor (se não pago) */}
                {!appointment.paid && appointment.amount > 0 && (
                  <>
                    <div className="border-t border-gray-100"></div>
                    <div className="flex items-start gap-3">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#D3A67F"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="flex-shrink-0 mt-1"
                      >
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm text-[#4A4A4A]/70">Valor da consulta</p>
                        <p className="text-lg font-semibold text-[#4A4A4A]">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(appointment.amount)}
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                          Pagamento pendente
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Mensagem e ações baseadas no status */}
        {appointment.status === 'CONFIRMADA' && (
          <div className="w-full max-w-2xl bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
            <p className="text-lg text-green-800 font-semibold">
              ✅ Consulta já confirmada!
            </p>
            <p className="text-green-700 mt-2">
              Aguarde ser chamado(a) pelo profissional.
            </p>
          </div>
        )}

        {appointment.status === 'EM_ATENDIMENTO' && (
          <div className="w-full max-w-2xl bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
            <p className="text-lg text-blue-800 font-semibold">
              🩺 Seu atendimento já iniciou
            </p>
            <p className="text-blue-700 mt-2">
              Dirija-se ao consultório indicado.
            </p>
          </div>
        )}

        {appointment.status === 'AGUARDANDO_PAGAMENTO' && (
          <div className="w-full max-w-2xl bg-orange-50 border-2 border-orange-200 rounded-xl p-6 text-center">
            <p className="text-lg text-orange-800 font-semibold">
              💳 Pagamento necessário
            </p>
            <p className="text-orange-700 mt-2">
              Por favor, realize o pagamento para confirmar sua consulta.
            </p>
          </div>
        )}

        <ActionFooter
          onBack={onBack}
          onConfirm={onConfirm}
          confirmLabel={appointment.status === 'AGUARDANDO_CHEGADA' ? 'Confirmar Presença' : 'Próximo'}
          showConfirm={true}
        />
      </div>
    </PageContainer>
  );
}


