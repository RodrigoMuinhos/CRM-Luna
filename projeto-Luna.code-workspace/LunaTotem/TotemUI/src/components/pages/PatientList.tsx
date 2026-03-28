import { useEffect, useState } from 'react';
import { Button } from '../Button';
import { Card } from '../Card';
import { PageContainer } from '../PageContainer';
import { ActionFooter } from '../ActionFooter';
import { Appointment } from '../../types';
import { getFlowSteps } from '@/lib/flowSteps';
import { formatTime24h } from '@/lib/time';

interface PatientListProps {
  appointments: Appointment[];
  onSelectPatient: (appointment: Appointment) => void;
  onNotFound: () => void;
  onBack: () => void;
  isPaymentFlow?: boolean;
}

export function PatientList({
  appointments,
  onSelectPatient,
  onNotFound,
  onBack,
  isPaymentFlow = false,
}: PatientListProps) {
  const steps = getFlowSteps(isPaymentFlow ? 'payment' : 'checkin');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 6;

  useEffect(() => {
    setCurrentPage(0);
  }, [appointments]);

  const totalPages = Math.ceil(appointments.length / itemsPerPage);
  const currentAppointments = appointments.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage,
  );

  useEffect(() => {
    if (totalPages === 0) {
      setCurrentPage(0);
      return;
    }
    if (currentPage > totalPages - 1) {
      setCurrentPage(Math.max(totalPages - 1, 0));
    }
  }, [currentPage, totalPages]);

  return (
    <PageContainer steps={steps} currentStep={1}>
      <div className="w-full flex flex-col items-center gap-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl text-[#D3A67F]">
            {isPaymentFlow ? 'Encontre seu nome para pagamento' : 'Encontre seu nome na lista'}
          </h2>
          <p className="text-lg text-[#4A4A4A]/70">
            {isPaymentFlow
              ? 'Pagamentos já realizados não serão exibidos'
              : 'Check-ins já realizados não serão exibidos'}
          </p>
        </div>

        {appointments.length === 0 ? (
          <div className="w-full max-w-3xl text-center space-y-6">
            <p className="text-xl text-[#4A4A4A]/70">
              Nenhum agendamento disponível para esta letra
            </p>
            <div className="flex flex-col items-center gap-3 w-full">
              <Button
                variant="primary"
                onClick={onBack}
                className="w-full rounded-2xl bg-[#D3A67F] px-6 py-4 text-lg font-semibold text-white shadow-lg hover:bg-[#C79268]"
              >
                Voltar
              </Button>
              <Button variant="outline" onClick={onNotFound} className="w-full rounded-2xl px-6 py-4">
                Não encontrei meu nome
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentAppointments.map((appointment) => (
                <Card key={appointment.id} onClick={() => onSelectPatient(appointment)}>
                  <div className="p-6 flex flex-col gap-3">
                    <h3 className="text-xl text-[#D3A67F]">
                      {appointment.patient.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[#4A4A4A]/70">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{formatTime24h(appointment.time)}</span>
                    </div>
                    <p className="text-sm text-[#4A4A4A]/70">{appointment.doctor}</p>
                  </div>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="w-12 h-12 rounded-full bg-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#D3A67F] hover:text-white transition-all duration-200 flex items-center justify-center text-[#D3A67F]"
                >
                  ←
                </button>
                <span className="text-[#4A4A4A]/70">
                  Página {currentPage + 1} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="w-12 h-12 rounded-full bg-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#D3A67F] hover:text-white transition-all duration-200 flex items-center justify-center text-[#D3A67F]"
                >
                  →
                </button>
              </div>
            )}

            <div className="flex flex-col gap-4 mt-4 mb-24">
              <Button variant="outline" onClick={onNotFound}>
                Não encontrei meu nome
              </Button>
            </div>

            <ActionFooter onBack={onBack} showConfirm={false} />
          </>
        )}
      </div>
    </PageContainer>
  );
}
