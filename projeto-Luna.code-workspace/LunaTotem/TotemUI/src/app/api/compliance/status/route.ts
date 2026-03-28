export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import path from 'node:path';
import { findLatestComplianceReport, getComplianceDocsStatus, resolveWorkspaceRoot } from '../_lib';

type RequirementStatus = {
  code: 'REQ-HEALTH' | 'REQ-BACKUP24H' | 'REQ-DOCS';
  label: string;
  ok: boolean;
  detail: string;
};

function buildSignal(requirements: RequirementStatus[]) {
  const failed = requirements.filter((r) => !r.ok);
  const passed = requirements.length - failed.length;

  if (failed.length === 0) {
    return {
      color: 'green' as const,
      code: 'CMP-GREEN-OK',
      label: 'Conformidade OK',
      failedCount: 0,
    };
  }

  if (passed > 0) {
    return {
      color: 'yellow' as const,
      code: 'CMP-YELLOW-PARTIAL',
      label: 'Conformidade parcial',
      failedCount: failed.length,
    };
  }

  return {
    color: 'red' as const,
    code: 'CMP-RED-CRITICAL',
    label: 'Conformidade crítica',
    failedCount: failed.length,
  };
}

export async function GET() {
  try {
    const root = await resolveWorkspaceRoot();
    if (!root) {
      return NextResponse.json(
        { ok: false, error: 'workspace_root_not_found' },
        { status: 404 },
      );
    }

    const latest = await findLatestComplianceReport(root);
    const docs = await getComplianceDocsStatus(root);

    if (!latest) {
      return NextResponse.json({
        ok: true,
        root,
        hasReport: false,
        signal: {
          color: 'gray',
          code: 'CMP-GRAY-NODATA',
          label: 'Sem dados / sem relatório',
          failedCount: 0,
        },
        requirements: [],
        failedRequirements: [],
        docs,
        hint: 'Nenhum relatório encontrado. Execute a rotina de conformidade.',
      });
    }

    const healthOk = !!latest.report?.health?.allHealthy;
    const backupOk = !!latest.report?.backup?.backupWithin24h;
    const docsOk = docs.length > 0 && docs.every((d) => !!d.existe);

    const requirements: RequirementStatus[] = [
      {
        code: 'REQ-HEALTH',
        label: 'Saúde dos serviços',
        ok: healthOk,
        detail: healthOk ? 'Todos os serviços principais saudáveis' : 'Existe serviço com falha/degradação',
      },
      {
        code: 'REQ-BACKUP24H',
        label: 'Backup válido (24h)',
        ok: backupOk,
        detail: backupOk ? 'Backup encontrado dentro da janela' : 'Backup ausente ou fora da janela de 24h',
      },
      {
        code: 'REQ-DOCS',
        label: 'Documentação obrigatória',
        ok: docsOk,
        detail: docsOk ? 'Documentos mandatórios encontrados' : 'Há documentação obrigatória faltando',
      },
    ];

    const signal = buildSignal(requirements);
    const failedRequirements = requirements.filter((r) => !r.ok);

    return NextResponse.json({
      ok: true,
      root,
      hasReport: true,
      signal,
      requirements,
      failedRequirements,
      latestFolder: latest.folderName,
      latestFolderPath: latest.folderPath,
      latestJsonPath: latest.jsonPath,
      latestMdPath: path.join(latest.folderPath, 'relatorio-conformidade.md'),
      report: latest.report,
      docs,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || 'compliance_status_failed',
        signal: {
          color: 'gray',
          code: 'CMP-GRAY-ERROR',
          label: 'Falha ao ler conformidade',
          failedCount: 0,
        },
      },
      { status: 500 },
    );
  }
}
