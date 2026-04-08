export type CanonicalStatus =
  | 'AGUARDANDO_CHEGADA'
  | 'AGUARDANDO_PAGAMENTO'
  | 'CONFIRMADA'
  | 'EM_ATENDIMENTO'
  | 'CONCLUIDO'
  | 'CANCELADA';

export const STATUS_SEQUENCE: CanonicalStatus[] = [
  'AGUARDANDO_CHEGADA',
  'CONFIRMADA',
  'EM_ATENDIMENTO',
  'CONCLUIDO',
  'CANCELADA',
];

const STATUS_LABELS: Record<CanonicalStatus, string> = {
  AGUARDANDO_CHEGADA: 'Aguardando chegada',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  CONFIRMADA: 'Confirmada',
  EM_ATENDIMENTO: 'Em atendimento',
  CONCLUIDO: 'Concluído',
  CANCELADA: 'Cancelada',
};

const STATUS_COLORS: Record<CanonicalStatus, string> = {
  AGUARDANDO_CHEGADA: 'bg-[#ECEDDE] text-gray-600',
  AGUARDANDO_PAGAMENTO: 'bg-[#F4E0CB] text-[#8B5E34]',
  CONFIRMADA: 'bg-[#CDDCDC] text-gray-700',
  EM_ATENDIMENTO: 'bg-[#D3A67F] text-white',
  CONCLUIDO: 'bg-[#DDEBD9] text-[#43624B]',
  CANCELADA: 'bg-[#CDB0AD] text-gray-700',
};

const STATUS_DOT_COLORS: Record<CanonicalStatus, string> = {
  AGUARDANDO_CHEGADA: 'bg-[#C9CDA8]',
  AGUARDANDO_PAGAMENTO: 'bg-[#D8A46B]',
  CONFIRMADA: 'bg-[#9BB7B7]',
  EM_ATENDIMENTO: 'bg-[#D3A67F]',
  CONCLUIDO: 'bg-[#7DA184]',
  CANCELADA: 'bg-[#B98580]',
};

export const APPOINTMENT_STATUS_OPTIONS = [
  { value: 'aguardando', label: 'Aguardando', canonical: 'AGUARDANDO_CHEGADA' },
  { value: 'confirmado', label: 'Confirmado', canonical: 'CONFIRMADA' },
  { value: 'em-atendimento', label: 'Em atendimento', canonical: 'EM_ATENDIMENTO' },
  { value: 'concluido', label: 'Concluído', canonical: 'CONCLUIDO' },
  { value: 'cancelado', label: 'Cancelado', canonical: 'CANCELADA' },
] as const;

function normalizeToken(raw: string) {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

export function normalizeStatus(raw?: string): CanonicalStatus {
  if (!raw) {
    return 'AGUARDANDO_CHEGADA';
  }

  const normalized = normalizeToken(raw);

  switch (normalized) {
    case 'AGUARDANDO':
    case 'AGENDADO':
    case 'AGENDADA':
    case 'SCHEDULED':
    case 'AGUARDANDO_CHEGADA':
      return 'AGUARDANDO_CHEGADA';
    case 'AGUARDANDO_PAGAMENTO':
    case 'AGUARDANDO_PAGTO':
      return 'AGUARDANDO_PAGAMENTO';
    case 'CONFIRMADO':
    case 'CONFIRMADA':
    case 'CONFIRMED':
      return 'CONFIRMADA';
    case 'EM_ATENDIMENTO':
    case 'IN_SERVICE':
    case 'IN-SERVICE':
      return 'EM_ATENDIMENTO';
    case 'CONCLUIDO':
    case 'CONCLUIDA':
    case 'FINALIZADO':
    case 'FINALIZADA':
    case 'FINALIZED':
    case 'FINISHED':
    case 'COMPLETED':
      return 'CONCLUIDO';
    case 'CANCELADO':
    case 'CANCELADA':
    case 'CANCELED':
      return 'CANCELADA';
    default:
      return 'AGUARDANDO_CHEGADA';
  }
}

export function getStatusBadgeClasses(raw?: string) {
  return STATUS_COLORS[normalizeStatus(raw)];
}

export function getStatusDotClasses(raw?: string) {
  return STATUS_DOT_COLORS[normalizeStatus(raw)];
}

export function getStatusLabel(raw?: string) {
  return STATUS_LABELS[normalizeStatus(raw)];
}

export function getStatusValue(raw?: string) {
  switch (normalizeStatus(raw)) {
    case 'AGUARDANDO_PAGAMENTO':
    case 'AGUARDANDO_CHEGADA':
      return 'aguardando';
    case 'CONFIRMADA':
      return 'confirmado';
    case 'EM_ATENDIMENTO':
      return 'em-atendimento';
    case 'CONCLUIDO':
      return 'concluido';
    case 'CANCELADA':
      return 'cancelado';
    default:
      return 'aguardando';
  }
}

export function getNextStatus(raw?: string): CanonicalStatus {
  const normalized = normalizeStatus(raw);
  const normalizedForSequence = normalized === 'AGUARDANDO_PAGAMENTO' ? 'AGUARDANDO_CHEGADA' : normalized;
  const index = STATUS_SEQUENCE.indexOf(normalizedForSequence);
  const nextIndex = index >= 0 ? (index + 1) % STATUS_SEQUENCE.length : 0;
  return STATUS_SEQUENCE[nextIndex];
}
