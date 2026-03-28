/**
 * Multiple Payments Selection UI
 * 
 * Allows selecting multiple payment methods for sequences 21, 22, 23
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  createMultiPaymentSession, 
  addPaymentItem, 
  updatePaymentItem,
  updateSessionAmounts,
  calculateRemaining,
  formatCurrency,
  validateCashPosition,
  type MultiPaymentSession,
  type PaymentItem,
  type PaymentMethod,
  type PaymentItemType
} from '@/lib/multiPayment';

type MultiPaymentSelectorProps = {
  totalAmountCents: number;
  sessionId: string;
  appointmentId?: string;
  cpf?: string;
  onConfirm: (session: MultiPaymentSession) => void;
  onCancel: () => void;
};

export default function MultiPaymentSelector({
  totalAmountCents,
  sessionId,
  appointmentId,
  cpf,
  onConfirm,
  onCancel,
}: MultiPaymentSelectorProps) {
  const [session, setSession] = useState<MultiPaymentSession>(() =>
    createMultiPaymentSession({
      sessionId,
      appointmentId,
      totalAmountCents,
      cpf,
    })
  );

  const [selectedType, setSelectedType] = useState<PaymentItemType>('tef');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('credit');
  const [amountInput, setAmountInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Update remaining amount when payments change
  useEffect(() => {
    setSession(prev => updateSessionAmounts(prev));
  }, [session.payments.length]);

  const { remainingCents, changeCents } = calculateRemaining(session);

  const handleAddPayment = () => {
    setError(null);

    const amountCents = Math.round(parseFloat(amountInput || '0') * 100);

    if (amountCents <= 0) {
      setError('Valor deve ser maior que zero');
      return;
    }

    if (remainingCents === 0 && selectedType !== 'cash') {
      setError('Valor total já está pago');
      return;
    }

    // Add payment
    const updatedSession = addPaymentItem(session, {
      type: selectedType,
      method: selectedType === 'tef' ? selectedMethod : undefined,
      amountCents,
    });

    // Mark as approved (will be processed later)
    const lastPayment = updatedSession.payments[updatedSession.payments.length - 1];
    const finalSession = updatePaymentItem(updatedSession, lastPayment.id, {
      status: 'pending', // Will process later
    });

    setSession(finalSession);
    setAmountInput('');
  };

  const handleRemovePayment = (paymentId: string) => {
    setSession(prev => ({
      ...prev,
      payments: prev.payments.filter(p => p.id !== paymentId),
    }));
  };

  const handleConfirm = () => {
    setError(null);

    // Validate
    if (session.payments.length === 0) {
      setError('Adicione pelo menos uma forma de pagamento');
      return;
    }

    const { remainingCents } = calculateRemaining(session);
    if (remainingCents > 0) {
      setError(`Falta pagar ${formatCurrency(remainingCents)}`);
      return;
    }

    // Validate cash position
    const cashValidation = validateCashPosition(session);
    if (!cashValidation.valid) {
      setError(cashValidation.error || 'Erro na validação de dinheiro');
      return;
    }

    onConfirm(session);
  };

  const getPaymentLabel = (payment: PaymentItem): string => {
    if (payment.type === 'cash') {
      return 'Dinheiro';
    }
    if (payment.type === 'wallet') {
      return 'Carteira Digital';
    }
    if (payment.type === 'tef') {
      const methodLabel = {
        debit: 'Débito',
        credit: 'Crédito',
        pix: 'PIX',
      }[payment.method || 'credit'];
      return `TEF ${methodLabel}`;
    }
    return 'Desconhecido';
  };

  const moveCashToEnd = () => {
    const cashPayments = session.payments.filter(p => p.type === 'cash');
    const otherPayments = session.payments.filter(p => p.type !== 'cash');
    
    setSession(prev => ({
      ...prev,
      payments: [...otherPayments, ...cashPayments],
    }));
    
    setError(null);
  };

  return (
    <div className="p-6 space-y-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900">
        Múltiplos Pagamentos
      </h2>

      {/* Total and Remaining */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <div className="flex justify-between mb-2">
          <span className="font-semibold">Total:</span>
          <span className="text-xl font-bold">{formatCurrency(totalAmountCents)}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="font-semibold">Restante:</span>
          <span className={`text-xl font-bold ${remainingCents > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(remainingCents)}
          </span>
        </div>
        {changeCents > 0 && (
          <div className="flex justify-between pt-2 border-t border-blue-200">
            <span className="font-semibold text-green-700">Troco:</span>
            <span className="text-xl font-bold text-green-700">
              {formatCurrency(changeCents)}
            </span>
          </div>
        )}
      </div>

      {/* Add Payment Form */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-lg">Adicionar Pagamento</h3>

        {/* Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Tipo</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as PaymentItemType)}
            className="w-full p-2 border rounded"
          >
            <option value="tef">Cartão (TEF)</option>
            <option value="cash">Dinheiro</option>
            <option value="wallet">Carteira Digital (PIX)</option>
          </select>
        </div>

        {/* Method Selection (only for TEF) */}
        {selectedType === 'tef' && (
          <div>
            <label className="block text-sm font-medium mb-2">Modalidade</label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value as PaymentMethod)}
              className="w-full p-2 border rounded"
            >
              <option value="credit">Crédito</option>
              <option value="debit">Débito</option>
              <option value="pix">PIX</option>
            </select>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Valor (R$)
            {remainingCents > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                (Sugestão: {formatCurrency(remainingCents)})
              </span>
            )}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="0.00"
          />
        </div>

        <button
          onClick={handleAddPayment}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
        >
          + Adicionar
        </button>
      </div>

      {/* Payments List */}
      {session.payments.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Pagamentos Adicionados</h3>
          {session.payments.map((payment, index) => (
            <div
              key={payment.id}
              className={`flex justify-between items-center p-3 rounded ${
                payment.type === 'cash' && index !== session.payments.length - 1
                  ? 'bg-yellow-50 border-2 border-yellow-400'
                  : 'bg-gray-50'
              }`}
            >
              <div>
                <span className="font-medium">{getPaymentLabel(payment)}</span>
                {payment.type === 'cash' && index !== session.payments.length - 1 && (
                  <span className="ml-2 text-xs text-yellow-700 font-semibold">
                    ⚠ Deve ser o último!
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold">{formatCurrency(payment.amountCents)}</span>
                <button
                  onClick={() => handleRemovePayment(payment.id)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cash Position Warning */}
      {(() => {
        const cashValidation = validateCashPosition(session);
        return !cashValidation.valid && (
          <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded">
            <p className="text-yellow-800 font-semibold mb-2">
              ⚠ {cashValidation.error}
            </p>
            <button
              onClick={moveCashToEnd}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
            >
              Mover dinheiro para o final
            </button>
          </div>
        );
      })()}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={session.payments.length === 0}
          className="flex-1 py-3 bg-green-600 text-white rounded hover:bg-green-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Confirmar Pagamentos
        </button>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 <strong>Dica Seq 21:</strong> R$ 20 crédito + R$ 50 dinheiro (troco R$ 30)</p>
        <p>💡 <strong>Dica Seq 22:</strong> R$ 40 crédito + R$ 60 débito</p>
        <p>💡 <strong>Dica Seq 23:</strong> R$ 100 crédito + R$ 50 PIX</p>
      </div>
    </div>
  );
}
