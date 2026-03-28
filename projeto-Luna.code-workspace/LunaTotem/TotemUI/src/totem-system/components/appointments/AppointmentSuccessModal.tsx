import { Check } from 'lucide-react';

type Props = {
  isOpen: boolean;
  patientName: string;
  onClose: () => void;
};

export function AppointmentSuccessModal({
  isOpen,
  patientName,
  onClose,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 sm:px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {/* Success Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
          Consulta salva com sucesso!
        </h2>

        {/* Message */}
        <p className="text-sm text-gray-500 text-center mb-6">
          A consulta foi agendada e o médico será notificado por email.
        </p>

        {/* Patient Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 text-center">
            <span className="font-medium">Paciente:</span> {patientName}
          </p>
        </div>

        {/* Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#D3A67F] px-4 py-3 text-sm font-semibold text-white hover:bg-[#c99970] transition-colors"
        >
          <Check size={18} />
          Continuar
        </button>
      </div>
    </div>
  );
}
