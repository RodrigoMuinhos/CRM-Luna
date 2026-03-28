import { useEffect, useMemo, useRef, useState } from 'react';
import { PageContainer } from '../PageContainer';
import { ActionFooter } from '../ActionFooter';
import { FlowType, getFlowSteps } from '@/lib/flowSteps';
import { appointmentAPI, paymentAPI } from '@/lib/api';
import { API_BASE_URL } from '@/lib/apiConfig';

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

interface PixIsolatedPaymentProps {
  appointmentId: string;
  onComplete: () => void;
  onBack: () => void;
  flow?: FlowType;
  selectedAppointment?: Appointment | null;
}

function clampTimeoutMs(value: number): number {
  if (!Number.isFinite(value)) return 300_000;
  return Math.min(30 * 60_000, Math.max(30_000, Math.trunc(value)));
}

function normalizeStatus(value: string | undefined): string {
  return String(value || '').trim().toUpperCase();
}

function isPaidStatus(status: string): boolean {
  return ['PAGO', 'PAID', 'RECEIVED', 'CONFIRMED', 'APPROVED'].includes(status);
}

function isFailedStatus(status: string): boolean {
  return ['FAILED', 'ERROR', 'DECLINED', 'CANCELED', 'CANCELLED'].includes(status);
}

function toBase64Utf8(text: string): string {
  const utf8 = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );
  return btoa(utf8);
}

export function PixIsolatedPayment({
  appointmentId,
  onComplete,
  onBack,
  flow = 'payment',
  selectedAppointment,
}: PixIsolatedPaymentProps) {
  const pollIntervalRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [qrCodeBase64, setQrCodeBase64] = useState('');
  const [pixCopyPaste, setPixCopyPaste] = useState('');
  const [timeLeftMs, setTimeLeftMs] = useState(0);

  const pollTimeoutMs = useMemo(() => {
    const raw = Number(process.env.NEXT_PUBLIC_PIX_POLL_TIMEOUT_MS ?? 300000);
    return clampTimeoutMs(raw);
  }, []);

  const clearTimers = () => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const mm = Math.floor(totalSeconds / 60);
    const ss = totalSeconds % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  const enqueuePrintReceipt = async (): Promise<void> => {
    if (!selectedAppointment) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');
    const cpfFormatted = selectedAppointment.patient.cpf.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4'
    );
    const amountFormatted = selectedAppointment.amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    const receiptText = `
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

    Forma: PIX

----------------------------------------

    PAGAMENTO CONFIRMADO
    Aguarde ser chamado

  Obrigado pela preferencia!

========================================
`;

    const payload = {
      terminalId: 'TOTEM-001',
      tenantId: 'tenant-1',
      receiptType: 'PAYMENT',
      payload: toBase64Utf8(receiptText),
      priority: 0,
      appointmentId: selectedAppointment.id,
      metadata: JSON.stringify({
        patientName: selectedAppointment.patient.name,
        cpf: selectedAppointment.patient.cpf,
        amount: selectedAppointment.amount,
        paymentMethod: 'pix',
        date: selectedAppointment.date,
        time: selectedAppointment.time,
        doctor: selectedAppointment.doctor,
        specialty: selectedAppointment.specialty,
      }),
    };

    const response = await fetch(`${API_BASE_URL}/api/print-queue/enqueue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Falha ao enfileirar impressão PIX: HTTP ${response.status}`);
    }
  };

  const checkStatus = async (id: string) => {
    const data = await paymentAPI.getPixStatus(id);
    const status = normalizeStatus(data.status);

    console.log('[PIX] status', { id, status, gatewayPaymentId: data.gatewayPaymentId });

    if (isPaidStatus(status)) {
      clearTimers();
      await appointmentAPI.updatePaid(appointmentId, true).catch((e) => {
        console.warn('[PIX] Falha ao marcar consulta como paga', e);
      });
      await enqueuePrintReceipt().catch((e) => {
        console.error('[PIX] Falha ao enfileirar impressão', e);
      });
      onComplete();
      return;
    }

    if (isFailedStatus(status)) {
      clearTimers();
      setError(`Pagamento PIX não aprovado (${status}).`);
    }
  };

  const createPix = async () => {
    clearTimers();
    setLoading(true);
    setError('');
    setPaymentId('');
    setQrCodeBase64('');
    setPixCopyPaste('');

    try {
      const created = await paymentAPI.createPix(appointmentId);
      const id = String(created.paymentId || '').trim();
      if (!id) {
        throw new Error('Resposta sem paymentId');
      }

      const qr = String(created.pixQrCodeBase64 || '').trim();
      const copy = String(created.pixCopyPaste || '').trim();
      if (!qr && !copy) {
        throw new Error(created.message || 'Gateway não retornou QR Code PIX');
      }

      setPaymentId(id);
      setQrCodeBase64(qr);
      setPixCopyPaste(copy);
      setTimeLeftMs(pollTimeoutMs);
      setLoading(false);

      const startedAt = Date.now();
      countdownRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, pollTimeoutMs - elapsed);
        setTimeLeftMs(remaining);
      }, 250);

      pollIntervalRef.current = window.setInterval(() => {
        void checkStatus(id);
      }, 3000);

      timeoutRef.current = window.setTimeout(() => {
        clearTimers();
        setError('Tempo limite para confirmação do PIX atingido. Gere um novo QR Code.');
      }, pollTimeoutMs);
    } catch (e) {
      console.error('[PIX] erro ao criar cobrança', e);
      const message = e instanceof Error ? e.message : 'Erro ao gerar PIX';
      setError(message);
      setLoading(false);
    }
  };

  useEffect(() => {
    void createPix();
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  const steps = getFlowSteps(flow);
  const currentStep = flow === 'checkin' ? 3 : 1;
  const progressPct = Math.max(0, Math.min(100, (timeLeftMs / pollTimeoutMs) * 100));

  return (
    <PageContainer steps={steps} currentStep={currentStep}>
      <div className="w-full flex flex-col items-center gap-8 text-center">
        <div className="space-y-2">
          <h2 className="text-3xl md:text-4xl text-[#D3A67F]">Pagamento via PIX</h2>
          <p className="text-[#4A4A4A]/70">Escaneie o QR Code para concluir</p>
        </div>

        {loading && (
          <div className="w-full max-w-xl bg-white rounded-2xl shadow p-8">
            <p className="text-lg text-[#4A4A4A]/80">Gerando QR Code PIX...</p>
          </div>
        )}

        {!loading && error && (
          <div className="w-full max-w-xl bg-white rounded-2xl shadow p-8 space-y-4">
            <p className="text-lg text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void createPix()}
              className="px-6 py-3 rounded-lg bg-[#D3A67F] text-white hover:bg-[#C8966E]"
            >
              Gerar novo QR Code
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="w-full max-w-xl bg-white rounded-2xl shadow p-8 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-[#4A4A4A]/70">
                <span>Tempo restante</span>
                <span>{formatTime(timeLeftMs)}</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden bg-[#F6EFE9]">
                <div
                  className="h-full transition-[width] duration-200 ease-linear bg-[#D3A67F]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {qrCodeBase64 ? (
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="w-64 h-64 rounded-lg border border-[#E5E0DA]"
                />
              </div>
            ) : null}

            {pixCopyPaste ? (
              <div className="text-left">
                <p className="text-xs text-[#4A4A4A]/70 mb-2">PIX Copia e Cola</p>
                <div className="p-3 rounded border border-[#E5E0DA] bg-[#FAF8F4] break-all text-xs text-[#4A4A4A]">
                  {pixCopyPaste}
                </div>
              </div>
            ) : null}

            <p className="text-sm text-[#4A4A4A]/70">Aguardando confirmação do pagamento...</p>
            {paymentId ? (
              <p className="text-[11px] text-[#4A4A4A]/50">ID pagamento: {paymentId}</p>
            ) : null}
          </div>
        )}

        <ActionFooter onBack={onBack} showConfirm={false} />
      </div>
    </PageContainer>
  );
}
