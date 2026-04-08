'use client';

import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { APPOINTMENT_STATUS_OPTIONS, getStatusBadgeClasses, getStatusDotClasses, getStatusValue } from '@/lib/status';

type StatusSelectProps = {
  status: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
};

export function StatusSelect({
  status,
  onChange,
  disabled = false,
  className = '',
  compact = false,
}: StatusSelectProps) {
  const selectedValue = getStatusValue(status);
  const selectedOption = APPOINTMENT_STATUS_OPTIONS.find((option) => option.value === selectedValue) ?? APPOINTMENT_STATUS_OPTIONS[0];

  return (
    <Select value={selectedValue} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        size={compact ? 'sm' : 'default'}
        className={`rounded-full border-0 shadow-none ring-0 focus-visible:ring-0 focus-visible:border-transparent ${
          compact ? 'h-8 min-w-[154px] px-3 text-xs' : 'h-9 min-w-[170px] px-3.5 text-sm'
        } ${getStatusBadgeClasses(status)} ${className}`}
      >
        <span className="flex items-center gap-2">
          <span className={`inline-block rounded-full ${compact ? 'size-2.5' : 'size-3'} ${getStatusDotClasses(status)}`} />
          <span className="font-medium">{selectedOption.label}</span>
        </span>
      </SelectTrigger>
      <SelectContent className="min-w-[220px] rounded-2xl border border-[#EADFD4] bg-white p-2 shadow-[0_18px_45px_rgba(63,42,24,0.12)]">
        {APPOINTMENT_STATUS_OPTIONS.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="rounded-xl px-3 py-2.5 text-sm text-[#4A4A4A] focus:bg-[#F8F2EB] focus:text-[#2F2F2F]"
          >
            <span className="flex items-center gap-3">
              <span className={`inline-block size-3 rounded-full ${getStatusDotClasses(option.value)}`} />
              <span>{option.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
