import React from 'react';

interface CancelConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Modal de confirmação para cancelamento de transação.
 * Exibe pergunta "Tem certeza que deseja cancelar?"
 * com dois botões: "Não, continuar" e "Sim, cancelar"
 */
export const CancelConfirmModal: React.FC<CancelConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[#4A4A4A]">
            Tem certeza que deseja cancelar?
          </h2>
        </div>

        {/* Description */}
        <p className="text-sm text-[#4A4A4A]/70 mb-8 leading-relaxed">
          A transação será anulada no Leitor e você voltará à tela de seleção de pagamento.
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          {/* Rejeitar cancelamento */}
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-3 border-2 border-[#D3A67F] text-[#D3A67F] rounded-lg font-semibold hover:bg-[#D3A67F]/5 active:bg-[#D3A67F]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Não, continuar
          </button>

          {/* Confirmar cancelamento */}
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#D3A67F] to-[#D3A67F]/90 text-white rounded-lg font-semibold hover:from-[#D3A67F]/90 hover:to-[#D3A67F]/80 active:from-[#D3A67F]/80 active:to-[#D3A67F]/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Cancelando...
              </span>
            ) : (
              'Sim, cancelar'
            )}
          </button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-[#4A4A4A]/50 mt-6 text-center">
          Você poderá tentar o pagamento novamente após retornar
        </p>
      </div>
    </div>
  );
};
