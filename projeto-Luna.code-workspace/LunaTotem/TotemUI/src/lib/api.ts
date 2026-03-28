import { API_BASE_URL, API_ENDPOINTS, apiConfig, authToken } from './apiConfig';

// Types
export interface Patient {
  id?: string;
  name: string;
  cpf: string;
  phone: string;
  email?: string;
  birthDate?: string;
  address?: string;
  healthPlan?: string;
  notes?: string;
  lastVisit?: string;
  nextAppointment?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  availability?: string;
  crm: string;
}

export interface Appointment {
  id?: string;
  patient: string;
  patientId: string;
  patientEmail?: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  status: string;
  type: string;
  paid: boolean;
  amount: number;
  cpf: string;
  photoUrl?: string;
}

export interface UserAccount {
  id: string | number;
  email: string;
  cpf: string;
  role: 'RECEPCAO' | 'ADMINISTRACAO' | 'MEDICO';
  createdAt?: string;
  updatedAt?: string;
}

export type UserPayload = {
  email: string;
  cpf: string;
  role: 'RECEPCAO' | 'ADMINISTRACAO' | 'MEDICO';
  password?: string;
};

export interface PaymentRequest {
  appointmentId: string;
  amount: number;
  method: string;
}

export interface PixCreateResponse {
  paymentId: string;
  gatewayPaymentId?: string;
  status?: string;
  pixQrCodeBase64?: string;
  pixCopyPaste?: string;
  message?: string;
}

export interface PixStatusResponse {
  id?: string;
  status?: string;
  gatewayPaymentId?: string;
}

type ApiError = Error & { status?: number; details?: unknown };

// Helper function for API calls
async function fetchAPI<T>(
  url: string,
  options: RequestInit = {},
  allowFallback = true
): Promise<T> {
  // Always prefer token from localStorage to avoid losing auth on navigation/reload
  const localToken = (typeof window !== 'undefined') ? window.localStorage.getItem('lv_token') : null;
  const rawBearer = localToken || authToken;
  const bearer =
    rawBearer &&
    rawBearer !== 'undefined' &&
    rawBearer !== 'null' &&
    rawBearer.split('.').length === 3
      ? rawBearer
      : null;
  
  console.log('[API] Requisição:', { url, method: options.method || 'GET', bearer: !!bearer });
  
  // Build headers and ensure FormData bodies do not set Content-Type manually
  const headers: Record<string, string> = {
    ...(apiConfig.headers || {}),
    ...(options.headers as Record<string, string> || {}),
    ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
  };
  if (typeof FormData !== 'undefined' && options && options.body instanceof FormData) {
    // Let the browser set the Content-Type with boundary
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  console.log('[API] Resposta:', { url, status: response.status, statusText: response.statusText });

  if (!response.ok) {
    if (allowFallback && response.status === 404) {
      const fallbackUrl = getLocalFallbackUrl(url);
      if (fallbackUrl) {
        console.warn(`API 404 for ${url}, attempting fallback ${fallbackUrl}`);
        return fetchAPI<T>(fallbackUrl, options, false);
      }
    }
    let message = response.statusText || 'Erro na requisição';
    let details: unknown = null;
    try {
      const text = await response.text();
      if (text) {
        try {
          const parsed = JSON.parse(text);
          details = parsed;
          if (typeof parsed === 'string') {
            message = parsed;
          } else if (parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string') {
            message = parsed.error;
          }
        } catch {
          message = text;
        }
      }
    } catch {
      // ignore body parsing issues
    }
    const error: ApiError = new Error(`API Error: ${message}`);
    error.status = response.status;
    error.details = details;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return (await response.text()) as T;
  }

  return response.json();
}

function getLocalFallbackUrl(requestUrl: string) {
  if (typeof window === 'undefined') return null;
  if (!API_BASE_URL.includes('localhost')) return null;
  try {
    const parsed = new URL(requestUrl);
    const base = new URL(API_BASE_URL);
    if (parsed.host === base.host && parsed.pathname.startsWith('/api/')) {
      return parsed.pathname + parsed.search;
    }
  } catch {
    if (requestUrl.startsWith('/api/')) {
      return requestUrl;
    }
  }
  return null;
}

// Patient API
export const patientAPI = {
  getAll: () => fetchAPI<Patient[]>(API_ENDPOINTS.patients),
  
  getById: (id: string) => fetchAPI<Patient>(API_ENDPOINTS.patientById(id)),
  
  getByCpf: (cpf: string) => fetchAPI<Patient>(API_ENDPOINTS.patientByCpf(cpf)),
  
  create: (patient: Patient) =>
    fetchAPI<Patient>(API_ENDPOINTS.patients, {
      method: 'POST',
      body: JSON.stringify(patient),
    }),
  
  update: (id: string, patient: Patient) =>
    fetchAPI<Patient>(API_ENDPOINTS.patientById(id), {
      method: 'PUT',
      body: JSON.stringify(patient),
    }),
  
  delete: (id: string) =>
    fetchAPI<void>(API_ENDPOINTS.patientById(id), {
      method: 'DELETE',
    }),
};

// Doctor API
export const doctorAPI = {
  getAll: () => fetchAPI<Doctor[]>(API_ENDPOINTS.doctors),
  
  getById: (id: string) => fetchAPI<Doctor>(API_ENDPOINTS.doctorById(id)),
  
  create: (doctor: Omit<Doctor, 'id'>) =>
    fetchAPI<Doctor>(API_ENDPOINTS.doctors, {
      method: 'POST',
      body: JSON.stringify(doctor),
    }),

  update: (id: string, doctor: Omit<Doctor, 'id'>) =>
    fetchAPI<Doctor>(API_ENDPOINTS.doctorById(id), {
      method: 'PUT',
      body: JSON.stringify(doctor),
    }),

  delete: (id: string) =>
    fetchAPI<void>(API_ENDPOINTS.doctorById(id), {
      method: 'DELETE',
    }),
};

// Appointment API
export const appointmentAPI = {
  getAll: () => fetchAPI<Appointment[]>(API_ENDPOINTS.appointments),
  
  getById: (id: string) =>
    fetchAPI<Appointment>(API_ENDPOINTS.appointmentById(id)),
  
  create: (appointment: Omit<Appointment, 'id'>) =>
    fetchAPI<Appointment>(API_ENDPOINTS.appointments, {
      method: 'POST',
      body: JSON.stringify(appointment),
    }),

  delete: (id: string) =>
    fetchAPI<void>(API_ENDPOINTS.appointmentById(id), {
      method: 'DELETE',
    }),

  update: (id: string, appointment: Omit<Appointment, 'id'>) =>
    fetchAPI<Appointment>(API_ENDPOINTS.appointmentById(id), {
      method: 'PUT',
      body: JSON.stringify(appointment),
    }),

  updateStatus: (id: string, status: string) =>
    fetchAPI<Appointment>(API_ENDPOINTS.appointmentStatus(id), {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  updatePaid: (id: string, paid: boolean) =>
    fetchAPI<Appointment>(API_ENDPOINTS.appointmentPaid(id), {
      method: 'PUT',
      body: JSON.stringify({ paid }),
    }),

  notify: async (id: string, payload: { patientEmail?: string; doctorEmail?: string }) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    try {
      console.log('[API] Enviando notificação para:', id, payload);
      const result = await fetchAPI<void>(API_ENDPOINTS.appointmentNotify(id), {
        method: 'POST',
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      console.log('[API] Notificação enviada com sucesso');
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[API] Timeout ao enviar notificação');
        throw new Error('Tempo limite excedido ao enviar email. Tente novamente.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  uploadPhoto: async (id: string, file: Blob) => {
    const form = new FormData();
    form.append('file', file, 'photo.jpg');
    // ensure Authorization header is included for file upload
    const localToken = (typeof window !== 'undefined') ? window.localStorage.getItem('lv_token') : null;
    const rawBearer = localToken || authToken;
    const bearer = rawBearer && rawBearer !== 'undefined' && rawBearer !== 'null' && rawBearer.split('.').length === 3 ? rawBearer : null;
    const headers: Record<string,string> = {
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    };
    const res = await fetch(API_ENDPOINTS.appointmentPhoto(id), {
      method: 'POST',
      body: form,
      headers,
    });
    if (!res.ok) throw new Error('Falha ao enviar foto');
    return res.json() as Promise<Appointment>;
  },

  downloadReportBlob: async (id: string) => {
    // include Authorization if present
    const localToken = (typeof window !== 'undefined') ? window.localStorage.getItem('lv_token') : null;
    const rawBearer = localToken || authToken;
    const bearer = rawBearer && rawBearer !== 'undefined' && rawBearer !== 'null' && rawBearer.split('.').length === 3 ? rawBearer : null;
    const headers: Record<string,string> = {
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    };
    const res = await fetch(API_ENDPOINTS.appointmentReport(id), { headers });
    if (!res.ok) throw new Error('Falha ao gerar relatório');
    return res.blob();
  },

  getUpcoming: () => fetchAPI<Appointment[]>(API_ENDPOINTS.appointmentUpcoming),

  search: (query: string) => fetchAPI<Appointment[]>(API_ENDPOINTS.appointmentSearch(query)),

  // Payment flow: search unpaid appointments (any date) by CPF/name
  searchUnpaid: (query: string) => fetchAPI<Appointment[]>(API_ENDPOINTS.appointmentUnpaidSearch(query)),
};

// Payment API
export const paymentAPI = {
  process: (payment: PaymentRequest) =>
    fetchAPI<Appointment>(API_ENDPOINTS.payments, {
      method: 'POST',
      body: JSON.stringify(payment),
    }),

  createPix: (appointmentId: string) =>
    fetchAPI<PixCreateResponse>(API_ENDPOINTS.paymentsPix, {
      method: 'POST',
      body: JSON.stringify({ appointmentId }),
    }),

  getPixStatus: (paymentId: string) =>
    fetchAPI<PixStatusResponse>(API_ENDPOINTS.paymentStatus(paymentId)),
};

// Health Check
export const healthAPI = {
  check: () => fetchAPI<{ status: string }>(API_ENDPOINTS.health),
};

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    fetch(API_ENDPOINTS.authLogin, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    }).then(async (response) => {
      console.log('[API] Login response:', { status: response.status, statusText: response.statusText });
      if (!response.ok) {
        const text = await response.text();
        let message = 'Erro no login';
        try {
          const parsed = JSON.parse(text);
          if (parsed.error) message = parsed.error;
        } catch {
          message = text || response.statusText;
        }
        throw new Error(`API Error: ${message}`);
      }
      const data: any = await response.json();

      // Normalize LunaCore response -> TotemUI expected shape
      // LunaCore: { accessToken, tokenType: 'Bearer', expiresIn, role, userId, ... }
      // TotemUI expects: { token, refreshToken, role, ... }
      const token: string | undefined = data?.token ?? data?.accessToken;
      const refreshToken: string = data?.refreshToken ?? data?.refresh ?? '';
      const role: string = data?.role ?? data?.userRole ?? '';

      return {
        ...data,
        token,
        refreshToken,
        role,
      } as { id: number; email: string; cpf: string; role: string; token: string; refreshToken: string };
    }),
  register: (email: string, cpf: string, password: string, role: string) =>
    fetchAPI<{ id: number; email: string; cpf: string; role: string; token: string; refreshToken: string }>(API_ENDPOINTS.authRegister, {
      method: 'POST',
      body: JSON.stringify({ email, cpf, password, role }),
    }),
  refresh: (refreshToken: string) =>
    fetchAPI<{ token: string; refreshToken: string }>(`${API_ENDPOINTS.authLogin.replace('/login','/refresh')}`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
};

export const userAPI = {
  getAll: () => fetchAPI<UserAccount[]>(API_ENDPOINTS.users),
  create: (payload: UserPayload) =>
    fetchAPI<UserAccount>(API_ENDPOINTS.users, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number | string, payload: UserPayload) =>
    fetchAPI<UserAccount>(API_ENDPOINTS.userById(String(id)), {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  delete: (id: number | string) =>
    fetchAPI<void>(API_ENDPOINTS.userById(String(id)), {
      method: 'DELETE',
    }),
};
