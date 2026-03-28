'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

type CalendarGridProps = {
  currentDate: Date;
  monthNames: string[];
  dayNames: string[];
  daysInMonth: number;
  startingDayOfWeek: number;
  isToday: (day: number) => boolean;
  selectedDate: string | null;
  formatDateStr: (day: number) => string;
  getAppointmentsForDate: (dateStr: string) => { time: string; patient: string }[];
  onSelectDay: (day: number) => void;
  previousMonth: () => void;
  nextMonth: () => void;
};

export function CalendarGrid({
  currentDate,
  monthNames,
  dayNames,
  daysInMonth,
  startingDayOfWeek,
  isToday,
  selectedDate,
  formatDateStr,
  getAppointmentsForDate,
  onSelectDay,
  previousMonth,
  nextMonth,
}: CalendarGridProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-gray-800 text-lg">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center py-1 sm:py-2 text-xs sm:text-sm text-gray-500">
            {day}
          </div>
        ))}

        {Array.from({ length: startingDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const dateStr = formatDateStr(day);
          const dayAppointments = getAppointmentsForDate(dateStr);
          const today = isToday(day);
          const isSelected = selectedDate === dateStr;

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`aspect-square border rounded-lg p-1 sm:p-2 transition-colors text-left ${
                isSelected
                  ? 'border-[#D3A67F] bg-[#D3A67F]/20 ring-2 ring-[#D3A67F]'
                  : today
                  ? 'border-[#D3A67F] bg-[#D3A67F]/5'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div
                className={`text-xs sm:text-sm mb-0.5 ${
                  isSelected || today ? 'text-[#D3A67F] font-semibold' : 'text-gray-700'
                }`}
              >
                {day}
              </div>
              {dayAppointments.length > 0 && (
                <div className="hidden sm:block space-y-0.5">
                  {dayAppointments.slice(0, 2).map((apt, idx) => (
                    <div
                      key={idx}
                      className="text-[10px] px-1 py-0.5 bg-[#D3A67F]/20 text-[#8C7155] rounded truncate font-medium"
                      title={`${apt.time} - ${apt.patient}`}
                    >
                      {apt.time}
                    </div>
                  ))}
                  {dayAppointments.length > 2 && (
                    <div className="text-[10px] text-gray-500">+{dayAppointments.length - 2}</div>
                  )}
                </div>
              )}
              {dayAppointments.length > 0 && (
                <div className="sm:hidden">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D3A67F] mx-auto mt-0.5" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
