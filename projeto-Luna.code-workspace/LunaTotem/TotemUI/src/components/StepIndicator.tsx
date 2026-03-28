interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        {steps.map((label, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          return (
            <div key={label} className="flex items-center flex-1 min-w-0">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                  isComplete
                    ? 'border-[#4CAF50] bg-[#4CAF50] text-white'
                    : isCurrent
                    ? 'border-[#D3A67F] text-[#D3A67F] bg-white'
                    : 'border-[#E3D5CC] text-[#B7A094] bg-white'
                }`}
              >
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-2 h-[2px] flex-1 rounded-full transition-colors ${
                    isComplete
                      ? 'bg-[#4CAF50]'
                      : isCurrent
                      ? 'bg-[#D3A67F]'
                      : 'bg-[#E8DDD6]'
                  }`}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
      <div
        className="mt-3 grid gap-2 text-xs font-semibold uppercase tracking-wide text-[#A08E84]"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((label, index) => (
          <span
            key={label}
            className={`truncate ${
              index === currentStep ? 'text-[#D3A67F]' : ''
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
