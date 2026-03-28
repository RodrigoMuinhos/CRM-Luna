'use client';

import { Clock, User, UserCog, Plus, Edit2 } from 'lucide-react';
import { maskCPF } from '@/lib/cpf';
import { CalendarAppointment } from './useCalendarState';

type SelectedDayPanelProps = {
  selectedDate: string | null;
  selectedDateAppointments: CalendarAppointment[];
  isLoading: boolean;
  formatDisplayDate: (dateStr: string) => string;
  onOpenNew: () => void;
  onUpdateStatus?: (appointmentId: string, newStatus: string) => void;
  onTogglePayment?: (appointmentId: string, currentPaid: boolean) => void;
  onEditAppointment?: (appointmentId: string) => void;
};

export function SelectedDayPanel({
  selectedDate,
  selectedDateAppointments,
  isLoading,
  formatDisplayDate,
  onOpenNew,
  onUpdateStatus,
  onTogglePayment,
  onEditAppointment,
}: SelectedDayPanelProps) {
  const statusOptions = [
    { value: 'aguardando', label: 'Aguardando', color: 'bg-[#ECEDDE] text-gray-700' },
    { value: 'confirmado', label: 'Confirmado', color: 'bg-[#CDDCDC] text-gray-700' },
    { value: 'em-atendimento', label: 'Em atendimento', color: 'bg-[#D3A67F] text-white' },
    { value: 'cancelado', label: 'Cancelado', color: 'bg-[#CDB0AD] text-gray-700' },
  ];

  const getStatusColor = (status: string) => {
    const option = statusOptions.find((opt) => opt.value === status);
    return option?.color || 'bg-gray-100 text-gray-700';
  };

  const cycleStatus = (currentStatus: string) => {
    const currentIndex = statusOptions.findIndex((opt) => opt.value === currentStatus);
    const nextIndex = (currentIndex + 1) % statusOptions.length;
    return statusOptions[nextIndex].value;
  };

  const handleStatusClick = (appointmentId: string, currentStatus: string) => {
    if (onUpdateStatus) {
      const nextStatus = cycleStatus(currentStatus);
      onUpdateStatus(appointmentId, nextStatus);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-100">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-gray-800 text-sm sm:text-base">
          {selectedDate ? `Consultas de ${formatDisplayDate(selectedDate)}` : 'Selecione uma data no calendário'}
        </h2>
        {selectedDate && (
          <button
            onClick={onOpenNew}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#D3A67F] px-3 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#c99970]"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Novo Agendamento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        )}
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        {isLoading ? (
          <p className="text-gray-500 text-center py-4 text-sm">Carregando...</p>
        ) : !selectedDate ? (
          <p className="text-gray-500 text-center py-4 text-sm">Clique em uma data para ver os agendamentos</p>
        ) : selectedDateAppointments.length === 0 ? (
          <p className="text-gray-500 text-center py-4 text-sm">Nenhuma consulta para esta data</p>
        ) : (
          selectedDateAppointments.map((apt) => (
            <div key={apt.id} className="p-3 sm:p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={14} />
                  <span className="text-sm font-medium">{apt.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatusClick(apt.id, apt.status)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all cursor-pointer hover:scale-105 hover:shadow-md ${getStatusColor(
                      apt.status
                    )}`}
                    title="Clique para alternar status"
                  >
                    {apt.status}
                  </button>
                  {onEditAppointment && (
                    <button
                      onClick={() => onEditAppointment(apt.id)}
                      className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                      title="Editar agendamento"
                    >
                      <Edit2 size={16} className="text-[#D3A67F]" />
                    </button>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-500 mb-2">📅 {formatDisplayDate(apt.date)}</div>

              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <User size={14} className="text-gray-400" />
                  <span>{apt.patient}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <UserCog size={14} className="text-gray-400" />
                  <span>{apt.doctor}</span>
                </div>
                <div className="text-xs text-gray-500">CPF {maskCPF(apt.cpf)}</div>
              </div>

              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[#D3A67F] font-semibold text-sm">R$ {apt.amount.toFixed(2).replace('.', ',')}</span>
                <button
                  onClick={() => onTogglePayment && onTogglePayment(apt.id, apt.paid)}
                  className={`text-xs px-2 py-1 rounded-full cursor-pointer hover:scale-105 hover:shadow-md transition-all ${
                    apt.paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}
                  title="Clique para alternar status de pagamento"
                >
                  {apt.paid ? '✓ PAGO' : '⏳ PAGAMENTO PENDENTE'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
