/**
 * Multiple Payments Support for CliSiTef v3.1 Pre-Homologation
 * 
 * Sequences 21, 22, 23 require support for:
 * - Multiple TEF transactions in same sale
 * - Single CupomFiscal/DataFiscal for all transactions
 * - Batch confirmation at the end
 * - Cash + card payments with change calculation
 */

export type PaymentMethod = 'debit' | 'credit' | 'pix';

export type PaymentItemType = 'tef' | 'cash' | 'wallet';

export type PaymentItemStatus = 
  | 'pending'     // Not yet processed
  | 'processing'  // TEF transaction in progress
  | 'approved'    // Approved by TEF
  | 'declined'    // Declined by TEF
  | 'error'       // Error during processing
  | 'cancelled';  // Cancelled by user

export type PaymentItem = {
  /** Unique ID for this payment item */
  id: string;
  
  /** Type of payment */
  type: PaymentItemType;
  
  /** TEF method (when type=tef) */
  method?: PaymentMethod;
  
  /** Amount in cents */
  amountCents: number;
  
  /** Sale ID for TEF transactions (generated) */
  saleId?: string;
  
  /** Current status */
  status: PaymentItemStatus;
  
  /** Approval data from TEF (NSU, authorization code, etc.) */
  approvedData?: any;
  
  /** Error message if failed */
  error?: string;
  
  /** Created timestamp */
  createdAt: string;
  
  /** Updated timestamp */
  updatedAt?: string;
};

export type MultiPaymentSessionStatus = 
  | 'idle'        // Not started
  | 'selecting'   // User selecting payment methods
  | 'processing'  // Processing payments
  | 'confirming'  // Confirming all TEF transactions
  | 'completed'   // All done successfully
  | 'cancelled'   // User cancelled
  | 'error';      // Error occurred

export type MultiPaymentSession = {
  /** Unique session ID */
  sessionId: string;
  
  /** Appointment ID (if applicable) */
  appointmentId?: string;
  
  /** CupomFiscal - MUST be same for all TEF transactions */
  cupomFiscal: string;
  
  /** DataFiscal in DDMMAAAA format */
  dataFiscal: string;
  
  /** HoraFiscal in HHMMSS format */
  horaFiscal: string;
  
  /** Total amount to be paid (in cents) */
  totalAmountCents: number;
  
  /** List of payment items */
  payments: PaymentItem[];
  
  /** Remaining amount to be paid (in cents) */
  remainingCents: number;
  
  /** Change to give back (when cash > remaining) */
  changeCents: number;
  
  /** Current session status */
  status: MultiPaymentSessionStatus;
  
  /** Created timestamp */
  createdAt: string;
  
  /** Updated timestamp */
  updatedAt?: string;
  
  /** CPF do cliente (if applicable) */
  cpf?: string;
  
  /** Operator ID */
  operatorId?: string;
  
  /** Store ID */
  storeId?: string;
};

/**
 * Generate a new CupomFiscal based on timestamp
 * Format: APPT-{sessionId}-{timestamp}
 */
export function generateCupomFiscal(sessionId: string): string {
  const timestamp = Date.now();
  return `APPT-${sessionId}-${timestamp}`;
}

/**
 * Generate DataFiscal in DDMMAAAA format
 */
export function generateDataFiscal(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());
  return `${day}${month}${year}`;
}

/**
 * Generate HoraFiscal in HHMMSS format
 */
export function generateHoraFiscal(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}${minutes}${seconds}`;
}

/**
 * Generate a unique sale ID for a TEF transaction within a multi-payment session
 * Format: {cupomFiscal}-{index}
 */
export function generateTefSaleId(cupomFiscal: string, index: number): string {
  return `${cupomFiscal}-${index}`;
}

/**
 * Create a new multi-payment session
 */
export function createMultiPaymentSession(params: {
  sessionId: string;
  appointmentId?: string;
  totalAmountCents: number;
  cpf?: string;
  operatorId?: string;
  storeId?: string;
}): MultiPaymentSession {
  const cupomFiscal = generateCupomFiscal(params.sessionId);
  const dataFiscal = generateDataFiscal();
  const horaFiscal = generateHoraFiscal();
  
  return {
    sessionId: params.sessionId,
    appointmentId: params.appointmentId,
    cupomFiscal,
    dataFiscal,
    horaFiscal,
    totalAmountCents: params.totalAmountCents,
    payments: [],
    remainingCents: params.totalAmountCents,
    changeCents: 0,
    status: 'idle',
    createdAt: new Date().toISOString(),
    cpf: params.cpf,
    operatorId: params.operatorId,
    storeId: params.storeId,
  };
}

/**
 * Add a payment item to the session
 */
export function addPaymentItem(
  session: MultiPaymentSession,
  payment: Omit<PaymentItem, 'id' | 'status' | 'createdAt'>
): MultiPaymentSession {
  const newPayment: PaymentItem = {
    ...payment,
    id: `payment-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  
  return {
    ...session,
    payments: [...session.payments, newPayment],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update a payment item status
 */
export function updatePaymentItem(
  session: MultiPaymentSession,
  paymentId: string,
  updates: Partial<PaymentItem>
): MultiPaymentSession {
  return {
    ...session,
    payments: session.payments.map(p =>
      p.id === paymentId
        ? { ...p, ...updates, updatedAt: new Date().toISOString() }
        : p
    ),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate remaining amount and change
 */
export function calculateRemaining(session: MultiPaymentSession): {
  remainingCents: number;
  changeCents: number;
  totalPaidCents: number;
} {
  const approvedPayments = session.payments.filter(p => p.status === 'approved');
  const totalPaidCents = approvedPayments.reduce((sum, p) => sum + p.amountCents, 0);
  
  const remainingCents = Math.max(0, session.totalAmountCents - totalPaidCents);
  const changeCents = Math.max(0, totalPaidCents - session.totalAmountCents);
  
  return { remainingCents, changeCents, totalPaidCents };
}

/**
 * Update session with calculated remaining/change
 */
export function updateSessionAmounts(session: MultiPaymentSession): MultiPaymentSession {
  const { remainingCents, changeCents } = calculateRemaining(session);
  
  return {
    ...session,
    remainingCents,
    changeCents,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Check if session is fully paid
 */
export function isSessionFullyPaid(session: MultiPaymentSession): boolean {
  const { remainingCents } = calculateRemaining(session);
  return remainingCents === 0;
}

/**
 * Check if session has any TEF transactions
 */
export function hasTefTransactions(session: MultiPaymentSession): boolean {
  return session.payments.some(p => p.type === 'tef');
}

/**
 * Get all approved TEF transactions
 */
export function getApprovedTefTransactions(session: MultiPaymentSession): PaymentItem[] {
  return session.payments.filter(p => p.type === 'tef' && p.status === 'approved');
}

/**
 * Check if cash payment must be last (CliSiTef requirement)
 */
export function validateCashPosition(session: MultiPaymentSession): {
  valid: boolean;
  error?: string;
} {
  const cashIndex = session.payments.findIndex(p => p.type === 'cash');
  
  if (cashIndex === -1) {
    return { valid: true }; // No cash, OK
  }
  
  // Cash must be the last payment in the list
  if (cashIndex !== session.payments.length - 1) {
    return {
      valid: false,
      error: 'Pagamento em dinheiro deve ser o último da lista (requisito CliSiTef)',
    };
  }
  
  return { valid: true };
}

/**
 * Format amount in cents to BRL currency string
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}
