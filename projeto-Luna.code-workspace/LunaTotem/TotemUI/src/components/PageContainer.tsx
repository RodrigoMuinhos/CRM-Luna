import { ReactNode } from 'react';
import { BadgeCheck, CheckCircle2, CreditCard, User, Users } from 'lucide-react';
import { Logo } from './Logo';

interface PageContainerProps {
  children: ReactNode;
  showLogo?: boolean;
  showHelp?: boolean;
  onHelpClick?: () => void;
  steps?: string[];
  currentStep?: number;
}

export function PageContainer({
  children,
  showLogo = true,
  showHelp = true,
  onHelpClick,
  steps,
  currentStep,
}: PageContainerProps) {
  const hasSteps = Array.isArray(steps) && steps.length > 0 && typeof currentStep === 'number';
  const maxStepIndex = hasSteps ? Math.max(steps.length - 1, 0) : 0;
  const safeStep = hasSteps
    ? Math.min(Math.max(currentStep ?? 0, 0), maxStepIndex)
    : 0;
  const progressPercent = maxStepIndex > 0 ? (safeStep / maxStepIndex) * 100 : 0;
  const progressWidth = progressPercent <= 0 ? '0px' : `calc(${progressPercent}% - 12px)`;

  const getStepIcon = (label: string) => {
    const normalized = label.toLowerCase();
    if (normalized.includes('ident')) return <User size={18} />;
    if (normalized.includes('sele') || normalized.includes('paciente')) return <Users size={18} />;
    if (normalized.includes('confirm')) return <BadgeCheck size={18} />;
    if (normalized.includes('pag')) return <CreditCard size={18} />;
    if (normalized.includes('conclu')) return <CheckCircle2 size={18} />;
    return <CheckCircle2 size={18} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#ECE0DE] via-[#CDDCDC]/20 to-[#ECE0DE] p-6 md:p-8 lg:p-12">
      {/* Header */}
      {(showLogo || hasSteps) && (
        <header className="w-full flex flex-col items-center gap-5 mb-8 lg:mb-12">
          {showLogo && <Logo />}
          {hasSteps && steps && (
            <div className="w-full max-w-4xl">
              <div className="relative px-3">
                <div className="absolute left-6 right-6 top-4 h-px bg-[#E8E2DA]" />
                <div
                  className="absolute left-6 top-4 h-px bg-[#D3A67F] transition-all duration-300"
                  style={{ width: progressWidth }}
                />
                <div className="flex items-start justify-between gap-2">
                  {steps.map((step, index) => {
                    const isComplete = index < safeStep;
                    const isActive = index === safeStep;
                    const circleClass = isComplete
                      ? 'bg-[#D3A67F] text-white border-[#D3A67F]'
                      : isActive
                      ? 'bg-white text-[#D3A67F] border-[#D3A67F]'
                      : 'bg-white/70 text-[#C9B4A0] border-[#E8E2DA]';
                    const labelClass = isActive
                      ? 'text-[#D3A67F]'
                      : 'text-[#4A4A4A]/60';

                    return (
                      <div key={`${step}-${index}`} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                        <div
                          className={`h-8 w-8 rounded-full border flex items-center justify-center ${circleClass}`}
                        >
                          {getStepIcon(step)}
                        </div>
                        <span className={`text-xs md:text-sm text-center ${labelClass}`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center w-full max-w-5xl mx-auto">
        {children}
      </main>

      {/* Footer */}
      {showHelp && (
        <footer className="w-full flex justify-center mt-8">
          <button
            onClick={onHelpClick}
            className="px-6 py-3 text-[#D3A67F] hover:text-[#C89769] transition-colors flex items-center gap-2"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="text-lg">Precisa de ajuda?</span>
          </button>
        </footer>
      )}
    </div>
  );
}
