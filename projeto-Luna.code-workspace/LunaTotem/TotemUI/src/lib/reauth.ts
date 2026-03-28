import { authAPI } from '@/lib/api';
import { AUTH_STORAGE_KEYS } from '@/lib/apiConfig';

export async function verifySessionPassword(password: string): Promise<void> {
  const pwd = String(password || '').trim();
  if (!pwd) {
    throw new Error('Senha obrigatória.');
  }

  if (typeof window === 'undefined') {
    throw new Error('Sessão indisponível.');
  }

  const email = String(window.localStorage.getItem(AUTH_STORAGE_KEYS.email) || '').trim();
  if (!email) {
    throw new Error('E-mail da sessão não encontrado. Faça login novamente.');
  }

  // Re-auth only; we intentionally do not persist token/role here.
  await authAPI.login(email, pwd);
}
