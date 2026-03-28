// API Configuration (normalize NEXT_PUBLIC_API_URL)
function normalizeBaseUrl(input?: string): string {
  let url = (input || '').trim();
  // Support same-origin relative API base.
  // If caller passes '/' or any relative path, treat it as "no base" so endpoints become '/api/...'.
  // This is useful when a reverse proxy (nginx) or Next rewrites proxy /api to the backend.
  if (url === '/' || url.startsWith('/')) return '';
  if (!url) return '';
  // Add protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  // Remove trailing slash
  url = url.replace(/\/$/, '');
  return url;
}

function getRuntimeApiBaseUrlFromElectron(): string | null {
  if (typeof window === 'undefined') return null;
  const anyWin = window as any;

  // Primary: explicit base URL provided by Electron preload.
  const direct = String(anyWin?.lunaKiosk?.api?.totemApiBaseUrl || '').trim();
  if (direct) return direct;

  // Secondary: derive from exposed port.
  const portRaw = anyWin?.lunaKiosk?.ports?.totemapi;
  const port = Number.parseInt(String(portRaw || ''), 10);
  if (Number.isFinite(port)) {
    return `http://localhost:${port}`;
  }

  return null;
}

function getRuntimeLunaCoreBaseUrlFromElectron(): string | null {
  if (typeof window === 'undefined') return null;
  const anyWin = window as any;

  const direct = String(anyWin?.lunaKiosk?.api?.lunacoreBaseUrl || '').trim();
  if (direct) return direct;

  const portRaw = anyWin?.lunaKiosk?.ports?.lunacore;
  const port = Number.parseInt(String(portRaw || ''), 10);
  if (Number.isFinite(port)) {
    return `http://localhost:${port}`;
  }

  return null;
}

function getRuntimePrintTerminalIdFromElectron(): string | null {
  if (typeof window === 'undefined') return null;
  const anyWin = window as any;

  const runtimeTerminal = String(anyWin?.lunaKiosk?.runtime?.terminalId || '').trim();
  if (runtimeTerminal) return runtimeTerminal;

  const legacyTerminal = String(anyWin?.lunaKiosk?.terminalId || '').trim();
  if (legacyTerminal) return legacyTerminal;

  return null;
}

// The UI expects a single "API base" that exposes all /api/* endpoints.
// In this repo, TotemAPI (8081) is the facade that exposes appointments/patients/users/payments.
// LunaCore (8080) does NOT expose /api/payments, which breaks PIX QR generation in kiosk.
// Prefer the TotemAPI URL when available.
const preferredApiUrl =
  getRuntimeApiBaseUrlFromElectron() ||
  process.env.NEXT_PUBLIC_LUNATOTEM_API_URL ||
  process.env.NEXT_PUBLIC_API_URL;

export const API_BASE_URL = normalizeBaseUrl(preferredApiUrl);

const preferredPrintTerminalId =
  getRuntimePrintTerminalIdFromElectron() ||
  process.env.NEXT_PUBLIC_PRINT_TERMINAL_ID ||
  'TOTEM-001';

export const PRINT_TERMINAL_ID = String(preferredPrintTerminalId || 'TOTEM-001').trim() || 'TOTEM-001';
export const PRINT_TENANT_ID = String(process.env.NEXT_PUBLIC_PRINT_TENANT_ID || '').trim() || null;

function readTenantIdFromJwt(token: string | null | undefined): string | null {
  const raw = String(token || '').trim();
  if (!raw) return null;

  const parts = raw.split('.');
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64 + '='.repeat((4 - (base64.length % 4 || 4)) % 4);
    const json = atob(normalized);
    const claims = JSON.parse(json);
    const tenantId = String(claims?.tenantId || '').trim();
    return tenantId || null;
  } catch {
    return null;
  }
}

export function resolvePrintTenantId(token?: string | null): string {
  const fromEnv = String(PRINT_TENANT_ID || '').trim();
  if (fromEnv) return fromEnv;

  const fromJwt = readTenantIdFromJwt(token);
  if (fromJwt) return fromJwt;

  if (typeof window !== 'undefined') {
    const fromStorage = String(window.localStorage.getItem('lv_tenant_id') || '').trim();
    if (fromStorage) return fromStorage;
  }

  // Local fallback keeps kiosk print flows functional in single-tenant setup.
  return 'tenant-1';
}

// Auth lives on LunaCore (not TotemAPI). Keep a separate base for /api/auth/*.
const preferredLunaCoreUrl =
  getRuntimeLunaCoreBaseUrlFromElectron() ||
  process.env.NEXT_PUBLIC_LUNACORE_URL ||
  process.env.NEXT_PUBLIC_LUNACORE_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  API_BASE_URL ||
  '/';

export const LUNACORE_BASE_URL = normalizeBaseUrl(preferredLunaCoreUrl);

// Log configuration on load
if (typeof window !== 'undefined') {
  console.log('[API CONFIG] Base URL:', API_BASE_URL);
  console.log('[API CONFIG] LunaCore Base URL:', LUNACORE_BASE_URL);
  console.log('[API CONFIG] NEXT_PUBLIC_API_URL env:', process.env.NEXT_PUBLIC_API_URL);
  console.log('[API CONFIG] NEXT_PUBLIC_LUNATOTEM_API_URL env:', process.env.NEXT_PUBLIC_LUNATOTEM_API_URL);
  console.log('[API CONFIG] lunaKiosk.api.totemApiBaseUrl:', (window as any)?.lunaKiosk?.api?.totemApiBaseUrl);
  console.log('[API CONFIG] lunaKiosk.api.lunacoreBaseUrl:', (window as any)?.lunaKiosk?.api?.lunacoreBaseUrl);
  console.log('[API CONFIG] Print terminal ID:', PRINT_TERMINAL_ID);
}

export const API_ENDPOINTS = {
  // Appointments
  appointments: `${API_BASE_URL}/api/appointments`,
  appointmentById: (id: string) => `${API_BASE_URL}/api/appointments/${id}`,
  appointmentStatus: (id: string) => `${API_BASE_URL}/api/appointments/${id}/status`,
  appointmentPaid: (id: string) => `${API_BASE_URL}/api/appointments/${id}/paid`,
  appointmentPhoto: (id: string) => `${API_BASE_URL}/api/appointments/${id}/photo`,
  appointmentReport: (id: string) => `${API_BASE_URL}/api/appointments/${id}/report`,
  appointmentNotify: (id: string) => `${API_BASE_URL}/api/appointments/${id}/notify`,
  appointmentUpcoming: `${API_BASE_URL}/api/appointments/upcoming`,
  appointmentSearch: (q: string) => `${API_BASE_URL}/api/appointments/search?q=${encodeURIComponent(q)}`,
  appointmentUnpaidSearch: (q: string) => `${API_BASE_URL}/api/appointments/unpaid/search?q=${encodeURIComponent(q)}`,
  
  // Doctors
  doctors: `${API_BASE_URL}/api/doctors`,
  doctorById: (id: string) => `${API_BASE_URL}/api/doctors/${id}`,
  
  // Patients
  patients: `${API_BASE_URL}/api/patients`,
  patientById: (id: string) => `${API_BASE_URL}/api/patients/${id}`,
  patientByCpf: (cpf: string) => `${API_BASE_URL}/api/patients/cpf/${cpf}`,

  // Users
  users: `${API_BASE_URL}/api/users`,
  userById: (id: string | number) => `${API_BASE_URL}/api/users/${id}`,
  
  // Payments
  payments: `${API_BASE_URL}/api/payments`,
  paymentsPix: `${API_BASE_URL}/api/payments/pix`,
  paymentStatus: (paymentId: string) => `${API_BASE_URL}/api/payments/status/${encodeURIComponent(paymentId)}`,
  
  // Dashboard
  dashboardSummary: `${API_BASE_URL}/api/dashboard/summary`, // basic (sanitized)
  dashboardSummaryFull: `${API_BASE_URL}/api/dashboard/summary/full`, // admin only

  // Auth
  authLogin: `${LUNACORE_BASE_URL}/api/auth/login`,
  authRegister: `${LUNACORE_BASE_URL}/api/auth/register`,
  
  // Health Check
  health: `${API_BASE_URL}/actuator/health`,
};

// API Client Configuration
export const apiConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
};

// Auth token (JWT) holder - updated after login
export let authToken: string | null = null;
export let authRole: string | null = null;

// LocalStorage keys used by auth.
// Keep these centralized so we don't accidentally diverge between login, refresh, and logout.
export const AUTH_STORAGE_KEYS = {
  token: 'lv_token',
  role: 'lv_role',
  refresh: 'lv_refresh',
  // Raw/un-normalized role as returned by the backend (e.g. OWNER / ADMIN_MASTER).
  // This is used for UI-gating "Admin Master" features without breaking existing role checks.
  roleRaw: 'lv_role_raw',
  email: 'lv_email',
} as const;

export function normalizeRole(role?: string | null): string | null {
  const normalized = (role || '').trim().toUpperCase();
  if (!normalized) return null;
  switch (normalized) {
    case 'OWNER':
    case 'ADMIN':
    case 'ADMINISTRACAO':
    case 'FINANCE':
    case 'FINANCEIRO':
      return 'ADMINISTRACAO';
    case 'RECEPTION':
    case 'RECEPCAO':
      return 'RECEPCAO';
    case 'DOCTOR':
    case 'MEDICO':
      return 'MEDICO';
    default:
      return normalized;
  }
}

export function setAuth(token: string | null, role: string | null) {
  authToken = token;
  authRole = normalizeRole(role);
}

export function clearAuth() {
  authToken = null;
  authRole = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_STORAGE_KEYS.token);
    localStorage.removeItem(AUTH_STORAGE_KEYS.role);
    localStorage.removeItem(AUTH_STORAGE_KEYS.refresh);
    localStorage.removeItem(AUTH_STORAGE_KEYS.roleRaw);
    localStorage.removeItem(AUTH_STORAGE_KEYS.email);
  }
}

export function getStoredAuthEmail(): string | null {
  if (typeof window === 'undefined') return null;
  const email = window.localStorage.getItem(AUTH_STORAGE_KEYS.email);
  return email ? String(email).trim() : null;
}

export function getStoredRawRole(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEYS.roleRaw);
  return raw ? String(raw).trim() : null;
}

export function isAdminMasterRole(rawRole?: string | null): boolean {
  const normalized = String(rawRole ?? '').trim().toUpperCase();
  if (!normalized) return false;

  // Support common naming variants.
  // We keep this permissive because different deployments may call the same concept differently.
  return (
    normalized === 'OWNER' ||
    normalized === 'ADMIN_MASTER' ||
    normalized === 'MASTER' ||
    normalized === 'SUPERADMIN' ||
    normalized === 'SUPER_ADMIN'
  );
}

export function isAdminMaster(): boolean {
  return isAdminMasterRole(getStoredRawRole());
}

export async function ensureFreshToken() {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem('lv_token');
  const refresh = localStorage.getItem('lv_refresh');
  if (!token && refresh) {
    // Attempt silent refresh (only if token missing; simplistic strategy)
    try {
      const res = await fetch(`${LUNACORE_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('lv_token', data.token);
        localStorage.setItem('lv_refresh', data.refreshToken);
        setAuth(data.token, localStorage.getItem('lv_role'));
      } else if (res.status === 400 || res.status === 401) {
        clearAuth();
      }
    } catch {
      // ignore
    }
  }
}
