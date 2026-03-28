import { CalendarDays, CheckCircle, Clock, Loader2, User, UserCog } from 'lucide-react';
import { Appointment } from '@/lib/api';
import { maskCPF } from '@/lib/cpf';
import { getStatusLabel } from '@/lib/status';

type Props = {
  appointment: Appointment;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenDetails: () => void;
  onToggleTimer: () => void;
  formatCurrency: (value?: number) => string;
  formatDate: (value?: string) => string;
  getStatusColor: (status: string) => string;
  elapsedLabel: string;
  isRunning: boolean;
  canControlTimer: boolean;
  onStatusStep?: () => void;
  isStatusUpdating?: boolean;
};

export function AppointmentCard({
  appointment,
  isExpanded,
  onToggle,
  onOpenDetails,
  onToggleTimer,
  formatCurrency,
  formatDate,
  getStatusColor,
  elapsedLabel,
  isRunning,
  canControlTimer,
  onStatusStep,
  isStatusUpdating = false,
}: Props) {
  const appointmentId = appointment.id ?? '';
  const statusLabel = getStatusLabel(appointment.status);

  const renderStatusBadge = () => {
    const baseClass = `px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`;
    if (!onStatusStep) {
      return <span className={baseClass}>{statusLabel}</span>;
    }
    return (
      <button
        type="button"
        title="Clique para atualizar o status"
        disabled={isStatusUpdating}
        onClick={(event) => {
          event.stopPropagation();
          onStatusStep();
        }}
        className={`${baseClass} focus:outline-none focus:ring-2 focus:ring-[#D3A67F] focus:ring-offset-2 transition ${
          isStatusUpdating ? 'opacity-60 cursor-wait' : 'hover:opacity-95'
        }`}
      >
        {isStatusUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : statusLabel}
      </button>
    );
  };

  return (
    <article
      className={`bg-white rounded-lg border border-gray-100 p-4 sm:p-5 transition-shadow cursor-pointer ${
        isExpanded ? 'shadow-lg' : 'hover:shadow-md'
      }`}
      onClick={onToggle}
      aria-expanded={isExpanded}
    >
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-[#D3A67F]">
            <Clock size={16} />
            <span className="font-semibold text-gray-800">{appointment.time}</span>
          </div>
          {renderStatusBadge()}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <CalendarDays size={16} />
          <span>{formatDate(appointment.date)}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <User size={16} />
            <span>{appointment.patient}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <UserCog size={16} />
            <span>{appointment.doctor}</span>
          </div>
        </div>
      </header>

      <div className={`mt-4 space-y-3 ${isExpanded ? 'block' : 'hidden'}`}>
        <p className="text-xs text-gray-400">CPF {maskCPF(appointment.cpf)}</p>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{appointment.type}</span>
          <p className="font-semibold text-[#D3A67F]">{formatCurrency(appointment.amount)}</p>
        </div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#4A4A4A]">
          <CheckCircle size={16} className={appointment.paid ? 'text-[#4CAF50]' : 'text-[#D3A67F]'} />
          <span>{appointment.paid ? 'Pagamento confirmado' : 'Pagamento pendente'}</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 text-sm">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetails();
            }}
            className="flex-1 px-3 py-2 border border-[#D3A67F] text-[#D3A67F] rounded-lg hover:bg-[#D3A67F] hover:text-white transition-colors"
          >
            Detalhes
          </button>
          {canControlTimer && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onToggleTimer();
              }}
              className="flex-1 px-3 py-2 text-sm bg-[#D3A67F] text-white rounded-lg hover:bg-[#c99970] transition-colors"
            >
              {isRunning ? `Encerrar (${elapsedLabel})` : elapsedLabel !== '00:00' ? `Iniciar (${elapsedLabel})` : 'Iniciar'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
