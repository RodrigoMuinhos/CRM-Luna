import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Appointment } from '@/lib/api';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'appointments.json');

const FALLBACK_APPOINTMENTS: Appointment[] = [];

async function ensureStore() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(FALLBACK_APPOINTMENTS, null, 2), 'utf8');
  }
}

export async function readAppointments(): Promise<Appointment[]> {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as Appointment[];
    }
  } catch {
    // ignore
  }
  await fs.writeFile(DATA_FILE, JSON.stringify(FALLBACK_APPOINTMENTS, null, 2), 'utf8');
  return [...FALLBACK_APPOINTMENTS];
}

export async function writeAppointments(appointments: Appointment[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(appointments, null, 2), 'utf8');
}

export function createAppointmentId() {
  return randomUUID();
}
