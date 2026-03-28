export type PaymentNotification = {
  appointmentId?: string;
  cpf: string;
  amount: number;
};

type PaymentListener = (payload: PaymentNotification) => void;

const listeners = new Set<PaymentListener>();

export function onPaymentConfirmed(listener: PaymentListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitPaymentConfirmed(payload: PaymentNotification) {
  listeners.forEach((listener) => listener(payload));
}
