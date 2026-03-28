import { NextResponse } from 'next/server';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function defaultDataDir(): string {
  if (process.env.LOCALAPPDATA) return path.join(process.env.LOCALAPPDATA, 'LunaKiosk');
  const home = os.homedir();
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'LunaKiosk');
  return path.join(home, '.local', 'share', 'LunaKiosk');
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const saleId = String(url.searchParams.get('saleId') || '').trim();

    if (!saleId) {
      return NextResponse.json({ ok: false, error: 'saleId_required' }, { status: 400 });
    }

    const dataDir = defaultDataDir();
    const receiptsDir = path.join(dataDir, 'receipts');
    const filename = path.join(receiptsDir, `cancel-${saleId}.json`);

    const bytes = await fs.readFile(filename);

    // Avoid caching, and force download.
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="cancel-${saleId}.json"`,
        'cache-control': 'no-store, max-age=0',
        pragma: 'no-cache',
      },
    });
  } catch (e: any) {
    if (e?.code === 'ENOENT') {
      return NextResponse.json({ ok: false, error: 'evidence_not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: e?.message || 'failed_to_download_evidence' }, { status: 500 });
  }
}
