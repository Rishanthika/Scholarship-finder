import { ReactNode } from "react";
import { ProgressBar } from "./ProgressBar";

interface AssessmentStepProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  validationMessage?: string;
}

export function AssessmentStep({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled = false,
  validationMessage = "Please answer the required questions above to continue.",
}: AssessmentStepProps) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-brand-background">
      {/* Subtle background depth — a faint radial glow, not a blank white screen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-brand-accent/[0.06] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-brand-secondary/[0.05] blur-3xl"
      />

      <div key={step} className="relative mx-auto flex min-h-[100dvh] max-w-app flex-col px-5 py-6 animate-fade-in-up sm:py-10">
        <ProgressBar step={step} totalSteps={totalSteps} />

        <h1 className="font-heading text-xl font-bold tracking-tight text-brand-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">{subtitle}</p>}

        <div className="mt-7 flex-1 space-y-7">{children}</div>

        {nextDisabled && (
          <p role="alert" className="mt-4 text-sm text-status-warning">
            {validationMessage}
          </p>
        )}

        <div className="sticky bottom-0 mt-4 flex gap-3 border-t border-brand-border/8 bg-brand-background/95 py-4 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:py-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-brand-border/15 px-5 py-3 text-sm font-medium text-brand-ink transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              ← Back
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            aria-disabled={nextDisabled}
            className="flex-1 rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-primaryLight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
