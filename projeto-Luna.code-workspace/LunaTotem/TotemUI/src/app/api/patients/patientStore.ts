import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export type PatientRecord = {
  id: string;
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
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'patients.json');

const DEFAULT_PATIENTS: PatientRecord[] = [];

async function ensureStore() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_PATIENTS, null, 2), 'utf8');
  }
}

export async function readPatients(): Promise<PatientRecord[]> {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as PatientRecord[];
    }
  } catch {
    // ignore and fallthrough
  }
  await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_PATIENTS, null, 2), 'utf8');
  return [...DEFAULT_PATIENTS];
}

export async function writePatients(patients: PatientRecord[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(patients, null, 2), 'utf8');
}

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function normalizeCpf(value: string) {
  return normalizeDigits(value).slice(0, 11);
}

export function normalizePhone(value: string) {
  return normalizeDigits(value).slice(0, 11);
}

export function createPatientId() {
  return randomUUID();
}
