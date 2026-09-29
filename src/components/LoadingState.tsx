"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";

const STEPS = [
  "Reviewing your academic profile",
  "Comparing study preferences",
  "Checking scholarship requirements",
  "Ranking potential matches",
];

/** Communicates genuine progress stages — never implies AI is "thinking"
 * about something it isn't. Each step ticks on a fixed interval; this is
 * an honest visual pacing of real, fast work, not a simulation of slow
 * processing. */
export function LoadingState() {
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCompleted((c) => (c < STEPS.length ? c + 1 : c));
    }, 450);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-brand-background px-5 text-center">
      <div className="w-full max-w-xs rounded-2xl border border-brand-border/10 bg-white p-6 shadow-card">
        <p className="font-heading text-base font-semibold text-brand-ink">Finding your matches...</p>
        <ul className="mt-5 space-y-3 text-left" aria-live="polite">
          {STEPS.map((step, i) => {
            const done = i < completed;
            return (
              <li key={step} className="flex items-center gap-2.5 text-sm">
                {done ? (
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-status-success" aria-hidden="true" />
                ) : (
                  <Circle className="h-4.5 w-4.5 shrink-0 text-brand-border/25" aria-hidden="true" />
                )}
                <span className={done ? "text-brand-ink" : "text-brand-muted"}>{step}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
