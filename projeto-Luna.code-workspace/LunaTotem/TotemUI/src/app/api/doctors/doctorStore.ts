import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Doctor } from '@/lib/api';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'doctors.json');

const FALLBACK_DOCTORS: Doctor[] = [];

async function ensureStore() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(FALLBACK_DOCTORS, null, 2), 'utf8');
  }
}

export async function readDoctors(): Promise<Doctor[]> {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as Doctor[];
    }
  } catch {
    // ignore
  }
  await fs.writeFile(DATA_FILE, JSON.stringify(FALLBACK_DOCTORS, null, 2), 'utf8');
  return [...FALLBACK_DOCTORS];
}

export async function writeDoctors(doctors: Doctor[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(doctors, null, 2), 'utf8');
}

export function createDoctorId() {
  return randomUUID();
}
