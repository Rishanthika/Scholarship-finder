"use client";

import type { MatchResult } from "@/types";
import { MatchRing, ConfirmationRequiredNote, MatchScoreDisclaimer } from "./MatchBadge";
import { FundingBadge } from "./FundingBadge";
import { track } from "@/lib/analytics";
import { formatDeadlineDetail } from "@/lib/formatting";
import { CheckCircle2, AlertCircle, ArrowLeft, ExternalLink } from "lucide-react";

interface ScholarshipDetailProps {
  result: MatchResult;
  onBack: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-brand-border/10 bg-white p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-muted">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-brand-ink">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <p>
      <span className="font-medium text-brand-ink">{label}:</span>{" "}
      <span className="text-brand-muted">{value ?? "Not specified by official source"}</span>
    </p>
  );
}

export function ScholarshipDetail({ result, onBack }: ScholarshipDetailProps) {
  const { scholarship, university, tier, label, score, confirmationRequired, explanation } = result;
  if (tier === "excluded") return null;

  const tierColor = tier === "strong" ? "text-status-success" : tier === "potential" ? "text-status-warning" : "text-brand-muted";

  return (
    <div className="min-h-[100dvh] bg-brand-background">
      <div className="mx-auto max-w-app px-5 py-6 sm:py-10">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to results
        </button>

        <div className="rounded-2xl border border-brand-border/10 bg-white p-6">
          <p className="text-sm text-brand-muted">
            {university ? (
              <a href={university.official_url ?? undefined} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                {university.university_name}
              </a>
            ) : (
              "Government Scholarship"
            )}{" "}
            · {scholarship.country}
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-brand-ink">{scholarship.scholarship_name}</h1>

          <div className="mt-4 flex items-center gap-3">
            <MatchRing tier={tier} score={score.total} size={56} />
            <div>
              <p className={`text-sm font-bold ${tierColor}`}>{label}</p>
              {confirmationRequired && <ConfirmationRequiredNote />}
            </div>
          </div>

          <div className="mt-5">
            <FundingBadge type={scholarship.funding_type} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Section title="Funding">
            <Row label="Coverage" value={scholarship.tuition_coverage} />
            <Row label="Living support" value={scholarship.living_support} />
            <Row label="Other benefits" value={scholarship.other_benefits} />
          </Section>

          <Section title="Study Level & Fields">
            <Row label="Degree level" value={scholarship.degree_level.join(" / ")} />
            <Row
              label="Field/domain"
              value={scholarship.academic_fields === "all" ? "All fields" : scholarship.academic_fields.join(", ")}
            />
            {scholarship.excluded_academic_fields.length > 0 && (
              <p className="flex items-start gap-1.5 text-status-warning">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Excludes: {scholarship.excluded_academic_fields.join(", ")}
              </p>
            )}
          </Section>

          <Section title="Eligibility / Requirements">
            <Row
              label="Academic requirement"
              value={
                scholarship.minimum_percentage
                  ? `${scholarship.minimum_percentage}%+`
                  : scholarship.minimum_gpa
                    ? `${scholarship.minimum_gpa}+ GPA`
                    : null
              }
            />
            <Row label="English requirement" value={scholarship.english_requirement} />
            <Row
              label="Work/research experience"
              value={
                scholarship.work_experience_required_years
                  ? `${scholarship.work_experience_required_years}+ years required`
                  : scholarship.research_experience_required
                    ? "Research experience required"
                    : "Not mandatory"
              }
            />
          </Section>

          <Section title="Application">
            <Row label="Deadline" value={formatDeadlineDetail(scholarship)} />
            <Row label="Intake" value={scholarship.intake} />
            <Row label="Opens" value={scholarship.application_opening_date} />
          </Section>
        </div>

        <div className="mt-4">
          <Section title="Why this matches you">
            {explanation.lines.map((line, i) => (
              <p key={i} className="flex items-start gap-2">
                {line.type === "pass" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-success" aria-hidden="true" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
                )}
                <span className={line.type === "warning" ? "text-status-warning" : ""}>{line.text}</span>
              </p>
            ))}
          </Section>
        </div>

        {(scholarship.qs_2026 || scholarship.the_2026) && (
          <div className="mt-4">
            <Section title="University Ranking">
              <div className="flex gap-6">
                <div>
                  <p className="font-heading text-xl font-bold text-brand-ink">{scholarship.qs_2026 ?? "—"}</p>
                  <p className="text-xs text-brand-muted">QS 2026</p>
                </div>
                <div>
                  <p className="font-heading text-xl font-bold text-brand-ink">{scholarship.the_2026 ?? "—"}</p>
                  <p className="text-xs text-brand-muted">THE 2026</p>
                </div>
              </div>
            </Section>
          </div>
        )}

        <div className="mt-4">
          <Section title="Important Notes">
            <p>{scholarship.verification_notes ?? "No additional caveats on file."}</p>
            <p className="text-xs text-brand-muted">
              Verification status: {scholarship.verification_status} · Last verified: {scholarship.last_verified_date}
            </p>
          </Section>
        </div>

        <div className="mt-6 rounded-xl bg-brand-primary/[0.04] p-4">
          <MatchScoreDisclaimer />
          <p className="mt-1.5 text-xs leading-relaxed text-brand-muted">
            FutureGrad provides matching guidance. Always confirm current requirements and deadlines with the
            official scholarship provider.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {scholarship.official_scholarship_url ? (
            <a
              href={scholarship.official_scholarship_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("official_link_clicked", { scholarshipId: scholarship.id })}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-primaryLight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              Check Official Scholarship
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : (
            <p className="flex-1 rounded-xl border border-dashed border-brand-border/20 px-5 py-3.5 text-center text-sm text-brand-muted">
              We don&rsquo;t have a direct application link yet — search &ldquo;{scholarship.scholarship_name}&rdquo; on the
              provider&rsquo;s website.
            </p>
          )}
          {scholarship.official_university_url && scholarship.official_university_url !== scholarship.official_scholarship_url && (
            <a
              href={scholarship.official_university_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-border/15 px-5 py-3.5 text-sm font-semibold text-brand-ink transition hover:bg-white"
            >
              Official University Page
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
