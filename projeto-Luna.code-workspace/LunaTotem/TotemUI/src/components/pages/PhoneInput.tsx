import { useState } from 'react';
import { Button } from '../Button';
import { PageContainer } from '../PageContainer';
import { ActionFooter } from '../ActionFooter';
import { FlowType, getFlowSteps } from '@/lib/flowSteps';

interface PhoneInputProps {
  onSubmit: (phone: string) => void;
  onBack: () => void;
  flow?: FlowType;
}

export function PhoneInput({ onSubmit, onBack, flow = 'checkin' }: PhoneInputProps) {
  const [phone, setPhone] = useState('');

  const handleNumberClick = (num: string) => {
    if (phone.length < 11) {
      setPhone(phone + num);
    }
  };

  const handleBackspace = () => {
    setPhone(phone.slice(0, -1));
  };

  const handleSubmit = () => {
    if (phone.length >= 10) {
      onSubmit(phone);
    }
  };

  const formatPhone = (value: string) => {
    if (value.length <= 2) return value;
    if (value.length <= 7) return `(${value.slice(0, 2)}) ${value.slice(2)}`;
    if (value.length <= 11) {
      return `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    }
    return value;
  };

  return (
    <PageContainer steps={getFlowSteps(flow)} currentStep={0}>
      <div className="w-full flex flex-col items-center gap-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl text-[#D3A67F]">
            Digite seu telefone
          </h2>
          <p className="text-lg text-[#4A4A4A]/70">
            Use o telefone informado no agendamento
          </p>
        </div>

        {/* Phone Display */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center text-3xl md:text-4xl text-[#D3A67F] min-h-[3rem] flex items-center justify-center">
            {formatPhone(phone) || '_'}
          </div>
        </div>

        {/* Number Pad */}
        <div className="w-full max-w-md grid grid-cols-3 gap-4 mb-24">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              className="aspect-square rounded-2xl bg-white text-[#D3A67F] text-3xl hover:bg-[#D3A67F] hover:text-white shadow-lg transition-all duration-200 active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleBackspace}
            className="aspect-square rounded-2xl bg-white text-[#D3A67F] hover:bg-[#CDB0AD] hover:text-white shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
              <line x1="18" y1="9" x2="12" y2="15" />
              <line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </button>
          <button
            onClick={() => handleNumberClick('0')}
            className="aspect-square rounded-2xl bg-white text-[#D3A67F] text-3xl hover:bg-[#D3A67F] hover:text-white shadow-lg transition-all duration-200 active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            disabled={phone.length < 10}
            className="aspect-square rounded-2xl bg-[#D3A67F] text-white hover:bg-[#C89769] shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </div>

        <ActionFooter onBack={onBack} onConfirm={handleSubmit} confirmLabel="Confirmar" />
      </div>
    </PageContainer>
  );
}
