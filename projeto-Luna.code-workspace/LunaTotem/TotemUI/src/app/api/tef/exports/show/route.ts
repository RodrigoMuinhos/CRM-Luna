import { NextResponse } from 'next/server';

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function defaultDataDir(): string {
  if (process.env.LOCALAPPDATA) return path.join(process.env.LOCALAPPDATA, 'LunaKiosk');
  const home = os.homedir();
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'LunaKiosk');
  return path.join(home, '.local', 'share', 'LunaKiosk');
}

function sanitizeBasename(name: string): string {
  const s = String(name || '').trim();
  const base = path.basename(s);
  if (base !== s) return '';
  if (!base.toLowerCase().endsWith('.zip')) return '';
  if (base.length > 180) return '';
  if (!/^[a-zA-Z0-9_.-]+$/.test(base)) return '';
  return base;
}

export async function POST(req: Request) {
  try {
    if (process.platform !== 'win32') {
      return NextResponse.json({ ok: false, error: 'unsupported_platform' }, { status: 400 });
    }

    const url = new URL(req.url);
    const name = sanitizeBasename(String(url.searchParams.get('name') || ''));

    if (!name) {
      return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 });
    }

    const exportsDir = path.join(defaultDataDir(), 'exports');
    const full = path.join(exportsDir, name);

    const st = await fs.stat(full).catch((e: any) => {
      if (e?.code === 'ENOENT') return null;
      throw e;
    });

    if (!st) {
      return NextResponse.json({ ok: false, error: 'zip_not_found' }, { status: 404 });
    }

    // Open Windows Explorer selecting the file.
    // explorer.exe /select,"C:\path\file.zip"
    spawn('explorer.exe', ['/select,', full], {
      detached: true,
      windowsHide: true,
      stdio: 'ignore',
    }).unref();

    return NextResponse.json({ ok: true, name, path: full });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'show_in_folder_failed' },
      { status: 500 }
    );
  }
}
