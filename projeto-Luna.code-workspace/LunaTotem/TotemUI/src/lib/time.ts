export function formatTime24h(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const meridiemMatch = trimmed.match(/(AM|PM)$/i);
  let timePart = trimmed;
  let meridiem: string | null = null;

  if (meridiemMatch) {
    meridiem = meridiemMatch[1].toUpperCase();
    timePart = trimmed.slice(0, trimmed.toUpperCase().lastIndexOf(meridiem)).trim();
  }

  const numericPart = timePart.replace(/[^\d:]/g, '');
  const segments = numericPart.split(':');
  const hoursSegment = segments[0] ?? '0';
  const minutesSegment = segments[1] ?? '0';

  let hours = parseInt(hoursSegment, 10);
  const minutes = parseInt(minutesSegment ?? '0', 10);

  if (Number.isNaN(hours)) {
    return trimmed;
  }

  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }

  const safeMinutes = Number.isNaN(minutes) ? 0 : minutes;

  return `${String(hours).padStart(2, '0')}:${String(safeMinutes).padStart(2, '0')}`;
}
