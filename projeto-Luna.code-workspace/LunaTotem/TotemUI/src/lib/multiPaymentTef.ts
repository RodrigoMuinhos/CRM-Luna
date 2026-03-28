/**
 * TEF Bridge API for Multiple Payments
 * 
 * Handles TEF transactions within a multi-payment session
 * ensuring all transactions share the same CupomFiscal/DataFiscal
 */

import { tefCharge, tefStatus, tefConfirm, type TefChargeInput, type TefStatusPayload } from './tefBridge';
import type { 
  MultiPaymentSession, 
  PaymentItem,
  PaymentMethod 
} from './multiPayment';

/**
 * Process a single TEF payment within a multi-payment session
 */
export async function processMultiPaymentTef(params: {
  session: MultiPaymentSession;
  method: PaymentMethod;
  amountCents: number;
  paymentIndex: number;
}): Promise<TefStatusPayload> {
  const { session, method, amountCents, paymentIndex } = params;
  
  // Generate saleId that includes the cupomFiscal prefix
  const saleId = `${session.cupomFiscal}-${paymentIndex}`;
  
  const chargeInput: TefChargeInput = {
    saleId,
    amountCents,
    paymentMethod: method,
    orderRef: session.appointmentId || session.sessionId,
    operatorId: session.operatorId || 'OPER',
    storeId: session.storeId,
    items: {
      multiPayment: true,
      sessionId: session.sessionId,
      cupomFiscal: session.cupomFiscal,
      dataFiscal: session.dataFiscal,
      horaFiscal: session.horaFiscal,
      paymentIndex,
      totalPayments: session.payments.length,
    },
  };
  
  return await tefCharge(chargeInput);
}

/**
 * Poll TEF status for a multi-payment transaction
 */
export async function pollMultiPaymentTefStatus(
  saleId: string,
  maxAttempts: number = 60,
  intervalMs: number = 2000
): Promise<TefStatusPayload> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const status = await tefStatus(saleId);
    
    if (status.status !== 'IN_PROGRESS') {
      return status;
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    attempts++;
  }
  
  throw new Error(`TEF transaction timeout after ${maxAttempts} attempts`);
}

/**
 * Confirm all TEF transactions in a multi-payment session
 * 
 * IMPORTANT: CliSiTef requires calling FinalizaFuncaoSiTefInterativo
 * with confirma=1 and the same CupomFiscal/DataFiscal for all transactions
 */
export async function confirmMultiPaymentSession(
  session: MultiPaymentSession,
  printedOk: boolean = true
): Promise<{
  ok: boolean;
  confirmed: string[];
  errors: Array<{ saleId: string; error: string }>;
}> {
  const tefTransactions = session.payments.filter(p => 
    p.type === 'tef' && p.status === 'approved' && p.saleId
  );
  
  const confirmed: string[] = [];
  const errors: Array<{ saleId: string; error: string }> = [];
  
  // Confirm each TEF transaction
  // NOTE: sitef-bridge should handle batch confirmation internally
  // using the same CupomFiscal/DataFiscal
  for (const payment of tefTransactions) {
    if (!payment.saleId) continue;
    
    try {
      await tefConfirm(payment.saleId, printedOk);
      confirmed.push(payment.saleId);
    } catch (err: any) {
      errors.push({
        saleId: payment.saleId,
        error: err?.message || 'Unknown error',
      });
    }
  }
  
  return {
    ok: errors.length === 0,
    confirmed,
    errors,
  };
}

/**
 * Cancel all TEF transactions in a multi-payment session
 * 
 * Used when the sale is cancelled or fails
 */
export async function cancelMultiPaymentSession(
  session: MultiPaymentSession
): Promise<{
  ok: boolean;
  cancelled: string[];
  errors: Array<{ saleId: string; error: string }>;
}> {
  const tefTransactions = session.payments.filter(p => 
    p.type === 'tef' && p.status === 'approved' && p.saleId
  );
  
  const cancelled: string[] = [];
  const errors: Array<{ saleId: string; error: string }> = [];
  
  // Cancel by confirming with printedOk=false
  for (const payment of tefTransactions) {
    if (!payment.saleId) continue;
    
    try {
      await tefConfirm(payment.saleId, false);
      cancelled.push(payment.saleId);
    } catch (err: any) {
      errors.push({
        saleId: payment.saleId,
        error: err?.message || 'Unknown error',
      });
    }
  }
  
  return {
    ok: errors.length === 0,
    cancelled,
    errors,
  };
}

/**
 * Get receipts for all TEF transactions in session
 */
export async function getMultiPaymentReceipts(
  session: MultiPaymentSession
): Promise<Array<{
  saleId: string;
  customerText?: string;
  merchantText?: string;
  error?: string;
}>> {
  const tefTransactions = session.payments.filter(p => 
    p.type === 'tef' && p.status === 'approved' && p.saleId
  );
  
  const receipts = [];
  
  for (const payment of tefTransactions) {
    if (!payment.saleId) continue;
    
    try {
      const baseUrl = getBrowserTefBridgeBaseUrl();
      const res = await fetch(`${baseUrl}/tef/receipt/${encodeURIComponent(payment.saleId)}`);
      const data = await res.json();
      
      receipts.push({
        saleId: payment.saleId,
        customerText: data.customerText,
        merchantText: data.merchantText,
      });
    } catch (err: any) {
      receipts.push({
        saleId: payment.saleId,
        error: err?.message || 'Failed to fetch receipt',
      });
    }
  }
  
  return receipts;
}

/**
 * Get TEF bridge base URL (same as tefBridge.ts)
 */
function getBrowserTefBridgeBaseUrl(): string {
  const DEFAULT_TEF_BRIDGE_URL = 'http://127.0.0.1:7071';
  const url = (process.env.NEXT_PUBLIC_TEF_BRIDGE_URL || '').trim();
  return (url || DEFAULT_TEF_BRIDGE_URL).replace(/\/$/, '');
}

/**
 * Example: Process Seq 21 (Credit R$20 + Cash R$50 with change)
 */
export async function exampleSeq21(params: {
  sessionId: string;
  appointmentId?: string;
  totalCents: number; // 5000 (R$ 50)
}): Promise<MultiPaymentSession> {
  const { createMultiPaymentSession, addPaymentItem, updatePaymentItem, updateSessionAmounts } = 
    await import('./multiPayment');
  
  // Create session
  let session = createMultiPaymentSession({
    sessionId: params.sessionId,
    appointmentId: params.appointmentId,
    totalAmountCents: params.totalCents,
  });
  
  // Add credit payment R$ 20
  session = addPaymentItem(session, {
    type: 'tef',
    method: 'credit',
    amountCents: 2000, // R$ 20
  });
  
  // Process TEF
  const tefResult = await processMultiPaymentTef({
    session,
    method: 'credit',
    amountCents: 2000,
    paymentIndex: 0,
  });
  
  // Poll until approved/declined
  const tefStatus = await pollMultiPaymentTefStatus(session.payments[0].saleId!);
  
  // Update payment status
  session = updatePaymentItem(session, session.payments[0].id, {
    status: tefStatus.status === 'APPROVED' ? 'approved' : 'declined',
    approvedData: tefStatus.approvedData,
    error: tefStatus.error,
  });
  
  // Add cash payment R$ 50 (must be last!)
  session = addPaymentItem(session, {
    type: 'cash',
    amountCents: 5000, // R$ 50
  });
  
  // Mark cash as approved (manual entry)
  session = updatePaymentItem(session, session.payments[1].id, {
    status: 'approved',
  });
  
  // Calculate remaining and change
  session = updateSessionAmounts(session);
  // changeCents should be 3000 (R$ 30)
  
  // Confirm all TEF transactions
  await confirmMultiPaymentSession(session);
  
  return session;
}
