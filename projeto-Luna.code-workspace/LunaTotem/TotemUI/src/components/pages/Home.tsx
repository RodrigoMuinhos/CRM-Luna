import { Button } from '../Button';
import { PageContainer } from '../PageContainer';

interface HomeProps {
  onCheckIn: () => void;
  onPayment?: () => void;
  onHelpClick?: () => void;
}

export function Home({ onCheckIn, onPayment, onHelpClick }: HomeProps) {
  return (
    <PageContainer onHelpClick={onHelpClick}>
      <div className="w-full flex flex-col items-center gap-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl text-[#D3A67F]">
            Bem-vinda à Lunavita!
          </h1>
          <p className="text-xl md:text-2xl text-[#4A4A4A]/70">
            Escolha uma das opções abaixo
          </p>
        </div>

        {/* Botão principal de check-in */}
        <div className="w-full max-w-2xl flex flex-col gap-6">
          <Button
            variant="primary"
            size="xl"
            onClick={onCheckIn}
            className="w-full"
            data-tour="checkin-button"
          >
            <div className="flex items-center justify-center gap-4">
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
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Acabei de chegar</span>
            </div>
          </Button>

          {onPayment && (
            <Button
              variant="secondary"
              size="xl"
              onClick={onPayment}
              className="w-full"
            >
              <div className="flex items-center justify-center gap-4">
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
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                  <line x1="6" y1="15" x2="10" y2="15" />
                </svg>
                <span>Ir para pagamento</span>
              </div>
            </Button>
          )}

        </div>
      </div>
    </PageContainer>
  );
}
