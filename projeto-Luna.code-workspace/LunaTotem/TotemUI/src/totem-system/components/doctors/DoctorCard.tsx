'use client';

import { Mail, Phone, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { maskPhone } from '@/lib/phone';
import { Doctor } from '@/lib/api';

type DoctorCardProps = {
  doctor: Doctor;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
};

export function DoctorCard({ doctor, isExpanded, onToggle, onEdit }: DoctorCardProps) {
  return (
    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-full bg-[#D3A67F] flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            {(doctor.name || 'M').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium text-gray-800 truncate block">{doctor.name}</span>
            <span className="text-xs text-[#D3A67F] truncate">{doctor.specialty}</span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp size={18} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100 bg-gray-50/50">
          <div className="space-y-2 text-xs text-gray-600 pt-3">
            <div className="flex items-center gap-2">
              <Mail size={12} className="text-gray-400" />
              <span className="truncate" title={doctor.email}>
                {doctor.email}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={12} className="text-gray-400" />
              <span>{maskPhone(doctor.phone)}</span>
            </div>
            <div>CRM: {doctor.crm}</div>
            <div>Disponibilidade: {doctor.availability || 'Seg a Sex'}</div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-200 pt-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center justify-center rounded-lg border border-[#D3A67F]/50 p-2 text-[#D3A67F] hover:bg-[#D3A67F]/10 transition"
              aria-label="Editar médico"
              title="Editar médico"
            >
              <Pencil size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
