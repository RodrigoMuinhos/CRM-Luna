'use client';

import { useState } from 'react';
import { ChevronRight, ChevronLeft, X, MousePointer, Keyboard, Search, CheckCircle, User } from 'lucide-react';

interface FlowStep {
  icon: React.ReactNode;
  number: number;
  title: string;
  description: string;
}

interface HelpTourProps {
  isOpen: boolean;
  onClose: () => void;
}

const flowSteps: FlowStep[] = [
  {
    icon: <MousePointer className="w-8 h-8" />,
    number: 1,
    title: 'Clique em "Acabei de chegar"',
    description: 'Ao chegar na clínica, toque no botão principal para iniciar seu check-in.',
  },
  {
    icon: <User className="w-8 h-8" />,
    number: 2,
    title: 'Selecione a letra do seu nome',
    description: 'Escolha a primeira letra do seu nome para encontrar seu cadastro mais rapidamente.',
  },
  {
    icon: <Keyboard className="w-8 h-8" />,
    number: 3,
    title: 'Digite seu CPF',
    description: 'Informe os 11 números do seu CPF. O sistema vai localizar suas consultas automaticamente.',
  },
  {
    icon: <Search className="w-8 h-8" />,
    number: 4,
    title: 'Confirme sua consulta',
    description: 'Verifique os dados da sua consulta e confirme o check-in tocando no botão verde.',
  },
  {
    icon: <CheckCircle className="w-8 h-8" />,
    number: 5,
    title: 'Pronto! Check-in realizado',
    description: 'Aguarde ser chamado(a). Você pode receber a confirmação por e-mail se desejar.',
  },
];

export function HelpTour({ isOpen, onClose }: HelpTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = flowSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === flowSteps.length - 1;
  const progress = ((currentStep + 1) / flowSteps.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
      setCurrentStep(0);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    onClose();
    setCurrentStep(0);
  };

  return (
    <>
      {/* Overlay escuro */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal central elegante */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden pointer-events-auto animate-[fade-in_0.3s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header com gradiente */}
          <div className="bg-gradient-to-br from-[#D3A67F] via-[#C89769] to-[#B8875A] px-6 py-5 relative overflow-hidden">
            {/* Decoração de fundo */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full border-4 border-white" />
              <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full border-4 border-white" />
            </div>
            
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <span className="text-white text-2xl">❓</span>
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Como funciona</h2>
                    <p className="text-white/80 text-xs">Passo {step.number} de {flowSteps.length}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                  aria-label="Fechar"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Barra de progresso */}
              <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Indicadores de passo */}
          <div className="flex justify-center gap-2 py-4 bg-gray-50/50">
            {flowSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'bg-[#D3A67F] w-8' 
                    : index < currentStep 
                      ? 'bg-[#D3A67F]/60 w-2.5' 
                      : 'bg-gray-300 w-2.5'
                }`}
                aria-label={`Ir para passo ${index + 1}`}
              />
            ))}
          </div>

          {/* Conteúdo do passo */}
          <div className="px-6 pb-6">
            <div className="space-y-6">
              {/* Demonstração visual no topo */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 flex items-center justify-center min-h-[400px] border-2 border-gray-200">
                <div className="text-center space-y-6 w-full max-w-lg mx-auto">
                  {/* Ícone grande */}
                  <div className="flex justify-center">
                    <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-[#FEF3E7] to-[#FDE8D4] flex items-center justify-center text-[#D3A67F] shadow-xl shadow-[#D3A67F]/10">
                      {step.icon}
                    </div>
                  </div>
                  
                  {/* Demonstração específica de cada passo */}
                  {currentStep === 0 && (
                    <div className="space-y-4">
                      <div className="w-64 h-20 mx-auto bg-[#D3A67F] text-white rounded-2xl flex items-center justify-center font-semibold text-xl shadow-xl cursor-pointer hover:bg-[#C89769] transition-colors">
                        👋 Acabei de chegar
                      </div>
                      <p className="text-sm text-gray-500">Toque aqui ao chegar</p>
                    </div>
                  )}
                  
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-5 gap-3 max-w-xs mx-auto">
                        {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                          <div key={letter} className="w-12 h-12 bg-white border-2 border-[#D3A67F] rounded-xl flex items-center justify-center font-bold text-[#D3A67F] text-lg cursor-pointer hover:bg-[#D3A67F] hover:text-white transition-colors">
                            {letter}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500">Selecione a primeira letra</p>
                    </div>
                  )}
                  
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div className="bg-white border-2 border-[#D3A67F] rounded-xl p-6 max-w-sm mx-auto">
                        <div className="text-3xl font-mono text-gray-400 tracking-widest">000.000.000-00</div>
                      </div>
                      <p className="text-sm text-gray-500">Digite seu CPF</p>
                    </div>
                  )}
                  
                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <div className="bg-white rounded-xl p-6 shadow-xl text-left space-y-3 max-w-sm mx-auto">
                        <div className="text-base text-gray-600">📅 06/12/2025 às 15:00</div>
                        <div className="text-base text-gray-600">👨‍⚕️ Dr. João Silva</div>
                        <div className="text-base text-gray-600">🏥 Cardiologia</div>
                        <button className="w-full mt-3 bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors text-base">
                          ✓ Confirmar Check-in
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {currentStep === 4 && (
                    <div className="space-y-4">
                      <div className="w-24 h-24 mx-auto bg-green-500 rounded-full flex items-center justify-center text-white">
                        <CheckCircle className="w-14 h-14" />
                      </div>
                      <div className="text-green-600 font-bold text-xl">Check-in confirmado!</div>
                      <p className="text-sm text-gray-500">Aguarde ser chamado(a)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Título e descrição abaixo */}
              <div className="text-center">
                <div className="mb-6">
                  <div className="inline-block bg-[#D3A67F]/10 text-[#D3A67F] font-bold px-4 py-2 rounded-full text-base mb-4">
                    Passo {step.number} de {flowSteps.length}
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-xl max-w-2xl mx-auto">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Botões de navegação */}
            <div className="flex gap-3">
              {!isFirstStep && (
                <button
                  onClick={handlePrev}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={18} />
                  Anterior
                </button>
              )}
              <button
                onClick={handleNext}
                className={`flex-1 bg-[#D3A67F] hover:bg-[#C89769] text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#D3A67F]/30 ${
                  isFirstStep ? 'flex-[2]' : ''
                }`}
              >
                {isLastStep ? 'Entendi!' : 'Próximo'}
                {!isLastStep && <ChevronRight size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}

// Exporta props type para uso externo
export type { HelpTourProps };
