export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { findLatestComplianceReport, getComplianceDocsStatus, resolveWorkspaceRoot } from '../_lib';

type RunBody = {
  executarBackup?: boolean;
  timeoutSec?: number;
};

function clampTimeout(timeoutSec?: number): number {
  const n = Number(timeoutSec ?? 3);
  if (!Number.isFinite(n)) return 3;
  return Math.max(2, Math.min(30, Math.trunc(n)));
}

export async function POST(req: Request) {
  try {
    if (process.platform !== 'win32') {
      return NextResponse.json(
        { ok: false, error: 'unsupported_platform', message: 'Execução automática disponível apenas no Windows host.' },
        { status: 400 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as RunBody;
    const executarBackup = !!body.executarBackup;
    const timeoutSec = clampTimeout(body.timeoutSec);

    const root = await resolveWorkspaceRoot();
    if (!root) {
      return NextResponse.json(
        { ok: false, error: 'workspace_root_not_found' },
        { status: 404 },
      );
    }

    const scriptPath = path.join(root, 'scripts-powershell', 'run-conformidade-operacional.ps1');
    const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-TimeoutSec', String(timeoutSec)];
    if (executarBackup) {
      args.push('-ExecutarBackup');
    }

    const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
      const child = spawn('pwsh', args, { cwd: root, windowsHide: true });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += String(chunk ?? '');
        if (stdout.length > 120_000) {
          stdout = stdout.slice(-120_000);
        }
      });

      child.stderr.on('data', (chunk) => {
        stderr += String(chunk ?? '');
        if (stderr.length > 120_000) {
          stderr = stderr.slice(-120_000);
        }
      });

      child.on('close', (code) => resolve({ code, stdout, stderr }));
    });

    const latest = await findLatestComplianceReport(root);
    const docs = await getComplianceDocsStatus(root);

    return NextResponse.json({
      ok: result.code === 0,
      exitCode: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
      docs,
      hasReport: !!latest,
      latestFolder: latest?.folderName,
      latestFolderPath: latest?.folderPath,
      latestMdPath: latest ? path.join(latest.folderPath, 'relatorio-conformidade.md') : null,
      report: latest?.report ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'compliance_run_failed' },
      { status: 500 },
    );
  }
}
