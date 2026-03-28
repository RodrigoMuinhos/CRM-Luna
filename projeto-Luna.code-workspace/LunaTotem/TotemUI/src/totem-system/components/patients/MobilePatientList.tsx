'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Mail, Phone } from 'lucide-react';
import { maskCPF } from '@/lib/cpf';
import { maskPhone } from '@/lib/phone';
import { formatDate, type PatientRecord } from './types';

type MobilePatientListProps = {
  patients: PatientRecord[];
  onSelect: (patient: PatientRecord) => void;
};

export const MobilePatientList = ({ patients, onSelect }: MobilePatientListProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (patients.length === 0) {
    return (
      <div className="p-3 md:hidden">
        <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-gray-500">
          Nenhum paciente encontrado — crie um novo paciente para começar.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 md:hidden">
      {patients.map((patient) => {
        const isExpanded = expandedId === patient.id;
        return (
          <div key={patient.id || patient.cpf} className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : patient.id)}
              className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-gray-50"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#D3A67F] text-sm font-medium text-white">
                  {patient.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-800">{patient.name}</span>
                  {patient.nextAppointment && patient.nextAppointment !== '-' && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-[#D3A67F]">
                      <Calendar size={10} />
                      Próxima: {patient.nextAppointment}
                    </span>
                  )}
                </div>
              </div>
              {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50/50 px-3 pb-3 pt-0">
                <div className="space-y-2 pt-3 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="text-gray-400" />
                    <span>{patient.email || '-'}</span>
                  </div>
                  <div>CPF {maskCPF(patient.cpf)}</div>
                  <div>Convênio: {patient.healthPlan || 'Particular'}</div>
                  <div>Nascimento: {formatDate(patient.birthDate)}</div>
                  <div>{patient.address || 'Endereço pendente'}</div>
                  {patient.notes && <div className="text-orange-600">Atenção: {patient.notes}</div>}
                  <div className="flex items-center gap-2 pt-1">
                    <Calendar size={12} className="text-gray-400" />
                    <span>Última: {patient.lastVisit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-[#D3A67F]" />
                    <span className="font-medium text-[#D3A67F]">Próxima: {patient.nextAppointment}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Phone size={12} />
                    {maskPhone(patient.phone)}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelect(patient)}
                    className="text-xs font-medium text-[#D3A67F] hover:text-[#c99970]"
                  >
                    Ver detalhes
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
