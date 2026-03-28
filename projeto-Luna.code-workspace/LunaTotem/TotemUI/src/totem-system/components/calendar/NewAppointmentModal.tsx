'use client';

import { X } from 'lucide-react';
import { maskCPF } from '@/lib/cpf';
import { Doctor, Patient } from '@/lib/api';

type NewAppointmentModalProps = {
  selectedDate: string;
  show: boolean;
  onClose: () => void;
  patientSearch: string;
  onPatientSearch: (value: string) => void;
  patientSuggestions: Patient[];
  onSelectPatient: (patient: Patient) => void;
  doctors: Doctor[];
  onDoctorChange: (value: string) => void;
  newAppointment: {
    date: string;
    time: string;
    doctor: string;
    specialty: string;
    type: string;
    amount: string;
    cpf: string;
    patientEmail: string;
  };
  onNewAppointmentChange: (updater: (prev: NewAppointmentModalProps['newAppointment']) => typeof prev) => void;
  onCreate: () => void;
  formatDisplayDate: (dateStr: string) => string;
  isEditing?: boolean;
};

export function NewAppointmentModal({
  selectedDate,
  show,
  onClose,
  patientSearch,
  onPatientSearch,
  patientSuggestions,
  onSelectPatient,
  doctors,
  onDoctorChange,
  newAppointment,
  onNewAppointmentChange,
  onCreate,
  formatDisplayDate,
  isEditing = false,
}: NewAppointmentModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Novo Agendamento - {formatDisplayDate(selectedDate)}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => onPatientSearch(e.target.value)}
              placeholder="Buscar paciente..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D3A67F]"
            />
            {patientSuggestions.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {patientSuggestions.map((patient) => (
                  <li
                    key={patient.id}
                    onClick={() => onSelectPatient(patient)}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    {patient.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
            <input
              type="text"
              value={maskCPF(newAppointment.cpf)}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Médico *</label>
            <select
              value={newAppointment.doctor}
              onChange={(e) => onDoctorChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D3A67F]"
            >
              <option value="">Selecione...</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.name}>
                  {doc.name} - {doc.specialty}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horário *</label>
            <input
              type="time"
              value={newAppointment.time}
              onChange={(e) =>
                onNewAppointmentChange((prev) => ({
                  ...prev,
                  time: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D3A67F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={newAppointment.type}
              onChange={(e) =>
                onNewAppointmentChange((prev) => ({
                  ...prev,
                  type: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D3A67F]"
            >
              <option value="Consulta">Consulta</option>
              <option value="Retorno">Retorno</option>
              <option value="Exame">Exame</option>
              <option value="Procedimento">Procedimento</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              value={newAppointment.amount}
              onChange={(e) =>
                onNewAppointmentChange((prev) => ({
                  ...prev,
                  amount: e.target.value,
                }))
              }
              placeholder="0,00"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D3A67F]"
            />
          </div>
        </div>

        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={onCreate}
            className="flex-1 px-4 py-2 bg-[#D3A67F] text-white rounded-lg text-sm font-medium hover:bg-[#c99970]"
          >
            {isEditing ? 'Atualizar' : 'Criar'} Agendamento
          </button>
        </div>
      </div>
    </div>
  );
}
