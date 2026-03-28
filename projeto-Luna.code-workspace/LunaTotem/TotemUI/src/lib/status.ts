export type CanonicalStatus =
  | 'AGUARDANDO_CHEGADA'
  | 'AGUARDANDO_PAGAMENTO'
  | 'CONFIRMADA'
  | 'EM_ATENDIMENTO'
  | 'FINALIZADA'
  | 'CANCELADA';

export const STATUS_SEQUENCE: CanonicalStatus[] = [
  'AGUARDANDO_CHEGADA',
  'CONFIRMADA',
  'EM_ATENDIMENTO',
  'FINALIZADA',
  'CANCELADA',
];

const STATUS_LABELS: Record<CanonicalStatus, string> = {
  AGUARDANDO_CHEGADA: 'Aguardando chegada',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  CONFIRMADA: 'Confirmada',
  EM_ATENDIMENTO: 'Em atendimento',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

const STATUS_COLORS: Record<CanonicalStatus, string> = {
  AGUARDANDO_CHEGADA: 'bg-[#ECEDDE] text-gray-600',
  AGUARDANDO_PAGAMENTO: 'bg-[#F4E0CB] text-[#8B5E34]',
  CONFIRMADA: 'bg-[#CDDCDC] text-gray-700',
  EM_ATENDIMENTO: 'bg-[#D3A67F] text-white',
  FINALIZADA: 'bg-[#E3E8EF] text-gray-700',
  CANCELADA: 'bg-[#CDB0AD] text-gray-700',
};

export function normalizeStatus(raw?: string): CanonicalStatus {
  if (!raw) {
    return 'AGUARDANDO_CHEGADA';
  }

  const normalized = raw.trim().toUpperCase().replace(/[\s-]+/g, '_');

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
    case 'FINALIZADO':
    case 'FINALIZADA':
    case 'FINISHED':
      return 'FINALIZADA';
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

export function getStatusLabel(raw?: string) {
  return STATUS_LABELS[normalizeStatus(raw)];
}

export function getNextStatus(raw?: string): CanonicalStatus {
  const normalized = normalizeStatus(raw);
  const normalizedForSequence = normalized === 'AGUARDANDO_PAGAMENTO' ? 'AGUARDANDO_CHEGADA' : normalized;
  const index = STATUS_SEQUENCE.indexOf(normalizedForSequence);
  const nextIndex = index >= 0 ? (index + 1) % STATUS_SEQUENCE.length : 0;
  return STATUS_SEQUENCE[nextIndex];
}
