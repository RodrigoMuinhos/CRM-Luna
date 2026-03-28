import { promises as fs } from 'fs';
import path from 'path';

export type ResponsavelPapel =
  | 'RESP_GERAL'
  | 'TECH_LEAD'
  | 'DEVOPS_SRE'
  | 'DBA'
  | 'DPO_LGPD'
  | 'JURIDICO'
  | 'COMERCIAL'
  | 'SUPORTE_N1'
  | 'SUPORTE_N2';

export type StoredResponsavel = {
  id: number;
  nome: string;
  cargo: string;
  papel: ResponsavelPapel;
  email: string;
  telefone?: string;
  observacoes?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'responsaveis.json');

export const PAPEL_LABELS: Record<ResponsavelPapel, string> = {
  RESP_GERAL: 'Responsável Geral',
  TECH_LEAD: 'Tech Lead',
  DEVOPS_SRE: 'DevOps / SRE',
  DBA: 'DBA',
  DPO_LGPD: 'DPO / LGPD',
  JURIDICO: 'Jurídico',
  COMERCIAL: 'Comercial',
  SUPORTE_N1: 'Suporte N1',
  SUPORTE_N2: 'Suporte N2',
};

export const ALLOWED_PAPEIS: ResponsavelPapel[] = [
  'RESP_GERAL',
  'TECH_LEAD',
  'DEVOPS_SRE',
  'DBA',
  'DPO_LGPD',
  'JURIDICO',
  'COMERCIAL',
  'SUPORTE_N1',
  'SUPORTE_N2',
];

function buildDefaultResponsaveis(now: string): StoredResponsavel[] {
  return [
    {
      id: 1,
      nome: 'Responsável Temporário Geral',
      cargo: 'Coordenação Operacional',
      papel: 'RESP_GERAL',
      email: 'responsavel.geral@temporario.local',
      telefone: '(00) 00000-0001',
      observacoes: 'Preencher com responsável oficial.',
      ativo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      nome: 'Responsável Temporário Técnico',
      cargo: 'Tech Lead',
      papel: 'TECH_LEAD',
      email: 'tech.lead@temporario.local',
      telefone: '(00) 00000-0002',
      observacoes: 'Substituir por nome oficial do time técnico.',
      ativo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3,
      nome: 'Responsável Temporário DevOps',
      cargo: 'DevOps / SRE',
      papel: 'DEVOPS_SRE',
      email: 'devops.sre@temporario.local',
      telefone: '(00) 00000-0004',
      observacoes: 'Substituir por responsável oficial de infraestrutura.',
      ativo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 4,
      nome: 'Responsável Temporário DBA',
      cargo: 'DBA',
      papel: 'DBA',
      email: 'dba@temporario.local',
      telefone: '(00) 00000-0005',
      observacoes: 'Substituir por responsável oficial de banco.',
      ativo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 5,
      nome: 'Responsável Temporário LGPD',
      cargo: 'DPO / LGPD',
      papel: 'DPO_LGPD',
      email: 'dpo.lgpd@temporario.local',
      telefone: '(00) 00000-0006',
      observacoes: 'Substituir por encarregado oficial LGPD.',
      ativo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 6,
      nome: 'Responsável Temporário Jurídico',
      cargo: 'Jurídico',
      papel: 'JURIDICO',
      email: 'juridico@temporario.local',
      telefone: '(00) 00000-0007',
      observacoes: 'Substituir por contato jurídico oficial.',
      ativo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 7,
      nome: 'Responsável Temporário Comercial',
      cargo: 'Comercial',
      papel: 'COMERCIAL',
      email: 'comercial@temporario.local',
      telefone: '(00) 00000-0003',
      observacoes: 'Usado apenas como placeholder inicial.',
      ativo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 8,
      nome: 'Responsável Temporário Suporte N1',
      cargo: 'Suporte N1',
      papel: 'SUPORTE_N1',
      email: 'suporte.n1@temporario.local',
      telefone: '(00) 00000-0008',
      observacoes: 'Substituir por responsável oficial de suporte N1.',
      ativo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 9,
      nome: 'Responsável Temporário Suporte N2',
      cargo: 'Suporte N2',
      papel: 'SUPORTE_N2',
      email: 'suporte.n2@temporario.local',
      telefone: '(00) 00000-0009',
      observacoes: 'Substituir por responsável oficial de suporte N2.',
      ativo: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function ensureOnePerRole(items: StoredResponsavel[]): StoredResponsavel[] {
  const now = new Date().toISOString();
  const defaults = buildDefaultResponsaveis(now);
  const presentRoles = new Set(items.map((x) => x.papel));
  let nextId = items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const output = [...items];

  for (const base of defaults) {
    if (presentRoles.has(base.papel)) continue;
    output.push({ ...base, id: nextId++, createdAt: now, updatedAt: now });
  }

  return output;
}

async function ensureStore() {
  const now = new Date().toISOString();
  const defaults = buildDefaultResponsaveis(now);
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(defaults, null, 2), 'utf8');
  }
}

export async function readResponsaveis(): Promise<StoredResponsavel[]> {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const now = new Date().toISOString();
  const defaults = buildDefaultResponsaveis(now);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const merged = ensureOnePerRole(parsed as StoredResponsavel[]);
      if (merged.length !== parsed.length) {
        await fs.writeFile(DATA_FILE, JSON.stringify(merged, null, 2), 'utf8');
      }
      return merged;
    }
  } catch {
    // reset fallback
  }
  await fs.writeFile(DATA_FILE, JSON.stringify(defaults, null, 2), 'utf8');
  return [...defaults];
}

export async function writeResponsaveis(items: StoredResponsavel[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), 'utf8');
}

export function nextResponsavelId(items: StoredResponsavel[]) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}
