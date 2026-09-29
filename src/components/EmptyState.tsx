import { SearchX } from "lucide-react";

interface EmptyStateProps {
  variant: "no_matches" | "amber_only" | "error";
  onContactFutureGrad: () => void;
}

const COPY = {
  no_matches: {
    title: "We couldn't find a strong match yet.",
    body: "Your profile may simply fall outside the requirements of the scholarships currently in our verified database. Try loosening your funding preference or country selection, or talk to a counsellor about options we may not have listed yet.",
  },
  amber_only: {
    title: "Potential Matches — Confirmation Required",
    body: "We found opportunities that need an extra confirmation step with the official provider. We've flagged exactly what to check on each one below.",
  },
  error: {
    title: "We're having trouble loading scholarship data right now.",
    body: "Please try again in a moment.",
  },
};

export function EmptyState({ variant, onContactFutureGrad }: EmptyStateProps) {
  const copy = COPY[variant];

  return (
    <div className="rounded-2xl border border-brand-border/10 bg-white p-8 text-center sm:p-10">
      {variant !== "amber_only" && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/5">
          <SearchX className="h-5 w-5 text-brand-primary" aria-hidden="true" />
        </div>
      )}
      <p className="font-heading text-base font-bold text-brand-ink">{copy.title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-brand-muted">{copy.body}</p>
      {variant !== "amber_only" && (
        <button
          type="button"
          onClick={onContactFutureGrad}
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primaryLight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          Talk to a FutureGrad counsellor
        </button>
      )}
    </div>
  );
}
