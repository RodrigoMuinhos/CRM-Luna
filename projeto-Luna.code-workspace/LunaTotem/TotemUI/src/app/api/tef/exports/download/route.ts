import { NextResponse } from 'next/server';

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

function defaultDataDir(): string {
  if (process.env.LOCALAPPDATA) return path.join(process.env.LOCALAPPDATA, 'LunaKiosk');
  const home = os.homedir();
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'LunaKiosk');
  return path.join(home, '.local', 'share', 'LunaKiosk');
}

function sanitizeBasename(name: string): string {
  const s = String(name || '').trim();
  const base = path.basename(s);
  // Disallow path traversal and weird separators.
  if (base !== s) return '';
  if (!base.toLowerCase().endsWith('.zip')) return '';
  if (base.length > 180) return '';
  if (!/^[a-zA-Z0-9_.-]+$/.test(base)) return '';
  return base;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const name = sanitizeBasename(String(url.searchParams.get('name') || ''));

    if (!name) {
      return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 });
    }

    const exportsDir = path.join(defaultDataDir(), 'exports');
    const full = path.join(exportsDir, name);

    const st = await fsp.stat(full).catch((e: any) => {
      if (e?.code === 'ENOENT') return null;
      throw e;
    });

    if (!st) {
      return NextResponse.json({ ok: false, error: 'zip_not_found' }, { status: 404 });
    }

    const nodeStream = fs.createReadStream(full);
    const webStream = Readable.toWeb(nodeStream) as any;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename="${name}"`,
        'cache-control': 'no-store',
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'zip_download_failed' },
      { status: 500 }
    );
  }
}
