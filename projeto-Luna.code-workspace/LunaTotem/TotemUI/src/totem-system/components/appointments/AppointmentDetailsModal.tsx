import { Trash2, X, Edit2 } from 'lucide-react';
import { Appointment } from '@/lib/api';
import { maskCPF } from '@/lib/cpf';
import { StatusSelect } from './StatusSelect';

type Props = {
  appointment: Appointment;
  onClose: () => void;
  onDelete: (appointmentId: string) => void;
  onEdit?: (appointmentId: string) => void;
  onStatusChange?: (appointmentId: string, newStatus: string) => void;
  formatCurrency: (value?: number) => string;
};

export function AppointmentDetailsModal({ appointment, onClose, onDelete, onEdit, onStatusChange, formatCurrency }: Props) {
  const handleDelete = () => {
    if (appointment.id) {
      onDelete(appointment.id);
    }
  };

  const handleEdit = () => {
    if (appointment.id && onEdit) {
      onEdit(appointment.id);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-3 sm:px-4">
      <div className="w-full max-w-[640px] sm:max-w-2xl rounded-[24px] sm:rounded-[28px] bg-white p-4 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm text-[#4A4A4A]/70">Detalhes da consulta</p>
            <h2 className="text-2xl sm:text-3xl text-[#D3A67F]">{appointment.patient}</h2>
          </div>
          <div className="flex items-center gap-2">
            <StatusSelect
              status={appointment.status}
              onChange={(value) => appointment.id && onStatusChange?.(appointment.id, value)}
              compact
            />
            {onEdit && (
              <button
                type="button"
                onClick={handleEdit}
                aria-label="Editar consulta"
                className="rounded-full border border-[#D3A67F] p-2 text-[#D3A67F] hover:bg-[#F9F6F2] transition"
              >
                <Edit2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Remover consulta"
              className="rounded-full border border-[#E0D5C9] p-2 text-[#D3A67F] hover:bg-[#F9F6F2] transition"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="text-gray-400 hover:text-gray-700 transition rounded-full p-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-[0.3em] sm:tracking-[0.5em]">Horário</p>
            <p className="text-xl sm:text-2xl text-gray-800">{appointment.time}</p>
            <p className="text-xs sm:text-sm text-gray-500">Data: {appointment.date}</p>
            <p className="text-xs sm:text-sm text-gray-500">Tipo: {appointment.type}</p>
            <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-[0.3em] sm:tracking-[0.5em]">Valor</p>
            <p className="text-xl sm:text-2xl text-[#D3A67F]">{formatCurrency(appointment.amount)}</p>
          </div>
          <div className="space-y-3">
            <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-[0.3em] sm:tracking-[0.5em]">Profissional</p>
            <p className="text-lg sm:text-xl text-gray-800">{appointment.doctor}</p>
            <p className="text-xs sm:text-sm text-gray-500">{appointment.specialty}</p>
            <p className="text-xs sm:text-sm text-gray-500">CPF {maskCPF(appointment.cpf)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
