import fs from 'node:fs/promises';
import path from 'node:path';

export type ComplianceReport = {
  timestamp?: string;
  health?: {
    allHealthy?: boolean;
    hasError?: boolean;
    hasDegraded?: boolean;
    services?: Array<{
      Name?: string;
      Status?: string;
      ResponseTime?: number;
      HttpStatus?: number;
      ContainerStatus?: string;
      Error?: string | null;
    }>;
  };
  backup?: {
    hasBackup?: boolean;
    latestBackupDir?: string | null;
    backupAgeHours?: number | null;
    backupWithin24h?: boolean;
  };
  documentation?: Array<{
    nome?: string;
    caminho?: string;
    existe?: boolean;
  }>;
};

export function getRootCandidates(): string[] {
  const cwd = process.cwd();
  const fromEnv = process.env.ORQUESTRADOR_LUNA_ROOT?.trim();

  return [
    fromEnv || '',
    path.resolve(cwd, '../../..'),
    path.resolve(cwd, '../..'),
    path.resolve(cwd, '..'),
    cwd,
  ].filter(Boolean);
}

export async function resolveWorkspaceRoot(): Promise<string | null> {
  for (const candidate of getRootCandidates()) {
    const evidenceDir = path.join(candidate, 'docs', 'evidencias', 'conformidade');
    const scriptsDir = path.join(candidate, 'scripts-powershell');
    const hasEvidenceBase = await fs.stat(evidenceDir).then(() => true).catch(() => false);
    const hasScripts = await fs.stat(scriptsDir).then(() => true).catch(() => false);
    if (hasEvidenceBase || hasScripts) {
      return candidate;
    }
  }
  return null;
}

export async function findLatestComplianceReport(root: string): Promise<{
  folderName: string;
  folderPath: string;
  jsonPath: string;
  report: ComplianceReport;
} | null> {
  const baseDir = path.join(root, 'docs', 'evidencias', 'conformidade');
  const entries = await fs.readdir(baseDir, { withFileTypes: true }).catch(() => []);
  const folders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => b.localeCompare(a));

  for (const folderName of folders) {
    const folderPath = path.join(baseDir, folderName);
    const jsonPath = path.join(folderPath, 'relatorio-conformidade.json');
    const raw = await fs.readFile(jsonPath, 'utf-8').catch(() => null);
    if (!raw) continue;

    try {
      const report = JSON.parse(raw) as ComplianceReport;
      return { folderName, folderPath, jsonPath, report };
    } catch {
      // Tenta próximo
    }
  }

  return null;
}

export async function getComplianceDocsStatus(root: string) {
  const docs = [
    { nome: 'Checklist Operacional', caminho: path.join(root, 'Checklist-Operacional-Edital.md') },
    { nome: 'Plano PoC', caminho: path.join(root, 'Plano-PoC-Resiliencia.md') },
    { nome: 'Política Backup DR', caminho: path.join(root, 'Politica-Backup-DR.md') },
    { nome: 'Runbook Incidentes', caminho: path.join(root, 'Runbook-Incidentes.md') },
    { nome: 'Rastreabilidade', caminho: path.join(root, 'docs', 'CONFORMIDADE-RASTREABILIDADE.md') },
  ];

  const out: Array<{ nome: string; caminho: string; existe: boolean }> = [];
  for (const d of docs) {
    const existe = await fs.stat(d.caminho).then(() => true).catch(() => false);
    out.push({ nome: d.nome, caminho: d.caminho, existe });
  }
  return out;
}
