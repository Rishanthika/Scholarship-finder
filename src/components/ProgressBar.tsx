interface ProgressBarProps {
  step: number;
  totalSteps: number;
}

/** Segmented progress bar — one filled segment per completed step, rather
 * than a single continuous fill, so progress reads as discrete steps
 * (matching the actual step-by-step assessment) rather than a percentage. */
export function ProgressBar({ step, totalSteps }: ProgressBarProps) {
  return (
    <div className="mb-6">
      <p className="mb-2.5 text-xs font-semibold tracking-wide text-brand-muted">
        Step {String(step).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
      </p>
      <div className="flex gap-1.5" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={totalSteps}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i < step ? "bg-brand-accent" : "bg-brand-border/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
