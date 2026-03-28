import { Button } from '../Button';
import { PageContainer } from '../PageContainer';
import { FlowType, getFlowSteps } from '@/lib/flowSteps';

interface LetterSelectionProps {
  onSelectLetter: (letter: string) => void;
  onBack: () => void;
  flow?: FlowType;
}

export function LetterSelection({ onSelectLetter, onBack, flow = 'checkin' }: LetterSelectionProps) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const steps = getFlowSteps(flow);

  return (
    <PageContainer steps={steps} currentStep={0}>
      <div className="w-full flex flex-col items-center gap-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl text-[#D3A67F]">
            Qual é a primeira letra do seu nome?
          </h2>
        </div>

        <div className="w-full max-w-5xl mx-auto grid grid-cols-3 sm:grid-cols-6 xl:grid-cols-9 gap-3 md:gap-4 place-items-center">
          {alphabet.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => onSelectLetter(letter)}
              className="h-14 w-20 md:w-24 rounded-2xl border border-[#E7D7CD] bg-white text-[#B77446] text-xl md:text-2xl font-semibold shadow-[0_8px_18px_rgba(209,164,132,0.25)] transition-all hover:-translate-y-[1px] hover:bg-[#F4E7DF]"
              aria-label={`Selecionar letra ${letter}`}
            >
              {letter}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="lg"
          onClick={onBack}
          className="mt-4"
        >
          ← Voltar
        </Button>
      </div>
    </PageContainer>
  );
}
