import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageContainer } from '../PageContainer';
import { ActionFooter } from '../ActionFooter';
import { Button } from '../Button';
import { CancelConfirmModal } from '../CancelConfirmModal';
import { PaymentMethod } from '../../types';
import { FlowType, getFlowSteps } from '@/lib/flowSteps';
import { API_BASE_URL } from '@/lib/apiConfig';
import { appointmentAPI } from '@/lib/api';
import { pollTefStatus, tefBack, tefCancel, tefCharge, tefConfirm, tefPrint, tefStatus as fetchTefStatus } from '@/lib/tefBridge';

function toBase64Utf8(text: string): string {
  // btoa only accepts Latin1. This keeps receipts safe with pt-BR accents.
  const utf8 = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
  return btoa(utf8);
}

function isF3Key(event: KeyboardEvent): boolean {
  return event.key === 'F3' || event.code === 'F3' || event.keyCode === 114;
}

function buildCupomFiscal(): string {
  // Cupom fiscal deve ter no máximo 19 caracteres.
  // Mantemos apenas dígitos para compatibilidade com integrações TEF.
  const now = Date.now().toString();
  const rand = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');
  const token = `${now}${rand}`; // 13 + 6 = 19
  return token.length > 19 ? token.slice(0, 19) : token;
}

function sanitizeTefHint(raw: string): string {
  const msg = String(raw || '').trim();
  if (!msg) return '';

  // Remove listas de opções operacionais do SiTef (ex.: "1:Magnetico/Chip;2:Digitado;3:...")
  // para não exibir conteúdo técnico ao usuário final.
  return msg
    .replace(/\b\d+\s*:\s*[^;\n]+;?/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toFriendlyTefPrompt(raw: string): string {
  const normalized = normalizeForMatch(raw);
  if (!normalized) return '';

  // Pós-autorização
  if (
    normalized.includes('transacao aprovada')
    || normalized.includes('pagamento aprovado')
    || normalized.includes('autorizado')
    || normalized.includes('aprovado')
  ) {
    return 'Transação aprovada';
  }

  if (
    normalized.includes('retire o cartao')
    || normalized.includes('retire seu cartao')
    || normalized.includes('remova o cartao')
    || normalized.includes('remover cartao')
    || normalized.includes('retirar cartao')
  ) {
    return 'Retire o cartão';
  }

  // Prompt de senha no pinpad
  if (
    normalized.includes('senha')
    || normalized.includes('digite a senha')
    || normalized.includes('informe a senha')
    || normalized.includes('pin')
    || normalized.includes('password')
  ) {
    return 'Insira sua senha';
  }

  // Prompt de apresentação de cartão
  if (
    normalized.includes('magnetico')
    || normalized.includes('chip')
    || normalized.includes('digitado')
    || normalized.includes('aproxime')
    || normalized.includes('insira')
    || normalized.includes('passe')
    || normalized.includes('cartao')
    || normalized.includes('leitor')
    || normalized.includes('tarja')
  ) {
    return 'Insira, passe ou aproxime';
  }

  return '';
}

function extractRealtimeTefPrompt(status: any): string {
  const candidates = [
    status?.displayMessage,
    status?.lastMessage,
    status?.message,
    status?.prompt,
    status?.pinpadMessage,
    status?.approvedData?.message,
  ];

  for (const value of candidates) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }

  return '';
}

function normalizeForMatch(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const VALID_SITEF_STORE_CODE = '00000000';
const INVALID_STORE_CODE_MESSAGE = 'Não existe Conf.';

function normalizeStoreCode(raw: string | null | undefined): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

interface Appointment {
  id: string;
  patient: {
    name: string;
    cpf: string;
  };
  amount: number;
  date: string;
  time: string;
  doctor?: string;
  specialty?: string;
}

interface PaymentProcessingProps {
  method: PaymentMethod;
  installments?: number;
  onComplete: (payload?: { saleId?: string; printOrConfirmIssue?: string }) => void;
  onBack: () => void;
  onCancelToStart?: () => void;
  flow?: FlowType;
  selectedAppointment?: Appointment | null;
}

type SessionSnapshot = {
  ok?: boolean;
  pendingCount?: number;
  running?: boolean;
  saleId?: string;
  status?: {
    running?: boolean;
    saleId?: string | null;
    lastError?: string | null;
  };
  error?: string;
};

export function PaymentProcessing({
  method,
  installments,
  onComplete,
  onBack,
  onCancelToStart,
  flow = 'payment',
  selectedAppointment,
}: PaymentProcessingProps) {
  console.log('[PaymentProcessing] Component rendered with props:', { method, installments, flow });
  
  const [tefStatus, setTefStatus] = useState<'IDLE' | 'STARTING' | 'IN_PROGRESS' | 'FINALIZING' | 'APPROVED' | 'DECLINED' | 'ERROR'>(
    'IDLE'
  );
  const [tefError, setTefError] = useState<string>('');
  const [tefHint, setTefHint] = useState<string>('');
  const [saleId, setSaleId] = useState<string>('');
  const [autoReturnCountdown, setAutoReturnCountdown] = useState<number>(0);
  const [cancelCountdown, setCancelCountdown] = useState<number>(0);
  const [cancelProgressCountdown, setCancelProgressCountdown] = useState<number>(0);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [isCancelledFlow, setIsCancelledFlow] = useState<boolean>(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [showInsertPrompt, setShowInsertPrompt] = useState<boolean>(false);
  const [pixQrCodeImage, setPixQrCodeImage] = useState<string>('');
  const saleIdRef = useRef<string>('');
  const abortRef = useRef<AbortController | null>(null);
  const autoReturnTimeoutRef = useRef<number | null>(null);
  const autoReturnIntervalRef = useRef<number | null>(null);
  const cancelTimeoutRef = useRef<number | null>(null);
  const cancelIntervalRef = useRef<number | null>(null);
  const cancelProgressIntervalRef = useRef<number | null>(null);
  const insertPromptTimerRef = useRef<number | null>(null);
  const cancelReasonRef = useRef<string>('');
  const cancelReturnTimerRef = useRef<number | null>(null);
  const cancelInFlightRef = useRef<boolean>(false);
  const lastProgressMessageRef = useRef<string>('');
  const startEffectKeyRef = useRef<string>('');
  const completingSaleRef = useRef<string>('');
  const completedSalesRef = useRef<Set<string>>(new Set());
  const startEffectStartedAtRef = useRef<number>(0);
  const storeCodeRef = useRef<string>(VALID_SITEF_STORE_CODE);
  const cardPromptShownRef = useRef<boolean>(false);
  const passwordPromptSeenRef = useRef<boolean>(false);
  const approvedPromptSeenRef = useRef<boolean>(false);
  const removeCardPromptSeenRef = useRef<boolean>(false);

  const amountCents = useMemo(() => {
    const v = selectedAppointment?.amount;
    const cents = typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) : 0;
    return Math.max(0, cents);
  }, [selectedAppointment?.amount]);

  const tefPollTimeoutMs = useMemo(() => {
    // V05: telas com timeout de inatividade 120s.
    const raw = Number(process.env.NEXT_PUBLIC_TEF_POLL_TIMEOUT_MS ?? 120_000);
    return Number.isFinite(raw) ? Math.max(30_000, raw) : 120_000;
  }, []);

  const tefAutoCancelSeconds = useMemo(() => {
    // V05: 120s de inatividade; em autoatendimento preferimos encerrar a transação se ficar parada.
    const raw = Number(process.env.NEXT_PUBLIC_TEF_AUTO_CANCEL_SECONDS ?? 120);
    return Number.isFinite(raw) ? Math.max(15, raw) : 120;
  }, []);

  const tefCancelRequestTimeoutMs = useMemo(() => {
    const raw = Number(process.env.NEXT_PUBLIC_TEF_CANCEL_REQUEST_TIMEOUT_MS ?? 12000);
    return Number.isFinite(raw) ? Math.max(3000, raw) : 12000;
  }, []);

  const tefCancelReturnDelayMs = useMemo(() => {
    const raw = Number(process.env.NEXT_PUBLIC_TEF_CANCEL_RETURN_DELAY_MS ?? 3500);
    return Number.isFinite(raw) ? Math.max(1000, raw) : 3500;
  }, []);

  const tefCancelProgressSeconds = useMemo(() => {
    // Requisito de UX: timeout de "Cancelando no Leitor..." fixo em 60s.
    return 60;
  }, []);

  const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      let settled = false;
      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`${label} timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((value) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          reject(error);
        });
    });

  const printBusinessReceipt = String(process.env.NEXT_PUBLIC_PRINT_BUSINESS_RECEIPT ?? 'false').trim().toLowerCase() === 'true';

  const clearInsertPromptTimer = () => {
    if (insertPromptTimerRef.current) {
      window.clearTimeout(insertPromptTimerRef.current);
      insertPromptTimerRef.current = null;
    }
  };

  const getCurrentStoreCode = (): string => {
    const fromRef = normalizeStoreCode(storeCodeRef.current);
    if (fromRef) return fromRef;

    if (typeof window !== 'undefined') {
      const fromStorage = normalizeStoreCode(window.localStorage.getItem('tefStoreCodeOverride'));
      if (fromStorage) return fromStorage;
    }

    return VALID_SITEF_STORE_CODE;
  };

  useEffect(() => {
    let cancelled = false;

    const fromStorage = typeof window !== 'undefined'
      ? normalizeStoreCode(window.localStorage.getItem('tefStoreCodeOverride'))
      : '';
    if (fromStorage) {
      storeCodeRef.current = fromStorage;
    }

    const loadStoreCode = async () => {
      try {
        const resp = await fetch('/api/tef/service/store-code', {
          method: 'GET',
          cache: 'no-store',
        });
        const json = await resp.json().catch(() => null);
        const fromApi = normalizeStoreCode(json?.storeCode);
        if (!cancelled && fromApi) {
          storeCodeRef.current = fromApi;
        }
      } catch {
        // best-effort
      }
    };

    void loadStoreCode();

    return () => {
      cancelled = true;
    };
  }, []);

  // Função para gerar recibo completo e formatado
  const generateFormattedReceipt = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');
    
    if (selectedAppointment) {
      // Recibo com dados reais do agendamento
      const cpfFormatted = selectedAppointment.patient.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      const amountFormatted = selectedAppointment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const methodLabel =
        method === 'pix'
          ? 'PIX'
          : method === 'debit'
            ? 'Débito'
            : method === 'wallet'
              ? 'Carteira Digital'
              : installments && installments > 1
                ? `Crédito ${installments}x`
                : 'Crédito à vista';
      
      return `
========================================
       LUNA VITA CLINICA
    RECIBO DE PAGAMENTO
========================================

Data/Hora: ${dateStr} ${timeStr}

----------------------------------------

DADOS DO PACIENTE
Nome: ${selectedAppointment.patient.name}
CPF: ${cpfFormatted}

AGENDAMENTO
Data: ${selectedAppointment.date}
Horario: ${selectedAppointment.time}
${selectedAppointment.doctor ? `Medico: ${selectedAppointment.doctor}` : ''}
${selectedAppointment.specialty ? `Especialidade: ${selectedAppointment.specialty}` : ''}

----------------------------------------

        VALOR PAGO
        ${amountFormatted}

    Forma: ${methodLabel}

----------------------------------------

    PAGAMENTO CONFIRMADO
    Aguarde ser chamado

  Obrigado pela preferencia!

========================================
`;
    } else {
      // Recibo de teste com dados fictícios
      return `
========================================
       LUNA VITA CLINICA
    RECIBO DE PAGAMENTO
         [TESTE]
========================================

Data/Hora: ${dateStr} ${timeStr}

----------------------------------------

DADOS DO PACIENTE
Nome: Paciente Teste Silva
CPF: 123.456.789-00

AGENDAMENTO
Data: ${dateStr}
Horario: 14:30
Medico: Dr. Joao Silva
Especialidade: Cardiologia

----------------------------------------

        VALOR PAGO
        R$ 150,00

    Forma: ${method === 'pix' ? 'PIX' : method === 'debit' ? 'Debito' : method === 'wallet' ? 'Carteira Digital' : 'Credito'}

----------------------------------------

    PAGAMENTO CONFIRMADO
    Aguarde ser chamado

  Obrigado pela preferencia!

========================================

   [RECIBO SIMULADO - TESTE]
`;
    }
  };

  const enqueuePrintReceipt = async (): Promise<boolean> => {
    try {
      // Gerar recibo completo e formatado
      const formattedReceipt = generateFormattedReceipt();
      
      // Preparar dados para envio à API
      const receiptData = selectedAppointment
        ? {
            terminalId: 'TOTEM-001',
            tenantId: 'tenant-1',
            receiptType: 'PAYMENT',
            payload: toBase64Utf8(formattedReceipt),
            priority: 0,
            appointmentId: selectedAppointment.id,
            metadata: JSON.stringify({
              patientName: selectedAppointment.patient.name,
              cpf: selectedAppointment.patient.cpf,
              amount: selectedAppointment.amount,
              paymentMethod: method,
              installments: installments,
              date: selectedAppointment.date,
              time: selectedAppointment.time,
              doctor: selectedAppointment.doctor,
              specialty: selectedAppointment.specialty,
            }),
          }
        : {
            terminalId: 'TOTEM-001',
            tenantId: 'tenant-1',
            receiptType: 'TEST',
            payload: toBase64Utf8(formattedReceipt),
            priority: 0,
            metadata: JSON.stringify({
              testReceipt: true,
              generatedAt: new Date().toISOString(),
            }),
          };

      const response = await fetch(`${API_BASE_URL}/api/print-queue/enqueue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptData),
      });

      if (response.ok) {
        // Avoid logging receipt content in production (can contain sensitive data).
        await response.json().catch(() => null);
        return true;
      } else {
        console.error('[PRINT] Erro ao enfileirar recibo');
        return false;
      }
    } catch (error) {
      console.error('[PRINT] Erro:', error);
      return false;
    }
  };

  const describeError = (e: unknown): string => {
    const anyErr = e as any;
    return String(anyErr?.details?.detail ?? anyErr?.details?.error ?? anyErr?.message ?? anyErr ?? 'erro desconhecido');
  };

  const isNotAuthorizedError = (value: string | null | undefined): boolean => {
    const v = String(value || '').toLowerCase();
    return v.includes('nao autorizado')
      || v.includes('não autorizado')
      || v.includes('transacao negada')
      || v.includes('transação negada')
      || v.includes('erro simulacao: 04')
      || v.includes('erro simulacao 04');
  };

  const toCustomerTefError = (
    raw: string | null | undefined,
    fallback = 'Falha no pagamento',
    currentStoreCode?: string
  ): string => {
    const original = String(raw || '').trim();
    if (!original) return fallback;
    const v = normalizeForMatch(original);
    const normalizedStoreCode = normalizeStoreCode(currentStoreCode);
    const isStoreCodeDifferentFromValid =
      Boolean(normalizedStoreCode) && normalizedStoreCode !== VALID_SITEF_STORE_CODE;

    // Regra de homologação: 3 cenários distintos (não misturar)
    // 1) IdLoja inválido/alterado => Não existe Conf.
    if (v.includes('nao existe conf') || v.includes('nao existe config')) {
      return INVALID_STORE_CODE_MESSAGE;
    }
    // 2) TLS alterado/incompatível => Servidor Inoperante
    if (v.includes('tls') || v.includes('sitdemo nao suportado')) {
      return 'Servidor Inoperante';
    }
    // 3) SitDemo fechado/sem conexão => Sem conexão com servidor
    // Observação: em alguns caminhos o erro já chega "traduzido" como
    // "Sem conexão com servidor" (vindo do wrapper de HTTP).
    // Se o IdLoja está alterado, priorizamos o cenário de homologação
    // "Não existe Conf." para evitar falso diagnóstico de rede.
    if (v.includes('sem conexao com servidor')) {
      if (isStoreCodeDifferentFromValid) {
        return INVALID_STORE_CODE_MESSAGE;
      }
      return 'Sem conexão com servidor';
    }
    if (v.includes('failed to fetch') || v.includes('networkerror') || v.includes('network request failed')) {
      if (isStoreCodeDifferentFromValid) {
        return INVALID_STORE_CODE_MESSAGE;
      }
      return 'Sem conexão com servidor';
    }
    // Alguns ambientes retornam apenas erro técnico genérico (errorId/tef_error) para IdLoja inválido.
    // Nesse caso, usamos o contexto do IdLoja configurado para manter a regra do cenário 1.
    if (
      isStoreCodeDifferentFromValid
      && (v.includes('tef_error')
        || v.includes('errorid=')
        || v.includes('configuraintsitefinterativo')
        || v.includes('codigo da loja')
        || v.includes('codigo loja')
        || v.includes('store_code'))
    ) {
      return INVALID_STORE_CODE_MESSAGE;
    }
    if (v.includes('tef_error') || v.includes('errorid=')) {
      // Erro técnico genérico sem evidência de IdLoja inválido:
      // manter mensagem neutra para não acusar configuração errada indevidamente.
      return fallback;
    }
    if (v.includes('cartao removido') || v.includes('cartão removido')) {
      return 'Operação cancelada. Cartão removido.';
    }
    if (v.includes('cancel')) {
      return 'Operação cancelada.';
    }
    if (v.includes('timeout')) {
      return 'Tempo esgotado. Tente novamente.';
    }

    // Se já for uma mensagem amigável, preserva.
    return original;
  };

  const safeCancelTef = async (sid: string): Promise<string[]> => {
    const errors: string[] = [];
    if (!sid) return errors;
    let cancelAccepted = false;
    try {
      const cancelResult = await withTimeout(tefCancel(sid), tefCancelRequestTimeoutMs, 'tefCancel');
      cancelAccepted = Boolean((cancelResult as any)?.ok);
      if (!cancelAccepted) {
        errors.push(
          `cancel: ${String((cancelResult as any)?.error ?? (cancelResult as any)?.message ?? 'cancel not accepted')}`
        );
      }
    } catch (e) {
      errors.push(`cancel: ${describeError(e)}`);
    }

    // Important: do NOT send back(21) immediately after cancel(23) when cancel was accepted.
    // Sending both in sequence can overwrite command 23 before the runner consumes it.
    if (!cancelAccepted) {
      try {
        const backResult = await withTimeout(tefBack(sid), tefCancelRequestTimeoutMs, 'tefBack');
        if (!Boolean((backResult as any)?.ok)) {
          errors.push(
            `back: ${String((backResult as any)?.error ?? (backResult as any)?.message ?? 'back not accepted')}`
          );
        }
      } catch (e) {
        errors.push(`back: ${describeError(e)}`);
      }
    }
    return errors;
  };

  const readSessionSnapshot = async (): Promise<SessionSnapshot | null> => {
    try {
      const resp = await withTimeout(
        fetch('/api/tef/pendencies/status', { method: 'GET', cache: 'no-store' }),
        tefCancelRequestTimeoutMs,
        'pendencies/status'
      );
      if (!resp.ok) return null;
      return (await withTimeout(resp.json(), tefCancelRequestTimeoutMs, 'pendencies/status json')) as SessionSnapshot;
    } catch {
      return null;
    }
  };

  const runPendenciesAndWait = async (maxMs: number): Promise<SessionSnapshot | null> => {
    try {
      await withTimeout(
        fetch('/api/tef/pendencies/run', { method: 'POST' }),
        tefCancelRequestTimeoutMs,
        'pendencies/run'
      );
    } catch {
      // best-effort
    }

    const startedAt = Date.now();
    let snap = await readSessionSnapshot();
    while (snap?.running && Date.now() - startedAt < maxMs) {
      await delay(1200);
      snap = await readSessionSnapshot();
    }

    return snap;
  };

  const collectSaleIdsForCancel = (primarySaleId: string, snap: SessionSnapshot | null): string[] => {
    const ids = [
      primarySaleId,
      String(snap?.saleId || ''),
      String(snap?.status?.saleId || ''),
    ]
      .map((v) => v.trim())
      .filter(Boolean);
    return Array.from(new Set(ids));
  };

  const getInProgressSaleIds = async (
    saleIds: string[],
    attempt: number,
    errors: string[]
  ): Promise<string[]> => {
    const inProgress: string[] = [];
    const uniqueIds = Array.from(new Set(saleIds.map((v) => v.trim()).filter(Boolean)));

    for (const saleIdToCheck of uniqueIds) {
      try {
        const st = await withTimeout(
          fetchTefStatus(saleIdToCheck),
          tefCancelRequestTimeoutMs,
          `tefStatus(${saleIdToCheck})`
        );
        if (st.status === 'IN_PROGRESS') {
          inProgress.push(saleIdToCheck);
        }
      } catch (e) {
        // Unknown status is treated as still open to avoid leaving terminal active.
        errors.push(`tentativa ${attempt} (${saleIdToCheck}): status-check: ${describeError(e)}`);
        inProgress.push(saleIdToCheck);
      }
    }

    return inProgress;
  };

  const isSessionClean = (snap: SessionSnapshot | null): boolean => {
    const pendingCount = Math.max(0, Number(snap?.pendingCount ?? 0));
    const running = Boolean(snap?.running);
    return pendingCount === 0 && !running;
  };

  const ensureTefSessionClosed = async (sid: string): Promise<{ ok: boolean; snap: SessionSnapshot | null; errors: string[] }> => {
    const errors: string[] = [];
    let snap: SessionSnapshot | null = await readSessionSnapshot();
    const trackedSaleIds = new Set<string>(collectSaleIdsForCancel(sid, snap));

    for (let attempt = 1; attempt <= 3; attempt++) {
      const saleIds = collectSaleIdsForCancel(sid, snap);
      for (const saleId of saleIds) trackedSaleIds.add(saleId);

      for (const saleIdToCancel of saleIds) {
        const cancelErrors = await safeCancelTef(saleIdToCancel);
        if (cancelErrors.length) {
          errors.push(...cancelErrors.map((line) => `tentativa ${attempt} (${saleIdToCancel}): ${line}`));
        }
      }

      snap = await runPendenciesAndWait(20_000);
      for (const saleId of collectSaleIdsForCancel(sid, snap)) trackedSaleIds.add(saleId);

      const inProgressSaleIds = await getInProgressSaleIds(Array.from(trackedSaleIds), attempt, errors);
      if (isSessionClean(snap) && inProgressSaleIds.length === 0) {
        return { ok: true, snap, errors };
      }

      await delay(500);
    }

    const finalSnap = await readSessionSnapshot();
    for (const saleId of collectSaleIdsForCancel(sid, finalSnap)) trackedSaleIds.add(saleId);

    const finalInProgressSaleIds = await getInProgressSaleIds(Array.from(trackedSaleIds), 99, errors);
    if (isSessionClean(finalSnap) && finalInProgressSaleIds.length === 0) {
      return { ok: true, snap: finalSnap, errors };
    }
    return { ok: false, snap: finalSnap ?? snap, errors };
  };

  const openTefSession = async () => {
    setTefHint('Abrindo sessão TEF...');

    let snap = await readSessionSnapshot();
    if (snap?.running) {
      setTefHint('Aguardando finalização de sessão anterior...');
      const startedAt = Date.now();
      while (snap?.running && Date.now() - startedAt < 12000) {
        await delay(1200);
        snap = await readSessionSnapshot();
      }
    }

    // Seq.07 (V05): a automação deve verificar/rodar pendências (modalidade 130) após reinício,
    // sem depender de interação do usuário. Alguns ambientes não suportam "pending/count"; por isso
    // rodamos o job 130 de forma defensiva ao abrir sessão.
    const pendingCount = Math.max(0, Number(snap?.pendingCount ?? 0));
    if (pendingCount > 0) {
      setTefHint(`Tratando pendências do TEF (${pendingCount})...`);
    } else {
      setTefHint('Verificando pendências do TEF...');
    }
    snap = await runPendenciesAndWait(30000);
    const remaining = Math.max(0, Number(snap?.pendingCount ?? 0));
    if (remaining > 0) {
      throw new Error(`Sessão TEF com pendências abertas (${remaining}). Execute o tratamento (130) e tente novamente.`);
    }

    setTefHint('Sessão TEF pronta.');
  };

  const clearCancelTimers = () => {
    if (cancelIntervalRef.current) {
      window.clearInterval(cancelIntervalRef.current);
      cancelIntervalRef.current = null;
    }
    if (cancelTimeoutRef.current) {
      window.clearTimeout(cancelTimeoutRef.current);
      cancelTimeoutRef.current = null;
    }
    setCancelCountdown(0);
  };

  const clearCancelProgressTimer = () => {
    if (cancelProgressIntervalRef.current) {
      window.clearInterval(cancelProgressIntervalRef.current);
      cancelProgressIntervalRef.current = null;
    }
    setCancelProgressCountdown(0);
  };

  const startCancelProgressTimer = () => {
    clearCancelProgressTimer();
    setCancelProgressCountdown(tefCancelProgressSeconds);
    cancelProgressIntervalRef.current = window.setInterval(() => {
      setCancelProgressCountdown((prev) => {
        if (prev <= 1) {
          if (cancelProgressIntervalRef.current) {
            window.clearInterval(cancelProgressIntervalRef.current);
            cancelProgressIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const returnToStart = () => {
    if (typeof onCancelToStart === 'function') {
      onCancelToStart();
      return;
    }
    onBack();
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = () => {
    setShowCancelConfirm(false);
    void cancelCurrentFlow('Operação cancelada pelo operador na tela de pagamento.');
  };

  const handleCancelReject = () => {
    setShowCancelConfirm(false);
    // Continua a transação (não faz nada)
  };

  const finalizeCancelledFlow = (message?: string) => {
    clearCancelTimers();
    clearCancelProgressTimer();
    setTefHint('');
    setTefStatus('ERROR');
    setPixQrCodeImage('');
    setIsCancelledFlow(true);
    setTefError(message || 'Operação anulada');
    saleIdRef.current = '';
    setSaleId('');
    setAutoReturnCountdown(0);
    if (autoReturnIntervalRef.current) {
      window.clearInterval(autoReturnIntervalRef.current);
      autoReturnIntervalRef.current = null;
    }
    if (autoReturnTimeoutRef.current) {
      window.clearTimeout(autoReturnTimeoutRef.current);
      autoReturnTimeoutRef.current = null;
    }
    if (cancelReturnTimerRef.current) {
      window.clearTimeout(cancelReturnTimerRef.current);
      cancelReturnTimerRef.current = null;
    }
    cancelReturnTimerRef.current = window.setTimeout(() => {
      cancelReturnTimerRef.current = null;
      returnToStart();
    }, tefCancelReturnDelayMs);
  };

  const cancelCurrentFlow = async (reason: string) => {
    if (isCancelling) return;
    setIsCancelling(true);
    cancelInFlightRef.current = true;
    cancelReasonRef.current = reason;
    clearCancelTimers();
    if (autoReturnIntervalRef.current) {
      window.clearInterval(autoReturnIntervalRef.current);
      autoReturnIntervalRef.current = null;
    }
    if (autoReturnTimeoutRef.current) {
      window.clearTimeout(autoReturnTimeoutRef.current);
      autoReturnTimeoutRef.current = null;
    }
    setAutoReturnCountdown(0);
    setTefHint('Cancelando transação na maquininha...');
    setTefError('');
    startCancelProgressTimer();
    try {
      abortRef.current?.abort();
    } catch {
      // ignore
    }
    try {
      const sid = saleIdRef.current || saleId;
      const closed = await ensureTefSessionClosed(sid);
      const remaining = Math.max(0, Number(closed.snap?.pendingCount ?? 0));
      if (!closed.ok) {
        console.warn('[PAYMENT] cancelado sem liberar sessão TEF', {
          saleId: sid,
          pendingCount: remaining,
          running: Boolean(closed.snap?.running),
          errors: closed.errors,
        });
        setIsCancelledFlow(false);
        setTefStatus('ERROR');
        setTefError('Cancelamento enviado, mas a maquininha ainda não voltou ao estado inicial. Tente novamente.');
        setTefHint(
          remaining > 0 || Boolean(closed.snap?.running)
            ? `Pendências restantes: ${remaining}. Aguarde finalizar na maquininha e tente novamente.`
            : ''
        );
        return;
      }
      finalizeCancelledFlow('Operação anulada');
    } catch (e) {
      console.warn('[PAYMENT] falha inesperada ao cancelar', {
        reason,
        error: describeError(e),
      });
      setIsCancelledFlow(false);
      setTefStatus('ERROR');
      setTefError('Falha ao cancelar a transação. Verifique a maquininha e tente novamente.');
      setTefHint('');
    } finally {
      clearCancelProgressTimer();
      cancelInFlightRef.current = false;
      setIsCancelling(false);
    }
  };

  const cancelAndReturnToPreviousStep = async (reason: string) => {
    if (isCancelling) return;
    setIsCancelling(true);
    cancelInFlightRef.current = true;
    cancelReasonRef.current = reason;
    clearCancelTimers();
    if (autoReturnIntervalRef.current) {
      window.clearInterval(autoReturnIntervalRef.current);
      autoReturnIntervalRef.current = null;
    }
    if (autoReturnTimeoutRef.current) {
      window.clearTimeout(autoReturnTimeoutRef.current);
      autoReturnTimeoutRef.current = null;
    }
    setAutoReturnCountdown(0);
    setTefHint('Cancelando transação para voltar à etapa anterior...');
    setTefError('');
    startCancelProgressTimer();
    try {
      abortRef.current?.abort();
    } catch {
      // ignore
    }
    try {
      const sid = saleIdRef.current || saleId;
      const closed = await ensureTefSessionClosed(sid);
      const remaining = Math.max(0, Number(closed.snap?.pendingCount ?? 0));
      const sessionRunning = Boolean(closed.snap?.running);
      const canProceedBackBestEffort = !closed.ok && remaining === 0 && !sessionRunning && closed.errors.length === 0;
      if (!closed.ok) {
        if (canProceedBackBestEffort) {
          console.warn('[PAYMENT] retorno para etapa anterior em modo best-effort (status ainda inconsistente)', {
            saleId: sid,
            pendingCount: remaining,
            running: sessionRunning,
          });
          setIsCancelledFlow(false);
          setTefStatus('IDLE');
          setPixQrCodeImage('');
          setTefError('');
          setTefHint('');
          saleIdRef.current = '';
          setSaleId('');
          onBack();
          return;
        }

        console.warn('[PAYMENT] não foi possível voltar etapa: sessão TEF não liberada', {
          saleId: sid,
          pendingCount: remaining,
          running: sessionRunning,
          errors: closed.errors,
        });
        setIsCancelledFlow(false);
        setTefStatus('ERROR');
        setTefError('Cancelamento enviado, mas a maquininha ainda não voltou ao estado inicial. Tente novamente.');
        setTefHint(
          remaining > 0 || Boolean(closed.snap?.running)
            ? `Pendências restantes: ${remaining}. Aguarde finalizar na maquininha e tente novamente.`
            : ''
        );
        return;
      }

      setIsCancelledFlow(false);
      setTefStatus('IDLE');
      setTefError('');
      setTefHint('');
      saleIdRef.current = '';
      setSaleId('');
      onBack();
    } catch (e) {
      console.warn('[PAYMENT] falha inesperada ao cancelar para voltar etapa', {
        reason,
        error: describeError(e),
      });
      setIsCancelledFlow(false);
      setTefStatus('ERROR');
      setTefError('Falha ao cancelar para voltar à etapa anterior. Verifique a maquininha e tente novamente.');
      setTefHint('');
    } finally {
      clearCancelProgressTimer();
      cancelInFlightRef.current = false;
      setIsCancelling(false);
    }
  };

  const startCancelCountdown = () => {
    clearCancelTimers();
    setCancelCountdown(tefAutoCancelSeconds);

    cancelIntervalRef.current = window.setInterval(() => {
      setCancelCountdown((prev) => {
        if (prev <= 1) {
          if (cancelIntervalRef.current) {
            window.clearInterval(cancelIntervalRef.current);
            cancelIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    cancelTimeoutRef.current = window.setTimeout(() => {
      void cancelCurrentFlow(
        `Time out excedido. Operação cancelada automaticamente após ${tefAutoCancelSeconds} segundos sem interação.`
      );
    }, tefAutoCancelSeconds * 1000);
  };

  const scheduleReturnToInitial = (seconds: number = 30, toStart: boolean = false) => {
    if (autoReturnIntervalRef.current) {
      window.clearInterval(autoReturnIntervalRef.current);
      autoReturnIntervalRef.current = null;
    }
    if (autoReturnTimeoutRef.current) {
      window.clearTimeout(autoReturnTimeoutRef.current);
      autoReturnTimeoutRef.current = null;
    }

    const total = Math.max(1, seconds);
    setAutoReturnCountdown(total);
    autoReturnIntervalRef.current = window.setInterval(() => {
      setAutoReturnCountdown((prev) => {
        if (prev <= 1) {
          if (autoReturnIntervalRef.current) {
            window.clearInterval(autoReturnIntervalRef.current);
            autoReturnIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    autoReturnTimeoutRef.current = window.setTimeout(() => {
      if (autoReturnIntervalRef.current) {
        window.clearInterval(autoReturnIntervalRef.current);
        autoReturnIntervalRef.current = null;
      }
      autoReturnTimeoutRef.current = null;
      if (toStart) {
        returnToStart();
        return;
      }
      onBack();
    }, total * 1000);
  };

  const finalizeApprovedFlow = useCallback(
    async (sid: string) => {
      const currentSaleId = String(sid || '').trim();
      if (!currentSaleId) return;
      if (completedSalesRef.current.has(currentSaleId)) return;
      if (completingSaleRef.current === currentSaleId) return;

      completingSaleRef.current = currentSaleId;
      try {
        const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
        clearCancelTimers();
        if (method === 'debit' || method === 'credit') {
          approvedPromptSeenRef.current = true;
          setTefHint('Transação aprovada');
          await wait(1100);

          removeCardPromptSeenRef.current = true;
          setTefHint('Retire o cartão');
          await wait(1300);
        }

        setTefStatus('FINALIZING');
        setTefHint('Finalizando pagamento e imprimindo comprovante...');

        // V05: imprimir o cupom TEF antes de confirmar/finalizar.
        // Em caso de falha após 121/122, deve ser enviada NÃO-confirmação para evitar cobrança indevida.
        let confirmFailureReason = '';
        let printedOk = true;

        // Optional clinic/business receipt (disabled by default in TEF-only flow).
        if (printBusinessReceipt) {
          await enqueuePrintReceipt();
        }

        // 1) Print TEF receipt(s)
        try {
          setTefHint('Imprimindo comprovante TEF...');
          await tefPrint(currentSaleId);
          printedOk = true;
        } catch (e: any) {
          printedOk = false;
          const detail = e?.details?.error ?? e?.details?.detail ?? e?.message;
          confirmFailureReason = String(detail || 'Falha na impressão do comprovante TEF.');
          console.warn('[PAYMENT] Falha ao imprimir comprovante TEF', e);
        }

        // 2) Finalize: if print succeeded, confirm (best-effort).
        // If print failed, force non-confirmation via cancel to avoid indevida cobrança.
        let confirmedOk = true;
        try {
          setTefHint('');
          if (printedOk) {
            // /tef/print may auto-confirm when a finalize-waiter exists.
            // Still call /tef/confirm as best-effort for back-compat.
            await tefConfirm(currentSaleId, true);
          } else {
            const cancelResp = await tefCancel(currentSaleId);
            if (cancelResp?.ok !== true) {
              confirmedOk = false;
              if (!confirmFailureReason) confirmFailureReason = 'Falha ao não-confirmar a transação após erro de impressão.';
            }
          }
        } catch (e: any) {
          confirmedOk = false;
          console.warn('[PAYMENT] Falha ao finalizar TEF no bridge', e);
          const detail = e?.details?.detail ?? e?.details?.error ?? e?.message;
          if (detail && !confirmFailureReason) confirmFailureReason = String(detail);
        }

        const printOrConfirmIssue =
          !confirmedOk
            ? (confirmFailureReason || 'Falha ao confirmar pagamento no TEF.')
            : '';
        if (printOrConfirmIssue) {
          // O pagamento já foi aprovado no autorizador; não exibimos erro bloqueante nessa etapa.
          // Mantemos o motivo para a tela seguinte oferecer reimpressão manual.
          console.warn('[PAYMENT] aprovação com pendência de impressão/confirm', {
            saleId: currentSaleId,
            reason: printOrConfirmIssue,
          });
        }

        // Only after PRINT+CONFIRM do we mark the appointment as paid.
        try {
          if (printedOk && confirmedOk && selectedAppointment?.id) {
            await appointmentAPI.updatePaid(selectedAppointment.id, true);
          }
        } catch (e) {
          console.warn('[PAYMENT] Falha ao marcar como pago (best-effort)', e);
        }

        if (printedOk && confirmedOk) {
          completedSalesRef.current.add(currentSaleId);
          onComplete({
            saleId: currentSaleId,
            printOrConfirmIssue: printOrConfirmIssue || undefined,
          });
        } else {
          // V05: erro após 121/122 deve resultar em não-confirmação e bloqueio/retorno ao menu inicial.
          const mode = String(process.env.NEXT_PUBLIC_AUTOATENDIMENTO_ERROR_STYLE ?? 'GENERIC')
            .trim()
            .toUpperCase();
          const printerMsg =
            mode === 'SPECIFIC'
              ? 'Falha na impressora. Chame o gerente da loja.'
              : 'Sistema fora do ar.';
          const base = confirmFailureReason || 'Pagamento não finalizado.';
          setTefStatus('ERROR');
          setTefError(`${base}\n\n${printerMsg}`);
          scheduleReturnToInitial(30, true);
        }
      } finally {
        if (completingSaleRef.current === currentSaleId) {
          completingSaleRef.current = '';
        }
      }
    },
    [method, onComplete, printBusinessReceipt, selectedAppointment?.id]
  );

  const startTefIfNeeded = async (newAttempt = false, allowBusyRecovery = true) => {
    if (!selectedAppointment) {
      setTefStatus('ERROR');
      setTefError('Agendamento não encontrado');
      return;
    }
    if (amountCents <= 0) {
      setTefStatus('ERROR');
      setTefError('Valor inválido');
      return;
    }

    // Cancel pending auto-return timers before starting/retrying a new sale.
    if (autoReturnIntervalRef.current) {
      window.clearInterval(autoReturnIntervalRef.current);
      autoReturnIntervalRef.current = null;
    }
    if (autoReturnTimeoutRef.current) {
      window.clearTimeout(autoReturnTimeoutRef.current);
      autoReturnTimeoutRef.current = null;
    }
    setAutoReturnCountdown(0);
    setIsCancelledFlow(false);

    const previousSaleId = saleIdRef.current || saleId;
    // Create a saleId unique per attempt.
    const sid = newAttempt || !previousSaleId ? `APPT-${selectedAppointment.id}-${Date.now()}` : previousSaleId;
    saleIdRef.current = sid;
    setSaleId(sid);
    setIsCancelling(false);
    cancelReasonRef.current = '';
    lastProgressMessageRef.current = '';

    setTefError('');
    setTefHint('');
    setTefStatus('STARTING');
    startCancelCountdown();

    // Cancel any previous poll
    try {
      abortRef.current?.abort();
    } catch {
      // ignore
    }
    abortRef.current = new AbortController();

    try {
      // New retries must explicitly close the previous sale to avoid "tef busy".
      if (newAttempt && previousSaleId && previousSaleId !== sid) {
        await safeCancelTef(previousSaleId);
      }

      await openTefSession();

      // Kick off TEF transaction (siTEF bridge decides command by items.method)
      const tefChargePayload = {
        saleId: sid,
        amountCents,
        orderRef: buildCupomFiscal(),
        paymentMethod: method === 'wallet' ? 'pix' : method,
        command: method === 'wallet' ? '122' : method === 'pix' ? 'PIX' : method === 'debit' ? 'DEBIT' : 'CREDIT',
        items: {
          method,
          installments: installments ?? 1,
          // Força seleção correta no menu do SiTef:
          // 1 = à vista, 2 = parcelado (estabelecimento). (roteiro v3.1)
          paymentChoice: method === 'credit' ? (installments && installments > 1 ? '2' : '1') : undefined,
          paymentModeChoice: method === 'credit' ? (installments && installments > 1 ? '2' : '1') : undefined,
          appointmentId: selectedAppointment.id,
        },
        operatorId: 'TOTEM',
        storeId: 'TOTEM-001',
      };
      
      console.log('[PaymentProcessing] TEF Charge - Payload:', {
        method,
        installments,
        payloadInstallments: tefChargePayload.items.installments,
        fullPayload: tefChargePayload
      });
      
      await tefCharge(tefChargePayload);
      // Exibe uma vez no início, junto com a maquininha.
      cardPromptShownRef.current = true;
      passwordPromptSeenRef.current = false;
      approvedPromptSeenRef.current = false;
      removeCardPromptSeenRef.current = false;
      setTefHint(method === 'pix' ? 'Leia o QR Code' : 'Insira, passe ou aproxime');
      setTefStatus('IN_PROGRESS');

      const result = await pollTefStatus(sid, {
        intervalMs: 1000,
        timeoutMs: tefPollTimeoutMs,
        signal: abortRef.current.signal,
        onProgress: (status) => {
          // V05: exibir mensagens retornadas pela CliSiTef obrigatoriamente (sem manipulação).
          const rawMsg = extractRealtimeTefPrompt(status);
          if (rawMsg) {
            // Seq.06 (V05): time-out por interação/tela (reset a cada nova mensagem).
            if (rawMsg !== lastProgressMessageRef.current) {
              lastProgressMessageRef.current = rawMsg;
              startCancelCountdown();
            }
            const friendlyPrompt = toFriendlyTefPrompt(rawMsg);
            if (friendlyPrompt === 'Transação aprovada') {
              approvedPromptSeenRef.current = true;
              setTefHint('Transação aprovada');
            } else if (friendlyPrompt === 'Retire o cartão') {
              approvedPromptSeenRef.current = true;
              removeCardPromptSeenRef.current = true;
              setTefHint('Retire o cartão');
            } else if (friendlyPrompt === 'Insira sua senha') {
              if (method === 'pix') {
                setTefHint('Leia o QR Code');
              } else {
                passwordPromptSeenRef.current = true;
                setTefHint('Insira sua senha');
              }
            } else if (friendlyPrompt === 'Insira, passe ou aproxime') {
              // Antes da senha, mantém instrução de cartão visível.
              if (method === 'pix') {
                setTefHint('Leia o QR Code');
              } else if (!passwordPromptSeenRef.current) {
                cardPromptShownRef.current = true;
                setTefHint('Insira, passe ou aproxime');
              }
            } else {
              // Não mostrar códigos/mensagens técnicas ao cliente.
              // Mantém apenas as instruções essenciais do fluxo da maquininha.
              if (removeCardPromptSeenRef.current) {
                setTefHint('Retire o cartão');
              } else if (approvedPromptSeenRef.current) {
                setTefHint('Transação aprovada');
              } else if (method === 'pix') {
                setTefHint('Leia o QR Code');
              } else if (passwordPromptSeenRef.current) {
                setTefHint('Insira sua senha');
              } else {
                cardPromptShownRef.current = true;
                setTefHint('Insira, passe ou aproxime');
              }
            }
          } else {
            lastProgressMessageRef.current = '';
            if (removeCardPromptSeenRef.current) {
              setTefHint('Retire o cartão');
            } else if (approvedPromptSeenRef.current) {
              setTefHint('Transação aprovada');
            } else if (method === 'pix') {
              setTefHint('Leia o QR Code');
            } else if (!passwordPromptSeenRef.current) {
              setTefHint('Insira, passe ou aproxime');
            } else {
              setTefHint('Insira sua senha');
            }
          }

          // Extract QR code for PIX from approvedData
          if (method === 'pix' && status.approvedData) {
            const qrCode = 
              (status.approvedData as any)?.qrCodeImage ||
              (status.approvedData as any)?.qrcode ||
              (status.approvedData as any)?.pixImage ||
              (status.approvedData as any)?.QRCode;
            
            if (qrCode && typeof qrCode === 'string') {
              // Ensure it's properly formatted as base64 image
              const imageData = qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`;
              setPixQrCodeImage(imageData);
            }
          }
        }
      });

      if (result.status === 'APPROVED') {
        await finalizeApprovedFlow(sid);
        return;
      }

      if (result.status === 'DECLINED') {
        clearCancelTimers();
        cardPromptShownRef.current = false;
        passwordPromptSeenRef.current = false;
        approvedPromptSeenRef.current = false;
        removeCardPromptSeenRef.current = false;
        const raw = String((result as any)?.lastMessage ?? '').trim();
        setTefHint(sanitizeTefHint(raw));
        await safeCancelTef(sid);
        setTefStatus('DECLINED');
        setPixQrCodeImage('');
        const customer = toCustomerTefError(raw, 'Não autorizado', getCurrentStoreCode());
        const forceExact = customer === 'Sem conexão com servidor' || customer === INVALID_STORE_CODE_MESSAGE || customer === 'Servidor Inoperante';
        setTefError(forceExact ? customer : (raw ? `${raw}\n\n${customer}` : customer));
        scheduleReturnToInitial(30, true);
        return;
      }

      clearCancelTimers();
      cardPromptShownRef.current = false;
      passwordPromptSeenRef.current = false;
      approvedPromptSeenRef.current = false;
      removeCardPromptSeenRef.current = false;
      const raw = String((result as any)?.lastMessage ?? '').trim();
      setTefHint(sanitizeTefHint(raw));
      await safeCancelTef(sid);
      setTefStatus('ERROR');
      setPixQrCodeImage('');
      // V05: mostrar MsgCliSiTef + descrição (opcional) abaixo.
      const msg = String(result.error || '').trim();
      const customer = toCustomerTefError(result.error, 'Erro na transação', getCurrentStoreCode());
      const base = raw || msg;
      const forceExact = customer === 'Sem conexão com servidor' || customer === INVALID_STORE_CODE_MESSAGE || customer === 'Servidor Inoperante';
      setTefError(forceExact ? customer : (base ? `${base}\n\n${customer}` : customer));
      scheduleReturnToInitial(30);
    } catch (e: any) {
      const msg = String(e?.message || e);
      const busySaleId = String(e?.details?.busySaleId ?? '').trim();
      const statusCode = Number(e?.status ?? e?.details?.status ?? 0);
      const isBusyConflict = msg.toLowerCase().includes('tef busy') || statusCode === 409;

      if (isBusyConflict) {
        clearCancelTimers();
        setTefHint('');
        if (allowBusyRecovery) {
          setTefStatus('STARTING');
          setTefError('Finalizando transação anterior na maquininha...');
          const recoveryTargets = Array.from(
            new Set(
              [busySaleId, previousSaleId, sid, saleIdRef.current, saleId]
                .map((v) => String(v || '').trim())
                .filter(Boolean)
            )
          );
          for (const target of recoveryTargets) {
            await safeCancelTef(target);
          }
          await runPendenciesAndWait(20_000);
          await new Promise((resolve) => window.setTimeout(resolve, 400));
          await startTefIfNeeded(true, false);
          return;
        }

        setTefStatus('ERROR');
        setTefError('Maquininha ocupada por outra transação. Aguarde alguns segundos e tente novamente.');
        scheduleReturnToInitial(30);
        return;
      }

      if (msg === 'cancelled') {
        // If this abort was caused by explicit "Cancelar operação", let cancelCurrentFlow
        // decide when it is safe to return to start (only after terminal/session is closed).
        if (!cancelInFlightRef.current) {
          setTefHint('');
        }
        cancelReasonRef.current = '';
        return;
      }
      if (msg === 'timeout') {
        clearCancelTimers();
        cardPromptShownRef.current = false;
        passwordPromptSeenRef.current = false;
        approvedPromptSeenRef.current = false;
        removeCardPromptSeenRef.current = false;
        setTefHint('');
        await safeCancelTef(sid);
        setTefStatus('ERROR');
        setTefError('Tempo esgotado aguardando o TEF.\n\nEncerrando sessão da maquininha...');
        scheduleReturnToInitial(30);
        return;
      }
      if (isNotAuthorizedError(msg)) {
        clearCancelTimers();
        cardPromptShownRef.current = false;
        passwordPromptSeenRef.current = false;
        approvedPromptSeenRef.current = false;
        removeCardPromptSeenRef.current = false;
        setTefHint('');
        await safeCancelTef(sid);
        setTefStatus('DECLINED');
        setTefError(`${msg}\n\nNão autorizado`);
        scheduleReturnToInitial(30, true);
        return;
      }
      clearCancelTimers();
      cardPromptShownRef.current = false;
      passwordPromptSeenRef.current = false;
      approvedPromptSeenRef.current = false;
      removeCardPromptSeenRef.current = false;
      setTefHint('');
      await safeCancelTef(sid);
      setTefStatus('ERROR');
      setTefError(toCustomerTefError(msg, 'Falha no pagamento', getCurrentStoreCode()));
      scheduleReturnToInitial(30);
    }
  };

  useEffect(() => {
    const inFlight = tefStatus === 'STARTING' || tefStatus === 'IN_PROGRESS';
    const hasBridgeInstruction = Boolean(String(tefHint || '').trim());

    if (!inFlight || hasBridgeInstruction) {
      clearInsertPromptTimer();
      setShowInsertPrompt(false);
      return;
    }

    if (!showInsertPrompt && !insertPromptTimerRef.current) {
      insertPromptTimerRef.current = window.setTimeout(() => {
        insertPromptTimerRef.current = null;
        setShowInsertPrompt(true);
      }, 5000);
    }

    return () => {
      // cleanup apenas do efeito atual (evita timer órfão em remount)
      if (!inFlight || hasBridgeInstruction) {
        clearInsertPromptTimer();
      }
    };
  }, [tefStatus, tefHint, showInsertPrompt]);

  useEffect(() => {
    const startKey = `${String(selectedAppointment?.id || '')}|${method}`;
    if (!selectedAppointment?.id) return;
    if (startEffectKeyRef.current === startKey) return;
    startEffectKeyRef.current = startKey;
    startEffectStartedAtRef.current = Date.now();

    // Start TEF automatically when arriving at this screen.
    // IMPORTANT: do not depend on `installments` here; in Seq 10 we can switch
    // UI label from parcelado -> avista via command 21 without restarting sale.
    void startTefIfNeeded();
    return () => {
      // In dev (React Strict Mode), effect cleanup can run immediately after mount.
      // Skipping destructive cleanup in this short window prevents losing an in-flight
      // sale while still allowing normal cleanup on real unmount/navigation.
      const elapsedMs = Date.now() - startEffectStartedAtRef.current;
      const isTransientDevCleanup = process.env.NODE_ENV !== 'production' && elapsedMs < 1200;
      if (isTransientDevCleanup) {
        return;
      }

      try {
        abortRef.current?.abort();
      } catch {
        // ignore
      }
      clearCancelTimers();
      clearCancelProgressTimer();
      clearInsertPromptTimer();
      if (autoReturnIntervalRef.current) {
        window.clearInterval(autoReturnIntervalRef.current);
        autoReturnIntervalRef.current = null;
      }
      if (autoReturnTimeoutRef.current) {
        window.clearTimeout(autoReturnTimeoutRef.current);
        autoReturnTimeoutRef.current = null;
      }
      if (cancelReturnTimerRef.current) {
        window.clearTimeout(cancelReturnTimerRef.current);
        cancelReturnTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAppointment?.id, method]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isF3Key(event)) return;
      if (event.defaultPrevented) return;
      if (event.repeat) return;
      if (!(tefStatus === 'STARTING' || tefStatus === 'IN_PROGRESS')) return;
      if (isCancelling) return;

      if (event.cancelable) event.preventDefault();
      event.stopPropagation();

      void cancelCurrentFlow('Operação cancelada via tecla F3.');
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [isCancelling, tefStatus]);

  // Defensive watchdog:
  // if polling flow is interrupted but bridge already moved sale to APPROVED,
  // force local completion so UI never stays stuck in "Processando pagamento".
  useEffect(() => {
    const sid = String(saleIdRef.current || saleId || '').trim();
    if (!sid) return;
    if (!(tefStatus === 'STARTING' || tefStatus === 'IN_PROGRESS')) return;
    if (completedSalesRef.current.has(sid)) return;

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      if (completedSalesRef.current.has(sid) || completingSaleRef.current === sid) return;
      try {
        const st = await withTimeout(fetchTefStatus(sid), tefCancelRequestTimeoutMs, `tefStatus/watchdog(${sid})`);
        if (st.status === 'APPROVED') {
          console.warn('[PAYMENT] watchdog detectou APPROVED e vai concluir fluxo', { saleId: sid });
          await finalizeApprovedFlow(sid);
        }
      } catch {
        // best-effort watchdog; main flow already handles errors/timeouts
      }
    };

    void tick();
    const interval = window.setInterval(() => {
      void tick();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [finalizeApprovedFlow, saleId, tefCancelRequestTimeoutMs, tefStatus]);

  const handleFooterBack = () => {
    if (isCancelling) return;
    if (tefStatus === 'FINALIZING') {
      return;
    }
    if (tefStatus === 'STARTING' || tefStatus === 'IN_PROGRESS') {
      const sid = saleIdRef.current || saleId;
      if (!sid) {
        onBack();
        return;
      }
      void cancelAndReturnToPreviousStep('Operação cancelada para retornar à etapa de seleção de pagamento.');
      return;
    }
    onBack();
  };

  const getMethodLabel = () => {
    if (method === 'pix') return 'PIX';
    if (method === 'debit') return 'Débito';
    if (method === 'wallet') return 'Carteira Digital';
    if (method === 'credit') {
      return installments === 1 ? 'Crédito à vista' : `Crédito ${installments}x`;
    }
    return '';
  };

  const steps = getFlowSteps(flow);
  const currentStep = flow === 'checkin' ? 3 : 1;
  const suppressPrintConfirmError =
    tefStatus === 'ERROR' &&
    /sitef_printer_name|falha ao imprimir\/confirmar comprovante tef|pagamento não finalizado/i.test(
      String(tefError || '')
    );
  const normalizedHint = normalizeForMatch(tefHint);
  const inProgressBannerLabel =
    tefStatus === 'FINALIZING'
      ? 'Finalizando pagamento...'
      : normalizedHint.includes('transacao aprovada')
        ? 'Transação aprovada'
        : normalizedHint.includes('retire o cartao')
          ? 'Retire o cartão'
          : 'Transação em andamento...';

  return (
    <PageContainer showLogo={false} showHelp={false} steps={steps} currentStep={currentStep}>
      <div className="w-full flex flex-col items-center gap-8 text-center">
        {/* Processing Animation */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#D3A67F]/20 to-[#CDDCDC]/30 flex items-center justify-center animate-pulse">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#D3A67F"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
          {/* Rotating ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#D3A67F] animate-spin" />
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl text-[#D3A67F]">
            Processando pagamento
          </h2>
          <p className="text-xl text-[#4A4A4A]/70">
            {getMethodLabel()}
          </p>
          <p className="text-sm text-[#4A4A4A]/60">
            {method === 'pix'
              ? 'Pagamento via TEF (Pix no pinpad). Siga as instruções na maquininha.'
              : method === 'wallet'
                ? 'Pagamento via TEF (Carteira Digital). Aproxime o celular ou relógio na maquininha.'
                : 'Pagamento via TEF. Siga as instruções na maquininha.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md space-y-4">
          <p className="text-lg text-[#4A4A4A]">
            {tefStatus === 'STARTING'
              ? 'Conectando com a maquininha...'
              : (tefStatus === 'IN_PROGRESS' || tefStatus === 'FINALIZING')
                ? tefHint
                : ''}
          </p>

          {method === 'pix' && pixQrCodeImage && tefStatus === 'IN_PROGRESS' && (
            <div className="mt-6 p-4 bg-white rounded-lg border-2 border-[#D3A67F] flex items-center justify-center">
              <img src={pixQrCodeImage} alt="QR Code PIX" className="w-56 h-56 object-contain" />
            </div>
          )}

          {tefStatus === 'STARTING' && (
            <div className="space-y-1">
              <p className="text-sm text-[#4A4A4A]/70">Conectando com a maquininha...</p>
            </div>
          )}
          {(tefStatus === 'IN_PROGRESS' || tefStatus === 'FINALIZING') && (
            <div className="bg-gradient-to-r from-[#D3A67F]/15 to-[#CDDCDC]/20 border-2 border-[#D3A67F] rounded-lg p-4 space-y-1">
              <p className="font-semibold text-[#D3A67F]">
                {inProgressBannerLabel}
              </p>
              {tefStatus === 'IN_PROGRESS'
                && cancelCountdown > 0
                && !normalizedHint.includes('transacao aprovada')
                && !normalizedHint.includes('retire o cartao') && (
                <p className="text-sm text-[#4A4A4A]/70">
                  Cancelamento automático em {cancelCountdown}s
                </p>
              )}
            </div>
          )}
          {isCancelling && (
            <div className="bg-gradient-to-r from-[#D3A67F]/25 to-[#CDDCDC]/30 border-2 border-[#D3A67F] rounded-lg p-5 shadow-lg">
              <p className="font-bold text-lg text-[#D3A67F]">
                ⏳ Cancelando no Leitor... {cancelProgressCountdown}s
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <div className="w-3 h-3 bg-[#D3A67F] rounded-full animate-bounce" />
                <div className="w-3 h-3 bg-[#D3A67F] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-3 h-3 bg-[#D3A67F] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          {(tefStatus === 'DECLINED' || tefStatus === 'ERROR') && !suppressPrintConfirmError && !isCancelledFlow && (
            tefError === 'Servidor Inoperante' ? (
              <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-center">
                <p className="text-2xl font-extrabold tracking-wide text-red-700">SERVIDOR INOPERANTE</p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-red-600 whitespace-pre-line break-words">
                {tefError || 'Falha no pagamento'}
              </p>
            )
          )}

          {suppressPrintConfirmError && (
            <p className="text-sm text-[#4A4A4A]/70">
              Pagamento concluído. Se necessário, use a opção de reimpressão.
            </p>
          )}

          {(tefStatus === 'DECLINED' || tefStatus === 'ERROR') && !suppressPrintConfirmError && autoReturnCountdown > 0 && (
            <p className="text-xs text-[#4A4A4A]/70">
              Retornando para nova transação em {autoReturnCountdown}s...
            </p>
          )}

          {(tefStatus === 'DECLINED' || tefStatus === 'ERROR') && !isCancelledFlow && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => void startTefIfNeeded(true)}
                className="w-full"
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {(tefStatus === 'STARTING' || tefStatus === 'IN_PROGRESS') && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="lg"
                onClick={handleCancelClick}
                disabled={isCancelling}
                className="w-full"
              >
                {isCancelling ? 'Encerrando...' : 'Encerrar e Menu Inicial'}
              </Button>
            </div>
          )}

          {/* V05: todas as telas devem conter opção de “ENCERRAR e MENU INICIAL”. */}
          {(tefStatus !== 'STARTING' && tefStatus !== 'IN_PROGRESS' && tefStatus !== 'FINALIZING') && (
            <div className="pt-2">
              <Button variant="outline" size="lg" onClick={returnToStart} className="w-full">
                Menu Inicial
              </Button>
            </div>
          )}
        </div>

        {tefStatus === 'STARTING' || tefStatus === 'IN_PROGRESS' || tefStatus === 'FINALIZING' ? (
          <div className="flex items-center gap-2 text-[#4A4A4A]/70">
            <div className="w-2 h-2 bg-[#D3A67F] rounded-full animate-bounce" />
            <div
              className="w-2 h-2 bg-[#D3A67F] rounded-full animate-bounce"
              style={{ animationDelay: '0.2s' }}
            />
            <div
              className="w-2 h-2 bg-[#D3A67F] rounded-full animate-bounce"
              style={{ animationDelay: '0.4s' }}
            />
          </div>
        ) : null}
      </div>
      {(tefStatus === 'ERROR') && isCancelledFlow && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-6 backdrop-blur-[1px]">
          <div className="w-full max-w-2xl rounded-3xl border border-[#FCA5A5] bg-gradient-to-b from-[#B91C1C] to-[#7F1D1D] px-8 py-10 text-center shadow-2xl">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FEE2E2"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h3 className="text-4xl md:text-5xl font-semibold text-white">Operação anulada</h3>
            <p className="mt-4 text-lg md:text-xl text-[#FECACA]">Voltando ao início...</p>
          </div>
        </div>
      )}

      {/* Modal de confirmação de cancelamento */}
      <CancelConfirmModal
        isOpen={showCancelConfirm}
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelReject}
        isLoading={isCancelling}
      />

      <ActionFooter onBack={handleFooterBack} showConfirm={false} />
    </PageContainer>
  );
}
