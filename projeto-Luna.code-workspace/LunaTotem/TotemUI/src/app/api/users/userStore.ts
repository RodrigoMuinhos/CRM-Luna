import { promises as fs } from 'fs';
import path from 'path';

export type Role = 'RECEPCAO' | 'ADMINISTRACAO' | 'MEDICO';

export type StoredUser = {
  id: number;
  email: string;
  cpf: string;
  role: Role;
  password: string;
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');

const DEFAULT_USERS: StoredUser[] = [];

async function ensureStore() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const seed = JSON.stringify(DEFAULT_USERS, null, 2);
    await fs.writeFile(DATA_FILE, seed, 'utf8');
  }
}

export async function readUsers(): Promise<StoredUser[]> {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as StoredUser[];
    }
  } catch {
    // ignore and fall through to reset
  }
  await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_USERS, null, 2), 'utf8');
  return [...DEFAULT_USERS];
}

export async function writeUsers(users: StoredUser[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
}

export function sanitizeUser(user: StoredUser) {
  const { password, ...safe } = user;
  return safe;
}

export function sanitizeUsers(users: StoredUser[]) {
  return users.map(sanitizeUser);
}

export function nextUserId(users: StoredUser[]) {
  return users.reduce((max, user) => Math.max(max, user.id), 0) + 1;
}

export function normalizeCpf(value: string) {
  return value.replace(/\D/g, '').slice(0, 11);
}

export const ALLOWED_ROLES: Role[] = ['RECEPCAO', 'ADMINISTRACAO', 'MEDICO'];
