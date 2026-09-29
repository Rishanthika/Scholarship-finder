"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { CheckCircle2 } from "lucide-react";

interface LeadCaptureCardProps {
  onSave: () => void;
}

/**
 * Name/phone/email are now collected upfront on the Welcome screen (see
 * LandingScreen.tsx), so this card no longer asks for them again — it
 * simply confirms the student wants their already-known matches saved,
 * using the contact details captured before the assessment started.
 */
export function LeadCaptureCard({ onSave }: LeadCaptureCardProps) {
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-brand-border/10 bg-white p-5 text-sm text-brand-ink">
        <CheckCircle2 className="h-4.5 w-4.5 text-status-success" aria-hidden="true" />
        Saved — a FutureGrad counsellor will follow up with you shortly.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-border/10 bg-white p-5">
      <p className="font-heading text-sm font-semibold text-brand-ink">
        Want to save these matches and get personalized guidance from FutureGrad?
      </p>
      <p className="mt-1 text-xs text-brand-muted">We&rsquo;ll use the details you provided earlier to follow up.</p>
      <button
        type="button"
        onClick={() => {
          track("lead_submitted");
          onSave();
          setSaved(true);
        }}
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primaryLight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        Save My Results
      </button>
    </div>
  );
}
