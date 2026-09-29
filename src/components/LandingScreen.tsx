"use client";

import { useState } from "react";
import Image from "next/image";
import { Target, Wallet, Globe2, ShieldCheck, User, Phone, Mail } from "lucide-react";
import type { LeadInfo } from "@/types";
import { validateLeadInfo, type LeadInfoErrors } from "@/lib/leadValidation";

interface LandingScreenProps {
  lead: LeadInfo;
  onLeadChange: (lead: LeadInfo) => void;
  onStart: () => void;
}

const VALUE_CARDS = [
  { icon: Target, title: "Personalized matching", body: "Matched to your academic profile and study goals." },
  { icon: Wallet, title: "Funding clarity", body: "Understand exactly what each scholarship covers." },
  { icon: Globe2, title: "Global opportunities", body: "Explore verified opportunities across leading study destinations." },
  { icon: ShieldCheck, title: "Official sources", body: "Scholarship information linked to official providers." },
];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-status-error">
      {message}
    </p>
  );
}

export function LandingScreen({ lead, onLeadChange, onStart }: LandingScreenProps) {
  const [errors, setErrors] = useState<LeadInfoErrors>({});
  const [touched, setTouched] = useState(false);

  const handleStart = () => {
    setTouched(true);
    const validationErrors = validateLeadInfo(lead);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      onStart();
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full rounded-xl border bg-white px-4 py-3 text-sm text-brand-ink transition focus:outline-none focus:ring-1 ${
      hasError
        ? "border-status-error focus:border-status-error focus:ring-status-error"
        : "border-brand-border/15 focus:border-brand-primary focus:ring-brand-primary"
    }`;

  return (
    <div className="min-h-[100dvh] bg-brand-background">
      <header className="mx-auto flex max-w-wide items-center justify-between px-5 py-5 sm:px-8">
        <Image
          src="https://gofuturegrad.com/wp-content/uploads/2026/06/cropped-cropped-Futuregrad-logo-official-1.jpeg"
          alt="FutureGrad"
          width={128}
          height={48}
          className="h-9 w-auto"
          unoptimized
        />
        <span className="hidden text-sm font-medium text-brand-muted sm:block">Scholarship Finder</span>
      </header>

      <section className="mx-auto grid max-w-wide items-start gap-10 px-5 pb-16 pt-4 sm:px-8 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:pb-24 lg:pt-10">
        <div>
          <span className="inline-flex items-center rounded-full border border-brand-primary/15 bg-brand-primary/5 px-3 py-1 text-xs font-semibold text-brand-primary">
            AI-Powered Scholarship Finder
          </span>

          <h1 className="mt-5 font-heading text-4xl font-bold leading-[1.08] tracking-tight text-brand-ink sm:text-5xl lg:text-[3.1rem]">
            Find scholarships that fit your future.
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-brand-muted">
            Discover scholarship opportunities matched to your academic profile, study plans and funding
            preferences.
          </p>

          <p className="mt-4 text-xs text-brand-muted">
            40+ verified opportunities &bull; Personalized matching &bull; Official sources
          </p>

          <dl className="mt-10 hidden grid-cols-1 gap-3 sm:grid">
            {VALUE_CARDS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/5">
                  <Icon className="h-4.5 w-4.5 text-brand-primary" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-sm font-semibold text-brand-ink">{title}</dt>
                  <dd className="text-sm text-brand-muted">{body}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        {/* Lead-capture card — replaces the decorative hero visual with the
            actual functional first step, styled with the same premium
            floating-card treatment. */}
        <div className="rounded-2xl border border-brand-border/10 bg-white p-6 shadow-floating sm:p-7">
          <h2 className="font-heading text-lg font-bold text-brand-ink">First, tell us who you are.</h2>
          <p className="mt-1 text-sm text-brand-muted">We&rsquo;ll use this to save your matches and follow up with guidance.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="lead-name" className="mb-1.5 block text-sm font-medium text-brand-ink">
                Full Name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" aria-hidden="true" />
                <input
                  id="lead-name"
                  type="text"
                  value={lead.name}
                  onChange={(e) => onLeadChange({ ...lead, name: e.target.value })}
                  placeholder="Ananya Rao"
                  className={`${inputClass(touched && !!errors.name)} pl-10`}
                  aria-invalid={touched && !!errors.name}
                  aria-describedby="lead-name-error"
                />
              </div>
              {touched && <span id="lead-name-error"><FieldError message={errors.name} /></span>}
            </div>

            <div>
              <label htmlFor="lead-phone" className="mb-1.5 block text-sm font-medium text-brand-ink">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" aria-hidden="true" />
                <input
                  id="lead-phone"
                  type="tel"
                  value={lead.phone}
                  onChange={(e) => onLeadChange({ ...lead, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className={`${inputClass(touched && !!errors.phone)} pl-10`}
                  aria-invalid={touched && !!errors.phone}
                  aria-describedby="lead-phone-error"
                />
              </div>
              {touched && <span id="lead-phone-error"><FieldError message={errors.phone} /></span>}
            </div>

            <div>
              <label htmlFor="lead-email" className="mb-1.5 block text-sm font-medium text-brand-ink">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" aria-hidden="true" />
                <input
                  id="lead-email"
                  type="email"
                  value={lead.email}
                  onChange={(e) => onLeadChange({ ...lead, email: e.target.value })}
                  placeholder="ananya@example.com"
                  className={`${inputClass(touched && !!errors.email)} pl-10`}
                  aria-invalid={touched && !!errors.email}
                  aria-describedby="lead-email-error"
                />
              </div>
              {touched && <span id="lead-email-error"><FieldError message={errors.email} /></span>}
            </div>
          </div>

          <button
            type="button"
            onClick={handleStart}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-primaryLight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            Start Finding My Scholarships
            <span aria-hidden="true">→</span>
          </button>
          <p className="mt-3 text-center text-xs text-brand-muted">Takes about 2-3 minutes</p>
        </div>

        {/* Value cards, mobile only (desktop shows them in the left column above) */}
        <dl className="grid grid-cols-1 gap-4 sm:hidden">
          {VALUE_CARDS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3 rounded-xl border border-brand-border/10 bg-white p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/5">
                <Icon className="h-4.5 w-4.5 text-brand-primary" aria-hidden="true" />
              </span>
              <div>
                <dt className="text-sm font-semibold text-brand-ink">{title}</dt>
                <dd className="text-xs text-brand-muted">{body}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
