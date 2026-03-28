'use client';

import { Clock, User, UserCog } from 'lucide-react';
import { maskCPF } from '@/lib/cpf';
import { CalendarAppointment } from './useCalendarState';

type TodayPanelProps = {
  todayStr: string;
  todaysAppointments: CalendarAppointment[];
  formatDisplayDate: (dateStr: string) => string;
};

export function TodayPanel({ todayStr, todaysAppointments, formatDisplayDate }: TodayPanelProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#C2B5A2]">Hoje</p>
          <p className="text-lg text-gray-800 font-semibold">{formatDisplayDate(todayStr)}</p>
        </div>
        <span className="text-sm text-gray-500">
          {todaysAppointments.length} {todaysAppointments.length === 1 ? 'consulta' : 'consultas'}
        </span>
      </div>
      {todaysAppointments.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma consulta para hoje.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {todaysAppointments.map((apt) => (
            <div key={apt.id} className="rounded-xl border border-[#ECE6DF] bg-[#F8F6F1] p-3 shadow-sm">
              <div className="flex items-center justify-between text-sm text-gray-700">
                <span className="font-semibold text-[#D3A67F]">{apt.time}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-[#ECEDDE] text-gray-700">
                  {apt.status || 'Aguardando'}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-800 font-medium">{apt.patient}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <User size={12} /> {apt.doctor}
              </p>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Clock size={12} /> {apt.type || 'Consulta'}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">CPF {maskCPF(apt.cpf)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
