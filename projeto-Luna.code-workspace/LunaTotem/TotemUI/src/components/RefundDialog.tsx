"use client";

import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface RefundDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (originalSaleId: string) => Promise<{ refundSaleId: string }>;
  onSendSupervisorPassword?: (saleId: string, password: string) => Promise<boolean>;
  transactionSaleId?: string;
  transactionAmount?: number;
}

interface RecentTransaction {
  saleId: string;
  amountCents: number;
  type: string;
  nsuHost?: string;
  status: string;
  updatedAt: string;
}

export function RefundDialog({
  isOpen,
  onClose,
  onConfirm,
  onSendSupervisorPassword,
  transactionSaleId,
  transactionAmount,
}: RefundDialogProps) {
  const [busy, setBusy] = useState(false);
  const [saleIdInput, setSaleIdInput] = useState(transactionSaleId || "");
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [supervisorPassword, setSupervisorPassword] = useState("");
  
  // 🎯 Estados para tracking de progresso
  const [refundStatus, setRefundStatus] = useState<'idle' | 'starting' | 'processing' | 'completed' | 'failed'>('idle');
  const [refundMessage, setRefundMessage] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [refundSaleId, setRefundSaleId] = useState<string>('');
  const supervisorSentRef = useRef<string | null>(null);

  // 🎯 Solução 1: Auto-preencher com última transação APPROVED
  useEffect(() => {
    if (!isOpen) return;
    
    if (transactionSaleId) {
      setSaleIdInput(transactionSaleId);
      return;
    }

    setLoadingTx(true);
    fetch('/api/tef/transactions/last')
      .then(res => res.json())
      .then(data => {
        const lastSaleId = data?.transaction?.saleId;
        if (lastSaleId && data?.transaction?.status === 'APPROVED') {
          setSaleIdInput(lastSaleId);
          console.log('[RefundDialog] Auto-preenchido com última transação:', lastSaleId);
        }
      })
      .catch(err => console.warn('[RefundDialog] Falha ao buscar última transação:', err))
      .finally(() => setLoadingTx(false));
  }, [isOpen, transactionSaleId]);

  // 🎯 Solução 2: Carregar lista de transações recentes APPROVED para dropdown
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/tef/reprint/transactions?period=day&receipt=all&limit=20')
      .then(res => res.json())
      .then(data => {
        const txs = (data?.transactions || [])
          .filter((tx: any) => tx.status === 'APPROVED')
          .map((tx: any) => ({
            saleId: tx.saleId,
            amountCents: tx.amountCents || 0,
            type: tx.type || 'TEF',
            nsuHost: tx.nsuHost,
            status: tx.status,
            updatedAt: tx.updatedAt || tx.createdAt,
          }));
        setRecentTransactions(txs);
        console.log('[RefundDialog] Carregadas transações:', txs.length);
      })
      .catch(err => console.warn('[RefundDialog] Falha ao carregar transações:', err));
  }, [isOpen]);

  // 🎯 Solução 3: Validação do formato do saleId
  useEffect(() => {
    const trimmed = saleIdInput.trim();
    if (!trimmed) {
      setValidationWarning(null);
      return;
    }

    // Validar comprimento mínimo (saleIds normalmente têm 40+ caracteres)
    if (trimmed.length < 30) {
      setValidationWarning("⚠️ SaleId parece incompleto (muito curto)");
      return;
    }

    // Validar formato comum: APPT-{uuid}-{timestamp13}
    const validFormats = [
      /^APPT-[a-f0-9-]+-\d{13}$/i,           // APPT-uuid-timestamp
      /^PAYMENT-\d{14,}$/i,                   // PAYMENT-timestamp
      /^TEST-[A-Z0-9-]+$/i,                   // TEST-xxx
      /^REFUND-[a-f0-9-]+$/i,                 // REFUND-uuid
    ];

    const matchesFormat = validFormats.some(regex => regex.test(trimmed));
    if (!matchesFormat) {
      setValidationWarning("⚠️ Formato de saleId não reconhecido. Verifique se está correto.");
      return;
    }

    setValidationWarning(null);
  }, [saleIdInput]);

  // 🎯 Polling para acompanhar status da devolução
  const pollRefundStatus = async (saleId: string, timeoutMs: number = 180000): Promise<{ state: 'completed' | 'failed' | 'timeout', message?: string }> => {
    const startTime = Date.now();
    const deadline = startTime + timeoutMs;
    
    // Usar o endpoint do sitef-bridge diretamente (não via proxy do TotemAPI)
    const tefBridgeUrl = process.env.NEXT_PUBLIC_TEF_BRIDGE_URL || 'http://127.0.0.1:7071';
    
    while (Date.now() < deadline) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);

      try {
        const res = await fetch(`${tefBridgeUrl}/api/tef/status/${encodeURIComponent(saleId)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!res.ok) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }

        const data = await res.json();
        const status = String(data?.state || data?.status || '').toUpperCase();
        const lastMessage = String(data?.lastMessage || '').trim();

        if (lastMessage) {
          setRefundMessage(lastMessage);
        }

        // Envio best-effort de senha de supervisor durante a devolução
        if (
          saleId &&
          !supervisorSentRef.current &&
          onSendSupervisorPassword &&
          supervisorPassword.trim() &&
          /supervisor/i.test(lastMessage)
        ) {
          try {
            const sent = await onSendSupervisorPassword(saleId, supervisorPassword.trim());
            if (sent) {
              supervisorSentRef.current = saleId;
              setRefundMessage("Senha de supervisor enviada. Continue na maquininha...");
            }
          } catch (err) {
            console.warn('[RefundDialog] Falha ao enviar senha de supervisor:', err);
          }
        }

        // Estados finais
        if (status === 'APPROVED' || status === 'COMPLETED') {
          return { state: 'completed', message: 'Devolução concluída com sucesso' };
        }
        
        if (status === 'DECLINED' || status === 'FAILED' || status === 'ERROR') {
          const error = String(data?.error || data?.message || 'Devolução recusada');
          return { state: 'failed', message: error };
        }

        // Estados em progresso
        if (status === 'IN_PROGRESS' || status === 'PENDING') {
          if (!lastMessage) {
            setRefundMessage('Processando devolução na maquininha...');
          }
        }

      } catch (err) {
        console.warn('[RefundDialog] Erro ao verificar status:', err);
      }

      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return { state: 'timeout', message: 'Tempo limite excedido (180s)' };
  };

  const handleConfirm = async () => {
    const trimmed = saleIdInput.trim();
    if (!trimmed) {
      setRefundStatus('failed');
      setRefundMessage('✗ Informe o ID da transação original');
      return;
    }

    // Validação final antes de confirmar
    if (trimmed.length < 30) {
      const confirmed = confirm(
        `O saleId parece incompleto (${trimmed.length} caracteres). Deseja continuar mesmo assim?`
      );
      if (!confirmed) return;
    }

    setBusy(true);
    setRefundStatus('starting');
    setRefundMessage('Devolução iniciada. Aguardando confirmação da maquininha...');
    setElapsedSeconds(0);
    supervisorSentRef.current = null;

    try {
      // Iniciar devolução
      const start = await onConfirm(trimmed);
      const startedRefundSaleId = String(start?.refundSaleId || "").trim();
      if (!startedRefundSaleId) {
        throw new Error("saleId da devolução não retornado pela aplicação");
      }
      setRefundSaleId(startedRefundSaleId);
      
      setRefundStatus('processing');
      setRefundMessage('Devolução iniciada. Aguardando confirmação da maquininha...');

      // Polling para acompanhar status (180s timeout)
      const result = await pollRefundStatus(startedRefundSaleId, 180000);

      if (result.state === 'completed') {
        setRefundStatus('completed');
        setRefundMessage(`✓ ${result.message || 'Devolução concluída'}`);
      } else if (result.state === 'failed') {
        setRefundStatus('failed');
        setRefundMessage(`✗ ${result.message || 'Devolução falhou'}`);
      } else {
        setRefundStatus('failed');
        setRefundMessage('⏱ Tempo limite excedido. Verifique o status manualmente.');
      }

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRefundStatus('failed');
      setRefundMessage(`✗ Erro: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  // Reset status quando fechar o dialog
  useEffect(() => {
    if (!isOpen) {
      setRefundStatus('idle');
      setRefundMessage('');
      setElapsedSeconds(0);
      setRefundSaleId('');
      supervisorSentRef.current = null;
    }
  }, [isOpen]);

  // Fecha automaticamente após sucesso para manter o fluxo da UI fluido.
  useEffect(() => {
    if (!isOpen) return;
    if (busy) return;
    if (refundStatus !== 'completed') return;

    const timer = window.setTimeout(() => {
      onClose();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [busy, isOpen, onClose, refundStatus]);

  const formatBrl = (cents: number) => {
    const val = cents / 100;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#4A4A4A]">Confirmar Devolução</DialogTitle>
          <DialogDescription className="text-sm text-[#4A4A4A]/70">
            Será realizado o cancelamento da transação no Leitor. Este processo é irreversível.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {transactionAmount !== undefined && (
            <div className="rounded-lg border border-[#E8E2DA] bg-[#CDDCDC]/10 p-3">
              <p className="text-xs font-semibold text-[#4A4A4A]/60">Valor Original</p>
              <p className="mt-1 text-xl font-bold text-[#4A4A4A]">{formatBrl(transactionAmount)}</p>
            </div>
          )}

          {/* 🎯 Solução 2: Dropdown de transações recentes */}
          {recentTransactions.length > 0 && (
            <div>
              <label htmlFor="refund-select" className="mb-2 block text-sm font-semibold text-[#4A4A4A]">
                Selecionar Transação Recente
              </label>
              <select
                id="refund-select"
                className="w-full rounded-lg border border-[#E8E2DA] bg-white px-4 py-2 text-sm text-[#4A4A4A] focus:border-[#D3A67F] focus:outline-none focus:ring-2 focus:ring-[#D3A67F]/20"
                onChange={(e) => setSaleIdInput(e.target.value)}
                value={saleIdInput}
                disabled={busy}
              >
                <option value="">-- Selecione uma transação --</option>
                {recentTransactions.map((tx) => (
                  <option key={tx.saleId} value={tx.saleId}>
                    NSU: {tx.nsuHost || 'N/A'} • {tx.type} • {formatBrl(tx.amountCents)} • {new Date(tx.updatedAt).toLocaleTimeString('pt-BR')}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[#4A4A4A]/50">
                Transações aprovadas nas últimas 24h
              </p>
            </div>
          )}

          <div>
            <label htmlFor="refund-sale-id" className="mb-2 block text-sm font-semibold text-[#4A4A4A]">
              ID da Transação Original *
            </label>
            <input
              id="refund-sale-id"
              type="text"
              className={`w-full rounded-lg border ${validationWarning ? 'border-orange-400' : 'border-[#E8E2DA]'} bg-white px-4 py-2 text-sm text-[#4A4A4A] focus:border-[#D3A67F] focus:outline-none focus:ring-2 focus:ring-[#D3A67F]/20`}
              value={saleIdInput}
              onChange={(e) => setSaleIdInput(e.target.value)}
              placeholder={loadingTx ? "Carregando última transação..." : "Ex: APPT-0a8ae782-0935-4e48-93b8-cd132266c475-1771613853223"}
              disabled={busy || loadingTx}
            />
            {/* 🎯 Solução 3: Feedback de validação */}
            {validationWarning && (
              <p className="mt-1 text-xs text-orange-600 font-medium">
                {validationWarning}
              </p>
            )}
            {!validationWarning && (
              <p className="mt-1 text-xs text-[#4A4A4A]/50">
                Insira o <span className="font-mono">saleId</span> completo da transação que será cancelada.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="refund-supervisor-password" className="mb-2 block text-sm font-semibold text-[#4A4A4A]">
              Senha do Supervisor (se exigida)
            </label>
            <input
              id="refund-supervisor-password"
              type="password"
              className="w-full rounded-lg border border-[#E8E2DA] bg-white px-4 py-2 text-sm text-[#4A4A4A] focus:border-[#D3A67F] focus:outline-none focus:ring-2 focus:ring-[#D3A67F]/20"
              value={supervisorPassword}
              onChange={(e) => setSupervisorPassword(e.target.value)}
              placeholder="Opcional: será enviada se o TEF solicitar supervisor"
              disabled={busy}
              autoComplete="current-password"
            />
            <p className="mt-1 text-xs text-[#4A4A4A]/50">
              Preencha para envio automático quando aparecer “Forneça o código do supervisor”.
            </p>
          </div>

          {/* 🎯 STATUS DE PROGRESSO DA DEVOLUÇÃO */}
          {refundStatus !== 'idle' && (
            <div className={`rounded-lg border p-4 ${
              refundStatus === 'completed' 
                ? 'border-green-300 bg-green-50' 
                : refundStatus === 'failed' 
                ? 'border-red-300 bg-red-50' 
                : 'border-blue-300 bg-blue-50'
            }`}>
              <div className="flex items-start gap-3">
                {/* Spinner/Icon */}
                <div className="flex-shrink-0">
                  {refundStatus === 'starting' || refundStatus === 'processing' ? (
                    <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : refundStatus === 'completed' ? (
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                
                {/* Status Message */}
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${
                    refundStatus === 'completed' 
                      ? 'text-green-800' 
                      : refundStatus === 'failed' 
                      ? 'text-red-800' 
                      : 'text-blue-800'
                  }`}>
                    {refundMessage}
                  </p>
                  
                  {/* Timer */}
                  {(refundStatus === 'starting' || refundStatus === 'processing') && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs text-blue-700">
                        <span>Tempo decorrido:</span>
                        <span className="font-mono font-bold">{elapsedSeconds}s / 180s</span>
                      </div>
                      {/* Barra de progresso */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-1000 ease-linear"
                          style={{ width: `${Math.min((elapsedSeconds / 180) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[#E8E2DA] bg-white px-6 text-sm font-semibold text-[#4A4A4A] hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !saleIdInput.trim()}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-[#D3A67F] to-[#C49363] px-6 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processando...
              </>
            ) : (
              "Confirmar Devolução"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
