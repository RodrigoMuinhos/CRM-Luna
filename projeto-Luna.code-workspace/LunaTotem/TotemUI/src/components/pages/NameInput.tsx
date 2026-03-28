import { useEffect, useState } from 'react';
import { maskCPF, maskCPFWithHiddenCenter, stripCPF } from '@/lib/cpf';
import { FlowType, getFlowSteps } from '@/lib/flowSteps';
import { Button } from '../Button';
import { PageContainer } from '../PageContainer';
import { ActionFooter } from '../ActionFooter';
import type { Appointment } from '../../types';

interface NameInputProps {
  onSubmit: (cpf: string) => void;
  onBack: () => void;
  flow?: FlowType;
  appointments?: Appointment[];
  onSelectAppointment?: (apt: Appointment) => void;
  onHelpClick?: () => void;
  onCpfChange?: (digits: string) => void;
  suggestionsMode?: 'filter' | 'direct';
  suggestMinDigits?: number;
  isSearching?: boolean;
}

export function NameInput({
  onSubmit,
  onBack,
  flow = 'checkin',
  appointments = [],
  onSelectAppointment,
  onHelpClick,
  onCpfChange,
  suggestionsMode = 'filter',
  suggestMinDigits = 3,
  isSearching = false,
}: NameInputProps) {
  const [cpf, setCpf] = useState('');

  useEffect(() => {
    onCpfChange?.(stripCPF(cpf));
  }, [cpf, onCpfChange]);

  const subtitle =
    flow === 'payment'
      ? 'Use seu CPF para localizar seu pagamento'
      : 'Use seu CPF para localizar seu agendamento';

  const handleSubmit = () => {
    onSubmit(stripCPF(cpf));
  };

  const handleInputChange = (value: string) => {
    const digits = stripCPF(value);
    setCpf(maskCPF(digits));
  };

  const addDigit = (digit: string) => {
    setCpf((prev) => {
      const digits = stripCPF(prev);
      if (digits.length >= 11) {
        return maskCPF(digits);
      }
      return maskCPF(digits + digit);
    });
  };

  const backspace = () => {
    setCpf((prev) => maskCPF(stripCPF(prev).slice(0, -1)));
  };

  const clearAll = () => setCpf('');

  const digitRows: string[][] = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  return (
    <PageContainer
      onHelpClick={onHelpClick}
      steps={getFlowSteps(flow)}
      currentStep={0}
    >
      <div className="w-full flex flex-col items-center gap-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl text-[#D3A67F]">Digite seu CPF</h2>
          <p className="text-lg text-[#4A4A4A]/70">{subtitle}</p>
        </div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
          <div className="relative">
            <input
              data-tour="cpf-input"
              value={cpf}
              onChange={(e) => handleInputChange(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={14}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 text-lg focus:border-[#D3A67F] focus:outline-none"
              placeholder="CPF"
            />
            {cpf && (
              <button
                type="button"
                onClick={clearAll}
                className="absolute inset-y-0 right-2 flex items-center justify-center rounded-full p-2 text-gray-400 transition hover:text-[#B77446] hover:bg-[#F4E7DF]"
                aria-label="Limpar CPF"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          <div className="mt-4 flex justify-center">
            <Button data-tour="search-button" variant="primary" onClick={handleSubmit} className="min-w-[180px]">
              Buscar
            </Button>
          </div>
          {/* Live suggestions */}
          {(() => {
            // Sugestões aparecem conforme digita, sem mostrar "Nenhum resultado".
            // No modo 'direct', o pai já envia a lista pronta (ex: vinda do backend).
            const digits = stripCPF(cpf);
            if (!onSelectAppointment) return null;
            if (digits.length < suggestMinDigits) {
              return null;
            }

            // Mostrar "Buscando..." se está pesquisando
            if (isSearching) {
              return (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500 animate-pulse">Buscando consultas...</p>
                </div>
              );
            }

            const results =
              suggestionsMode === 'direct'
                ? appointments.slice(0, 10)
                : appointments
                    .filter((a) => {
                      const patientCpf = (a.patient.cpf || a.cpf || '').replace(/\D/g, '');
                      return digits.length > 0 && patientCpf.includes(digits);
                    })
                    .slice(0, 10);

            if (!results.length) {
              return null;
            }

            return (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2 px-1">
                  {results.length === 1 ? '1 consulta encontrada' : `${results.length} consultas encontradas`}
                </p>
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white shadow-md">
                  {results.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => onSelectAppointment(a)}
                        className="w-full text-left px-4 py-3 hover:bg-[#F6F2EC] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-800 font-medium">{a.patient.name}</span>
                          <span className="text-xs text-[#D3A67F]">{a.time}</span>
                        </div>
                        <div className="text-xs text-gray-500 flex justify-between mt-1">
                          <span>{a.doctor}</span>
                          <span>CPF {maskCPFWithHiddenCenter(a.patient.cpf || a.cpf || '')}</span>
                        </div>
                        {a.amount && a.amount > 0 && (
                          <div className="text-xs text-[#D3A67F] mt-1 font-medium">
                            R$ {a.amount.toFixed(2).replace('.', ',')}
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </div>

        {/* On-screen keyboard for touch devices without hardware keyboard */}
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-4 mb-20">
          <div className="flex flex-col gap-3">
            {digitRows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2">
                {row.map((digit) => (
                  <button
                    key={digit}
                    onClick={() => addDigit(digit)}
                    className="h-12 rounded-xl bg-white text-[#D3A67F] text-2xl hover:bg-[#D3A67F] hover:text-white shadow-md transition-all duration-150 active:scale-95"
                  >
                    {digit}
                  </button>
                ))}
              </div>
            ))}

            <div className="grid grid-cols-3 gap-2 mt-2">
              <button
                onClick={clearAll}
                className="h-12 rounded-xl bg-white text-[#D3A67F] hover:bg-[#ECEDDE] hover:text-[#4A4A4A] shadow-md transition-all duration-150 active:scale-95"
              >
                Limpar
              </button>
              <button
                onClick={() => addDigit('0')}
                className="h-12 rounded-xl bg-white text-[#D3A67F] text-2xl hover:bg-[#D3A67F] hover:text-white shadow-md transition-all duration-150 active:scale-95"
              >
                0
              </button>
              <button
                onClick={backspace}
                className="h-12 rounded-xl bg-white text-[#D3A67F] hover:bg-[#CDB0AD] hover:text-white shadow-md transition-all duration-150 active:scale-95 flex items-center justify-center"
                aria-label="Apagar"
              >
                Apagar
              </button>
            </div>

          </div>
        </div>
        <ActionFooter onBack={onBack} showConfirm={false} />
      </div>
    </PageContainer>
  );
}
