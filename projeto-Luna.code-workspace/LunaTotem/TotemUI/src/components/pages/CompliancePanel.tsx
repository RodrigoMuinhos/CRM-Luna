'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Info, Play, RefreshCw, ShieldCheck } from 'lucide-react';

type ComplianceService = {
  Name?: string;
  Status?: string;
  ResponseTime?: number;
  HttpStatus?: number;
  ContainerStatus?: string;
  Error?: string | null;
};

type ComplianceDoc = {
  nome?: string;
  caminho?: string;
  existe?: boolean;
};

type ComplianceReport = {
  timestamp?: string;
  health?: {
    allHealthy?: boolean;
    hasError?: boolean;
    hasDegraded?: boolean;
    services?: ComplianceService[];
  };
  backup?: {
    hasBackup?: boolean;
    backupWithin24h?: boolean;
    latestBackupDir?: string | null;
    backupAgeHours?: number | null;
  };
};

type StatusResponse = {
  ok: boolean;
  signal?: {
    color?: 'green' | 'yellow' | 'red' | 'gray';
    code?: string;
    label?: string;
    failedCount?: number;
  };
  failedRequirements?: Array<{
    code?: string;
    label?: string;
    detail?: string;
  }>;
  hasReport?: boolean;
  latestFolder?: string;
  latestMdPath?: string;
  report?: ComplianceReport;
  docs?: ComplianceDoc[];
  hint?: string;
  error?: string;
};

export function CompliancePanel() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runWithBackup, setRunWithBackup] = useState(true);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [runLog, setRunLog] = useState('');

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/compliance/status', { cache: 'no-store' });
      const data = (await res.json()) as StatusResponse;
      setStatus(data);
    } catch (e: any) {
      setStatus({ ok: false, error: e?.message || 'Falha ao carregar status.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const executeCompliance = async () => {
    setRunning(true);
    setRunLog('Executando rotina...');
    try {
      const res = await fetch('/api/compliance/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executarBackup: runWithBackup, timeoutSec: 4 }),
      });
      const data = await res.json();
      setRunLog(String(data?.stdout || data?.stderr || 'Sem saída.'));
      await loadStatus();
    } catch (e: any) {
      setRunLog(String(e?.message || 'Falha ao executar rotina.'));
    } finally {
      setRunning(false);
    }
  };

  const report = status?.report;
  const signal = status?.signal;
  const healthOk = !!report?.health?.allHealthy;
  const backupOk = !!report?.backup?.backupWithin24h;
  const docs = status?.docs || [];
  const docsOk = docs.length > 0 && docs.every((d) => d.existe);
  const failedRequirements = status?.failedRequirements || [];

  const scoreItems = [
    { label: 'Serviços', ok: healthOk },
    { label: 'Backup 24h', ok: backupOk },
    { label: 'Documentação', ok: docsOk },
  ];

  const complianceScore = Math.round((scoreItems.filter((i) => i.ok).length / scoreItems.length) * 100);

  const statusColorClass = useMemo(() => {
    if (signal?.color === 'green') return 'bg-green-50 border-green-200 text-green-800';
    if (signal?.color === 'yellow') return 'bg-amber-50 border-amber-200 text-amber-800';
    if (signal?.color === 'red') return 'bg-red-50 border-red-200 text-red-800';
    return 'bg-gray-50 border-gray-200 text-gray-700';
  }, [signal?.color]);

  const nextActions = useMemo(() => {
    const codes = new Set(failedRequirements.map((f) => f.code));
    const actions: string[] = [];
    if (codes.has('REQ-HEALTH')) actions.push('Verifique serviços indisponíveis e clique em Atualizar.');
    if (codes.has('REQ-BACKUP24H')) actions.push('Execute a rotina com backup habilitado.');
    if (codes.has('REQ-DOCS')) actions.push('Complete os documentos obrigatórios faltantes.');
    if (actions.length === 0) actions.push('Tudo certo. Mantenha a rotina diária de verificação.');
    return actions;
  }, [failedRequirements]);

  const quickSummary = `${signal?.label || 'Sem dados'} (${signal?.code || 'CMP-GRAY-NODATA'}) • Score ${complianceScore}%`;

  const failedRequirementLines = failedRequirements.length
    ? failedRequirements.map((f) => `- ${f.code}: ${f.label} (${f.detail})`)
    : ['- Nenhuma pendência crítica identificada.'];

  const recommendedActions = (() => {
    const actions: string[] = [];
    const codes = new Set(failedRequirements.map((f) => f.code));
    if (codes.has('REQ-HEALTH')) actions.push('Verificar serviços com falha e revalidar health.');
    if (codes.has('REQ-BACKUP24H')) actions.push('Executar rotina com backup habilitado e confirmar janela de 24h.');
    if (codes.has('REQ-DOCS')) actions.push('Regularizar documentação obrigatória e anexar evidências.');
    if (actions.length === 0) actions.push('Manter rotina diária e revisão semanal de conformidade.');
    return actions;
  })();

  const buildExecutiveSummary = () => {
    const now = new Date().toLocaleString();
    const evidence = status?.latestMdPath || 'N/A';
    const backupAge = typeof report?.backup?.backupAgeHours === 'number' ? `${report.backup.backupAgeHours}h` : 'N/A';

    const lines = [
      'Resumo Executivo de Conformidade',
      `Data: ${now}`,
      '',
      '1) Situação Atual',
      `- Status geral: ${signal?.label || 'Sem dados'} (${signal?.code || 'CMP-GRAY-NODATA'})`,
      `- Score de conformidade: ${complianceScore}%`,
      `- Pendências identificadas: ${signal?.failedCount ?? 0}`,
      '',
      '2) Indicadores-Chave',
      `- Serviços: ${healthOk ? 'OK' : 'Pendente'}`,
      `- Backup (24h): ${backupOk ? 'OK' : 'Pendente'}`,
      `- Documentação obrigatória: ${docsOk ? 'OK' : 'Pendente'}`,
      `- Idade do backup: ${backupAge}`,
      '',
      '3) Pendências por Requisito',
      ...failedRequirementLines,
      '',
      '4) Ações Recomendadas',
      ...recommendedActions.map((a, i) => `- Ação ${i + 1}: ${a}`),
      '',
      '5) Evidências',
      `- Última execução: ${report?.timestamp || status?.latestFolder || 'N/A'}`,
      `- Relatório de evidência: ${evidence}`,
      '',
      '6) Resumo para Comunicação',
      `- ${quickSummary}`,
    ];

    return lines.join('\n');
  };

  const downloadText = (name: string, content: string, type = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  const handleDownloadTxt = () => {
    downloadText(`resumo-conformidade-${new Date().toISOString().slice(0, 10)}.txt`, buildExecutiveSummary());
  };

  const handleDownloadJson = () => {
    downloadText(
      `relatorio-conformidade-ui-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`,
      JSON.stringify({ generatedAt: new Date().toISOString(), status }, null, 2),
      'application/json;charset=utf-8',
    );
  };

  const handleSendReport = async () => {
    const body = buildExecutiveSummary();
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'Resumo Executivo de Conformidade', text: body });
        return;
      } catch {
        // fallback
      }
    }
    window.open(`mailto:?subject=${encodeURIComponent('Resumo Executivo de Conformidade')}&body=${encodeURIComponent(body)}`, '_blank');
  };

  if (loading) return <div className="py-8 text-center text-[#7B6A5A]">Carregando conformidade...</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#E8E2DA] bg-white p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#F2E7DD] p-2.5 text-[#8C7155]"><ShieldCheck className="h-5 w-5" /></div>
            <div>
              <h3 className="text-xl font-semibold text-[#4A4A4A]">Saúde do Sistema</h3>
              <p className="text-sm text-[#7B6A5A]">Resumo simples para operação diária</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={loadStatus} className="inline-flex items-center gap-1 rounded-xl border border-[#D3A67F]/40 px-4 py-2 text-sm text-[#7C6248] hover:bg-[#F9F6F2]"><RefreshCw className="h-4 w-4" /> Atualizar</button>
            <button type="button" onClick={executeCompliance} disabled={running} className="inline-flex items-center gap-1 rounded-xl bg-[#8C7155] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C6248] disabled:opacity-60"><Play className="h-4 w-4" /> {running ? 'Executando...' : 'Executar rotina'}</button>
            <button type="button" onClick={handleDownloadTxt} className="rounded-xl border border-[#D3A67F]/40 px-4 py-2 text-sm text-[#7C6248] hover:bg-[#F9F6F2]">Baixar resumo</button>
            <button type="button" onClick={handleSendReport} className="rounded-xl border border-[#D3A67F]/40 px-4 py-2 text-sm text-[#7C6248] hover:bg-[#F9F6F2]">Enviar relatório</button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <div className={`rounded-2xl border px-4 py-3 ${statusColorClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Status geral: {signal?.label || 'Sem dados'}</p>
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold">{signal?.code || 'CMP-GRAY-NODATA'}</span>
              </div>
              <p className="mt-1 text-xs">Pendências encontradas: {signal?.failedCount ?? 0}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {scoreItems.map((item) => (
                <div key={item.label} className="rounded-xl border border-[#EFE7DC] bg-[#FCFAF7] p-3">
                  <p className="text-xs uppercase tracking-wider text-[#8C7155]">{item.label}</p>
                  <p className={`mt-1 text-sm font-semibold ${item.ok ? 'text-green-700' : 'text-red-700'}`}>{item.ok ? 'OK' : 'Pendente'}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-[#EFE7DC] bg-white p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8C7155]">O que fazer agora</p>
              <ul className="space-y-1 text-sm text-[#4A4A4A]">
                {nextActions.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 text-[#8C7155]" /><span>{item}</span></li>
                ))}
              </ul>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-[#4A4A4A]"><input type="checkbox" checked={runWithBackup} onChange={(e) => setRunWithBackup(e.target.checked)} className="h-4 w-4 rounded border-[#D3A67F]/40" />Executar com backup</label>

            <div className="rounded-xl bg-[#F9F6F2] p-3 text-sm text-[#4A4A4A]">
              <p><strong>Última execução:</strong> {report?.timestamp || status?.latestFolder || 'N/A'}</p>
              <p className="truncate"><strong>Evidência:</strong> {status?.latestMdPath || 'N/A'}</p>
              <p><strong>Idade do backup:</strong> {typeof report?.backup?.backupAgeHours === 'number' ? `${report.backup.backupAgeHours}h` : 'N/A'}</p>
            </div>

            <div className="rounded-xl border border-[#EFE7DC] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8C7155]">Pendências encontradas</p>
              {failedRequirements.length === 0 ? (
                <p className="text-sm text-green-700">Nenhuma pendência. Sistema em conformidade.</p>
              ) : (
                <div className="space-y-1 text-sm">{failedRequirements.map((f, i) => <div key={i} className="rounded-md bg-red-50 px-2 py-1 text-red-800">{f.label}: {f.detail}</div>)}</div>
              )}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-4">
            <div className="rounded-xl border border-[#EFE7DC] bg-[#FCFAF7] p-4 text-xs text-[#4A4A4A]">
              <p className="mb-2 font-semibold uppercase tracking-wider text-[#8C7155]">Ações rápidas</p>
              <div className="grid gap-2">
                <button type="button" onClick={handleDownloadJson} className="rounded-lg border border-[#D3A67F]/40 bg-white px-3 py-2 text-left hover:bg-[#F9F6F2]">Baixar relatório (JSON)</button>
                <button type="button" onClick={handleDownloadTxt} className="rounded-lg border border-[#D3A67F]/40 bg-white px-3 py-2 text-left hover:bg-[#F9F6F2]">Baixar resumo (TXT)</button>
                <button type="button" onClick={handleSendReport} className="rounded-lg border border-[#D3A67F]/40 bg-white px-3 py-2 text-left hover:bg-[#F9F6F2]">Enviar resumo</button>
              </div>
            </div>

            <details className="rounded-xl border border-[#EFE7DC] bg-[#FCFAF7] p-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-[#8C7155]">Detalhes técnicos (avançado)</summary>
              <div className="mt-3 space-y-2 text-xs text-[#4A4A4A]">
                <div className="rounded-md bg-white px-2 py-1"><strong>CMP-GREEN-OK</strong>: tudo certo.</div>
                <div className="rounded-md bg-white px-2 py-1"><strong>CMP-YELLOW-PARTIAL</strong>: pendências parciais.</div>
                <div className="rounded-md bg-white px-2 py-1"><strong>CMP-RED-CRITICAL</strong>: atenção imediata.</div>
                <div className="rounded-md bg-white px-2 py-1"><strong>CMP-GRAY-*</strong>: sem dados/falha leitura.</div>
              </div>
            </details>

            {runLog && (
              <div className="rounded-xl bg-[#1F2937] p-3 text-xs text-[#E5E7EB]">
                <p className="mb-1 font-semibold">Saída da execução</p>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap">{runLog}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
