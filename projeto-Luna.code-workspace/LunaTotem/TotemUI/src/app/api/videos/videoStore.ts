import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// In the Electron kiosk (packaged), process.cwd() can point to a read-only directory.
// Allow overriding where we persist JSON data.
function getWritableDataDir() {
  if (process.env.KIOSK_DATA_DIR) {
    return path.resolve(process.env.KIOSK_DATA_DIR);
  }

  // Serverless providers (ex: Vercel) typically run on read-only filesystem.
  // Use OS temp directory so API routes can write JSON safely.
  const isServerless =
    !!process.env.VERCEL ||
    !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
    !!process.env.LAMBDA_TASK_ROOT;

  if (isServerless) {
    const tmpBase =
      process.env.TMPDIR ||
      process.env.TEMP ||
      process.env.TMP ||
      (process.platform === 'win32' ? process.cwd() : '/tmp');
    return path.join(tmpBase, 'luna-kiosk-data');
  }

  return path.join(process.cwd(), 'data');
}

const DATA_DIR = getWritableDataDir();
const DATA_FILE = path.join(DATA_DIR, 'videos.json');

export type VideoStatus = 'PENDING' | 'PROCESSING' | 'ACTIVE' | 'ARCHIVED' | 'ERROR';

export interface VideoRecord {
  id: string;
  filename: string;
  originalName?: string;
  title?: string;
  description?: string;
  filePath: string;
  fileSize: number;
  displayOrder: number;
  isActive: boolean;
  status: VideoStatus;
  createdAt: string;
  updatedAt: string;
}

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, '[]', 'utf-8');
  }
}

export async function readVideos(): Promise<VideoRecord[]> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(raw) as VideoRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeVideos(videos: VideoRecord[]) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(videos, null, 2), 'utf-8');
}

export function createVideoId() {
  return randomUUID();
}

export function sanitizeVideo(video: VideoRecord) {
  const { originalName, ...rest } = video;
  return rest;
}

export function normalizeDisplayOrder(videos: VideoRecord[]) {
  return videos
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((video, index) => ({ ...video, displayOrder: index + 1 }));
}
