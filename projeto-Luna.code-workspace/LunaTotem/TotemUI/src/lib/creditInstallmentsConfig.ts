const STORAGE_KEY = 'lv_credit_installments_by_appointment';

function toSafeInstallments(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(12, Math.trunc(n)));
}

type InstallmentsMap = Record<string, number>;

function readMap(): InstallmentsMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as InstallmentsMap;
    if (!parsed || typeof parsed !== 'object') return {};
    const normalized: InstallmentsMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!key) continue;
      normalized[key] = toSafeInstallments(value);
    }
    return normalized;
  } catch {
    return {};
  }
}

function writeMap(map: InstallmentsMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage issues
  }
}

export function getAppointmentCreditInstallments(appointmentId?: string | null): number | null {
  if (!appointmentId) return null;
  const map = readMap();
  const value = map[appointmentId];
  if (value === undefined) return null;
  return toSafeInstallments(value);
}

export function setAppointmentCreditInstallments(appointmentId: string, installments: number): void {
  if (!appointmentId) return;
  const map = readMap();
  map[appointmentId] = toSafeInstallments(installments);
  writeMap(map);
}
