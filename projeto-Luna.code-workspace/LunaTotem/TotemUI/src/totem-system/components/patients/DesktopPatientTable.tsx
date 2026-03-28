'use client';

import { Mail, Phone } from 'lucide-react';
import ResponsiveTable from '@/components/ui/responsive-table';
import { maskCPF } from '@/lib/cpf';
import { maskPhone } from '@/lib/phone';
import { formatDate, type PatientRecord } from './types';

type DesktopPatientTableProps = {
  patients: PatientRecord[];
  onSelect: (patient: PatientRecord) => void;
};

export const DesktopPatientTable = ({ patients, onSelect }: DesktopPatientTableProps) => (
  <div className="hidden p-0 md:block">
    <ResponsiveTable
      data={patients}
      rowKey={(record) => record.id || record.cpf}
      columns={[
        {
          key: 'name',
          header: 'Nome',
          cell: (patient: PatientRecord) => (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CDDCDC] text-gray-700">
                {patient.name.charAt(0)}
              </div>
              <div>
                <div className="text-gray-800">{patient.name}</div>
                <div className="text-xs text-gray-500">CPF {maskCPF(patient.cpf)}</div>
              </div>
            </div>
          ),
        },
        {
          key: 'contact',
          header: 'Contato',
          cell: (patient: PatientRecord) => (
            <div className="space-y-0.5 text-sm text-gray-700">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail size={14} />
                {patient.email || '-'}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={14} />
                {maskPhone(patient.phone)}
              </div>
              <div className="text-xs text-gray-500">Nascimento {formatDate(patient.birthDate)}</div>
              <div className="text-xs text-gray-500">Convênio {patient.healthPlan || 'Particular'}</div>
            </div>
          ),
        },
        { key: 'last', header: 'Última Consulta', cell: (patient: PatientRecord) => patient.lastVisit },
        { key: 'next', header: 'Próxima Consulta', cell: (patient: PatientRecord) => patient.nextAppointment },
        {
          key: 'actions',
          header: 'Ações',
          cell: (patient: PatientRecord) => (
            <button type="button" onClick={() => onSelect(patient)} className="text-sm text-[#D3A67F] hover:text-[#c99970]">
              Ver detalhes
            </button>
          ),
        },
      ]}
    />
  </div>
);
