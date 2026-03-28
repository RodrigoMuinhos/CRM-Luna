import { emitPaymentConfirmed, type PaymentNotification } from '../totem-system/bridge/paymentBridge';

export type { PaymentNotification };

export function notifyPaymentConfirmed(payload: PaymentNotification) {
    emitPaymentConfirmed(payload);
}
