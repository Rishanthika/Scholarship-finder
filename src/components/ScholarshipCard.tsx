import type { MatchResult } from "@/types";
import { MatchBadge, ConfirmationRequiredNote } from "./MatchBadge";
import { FundingBadge } from "./FundingBadge";
import { formatDeadlineShort, getDeadlineState } from "@/lib/formatting";
import { CheckCircle2, AlertCircle, Calendar, Trophy } from "lucide-react";

interface ScholarshipCardProps {
  result: MatchResult;
  onView: (scholarshipId: string) => void;
  /** The single strongest match in the current list gets a slightly more
   * prominent treatment (brief §10) — everything else stays disciplined. */
  featured?: boolean;
}

export function ScholarshipCard({ result, onView, featured = false }: ScholarshipCardProps) {
  const { scholarship, university, tier, label, score, confirmationRequired, explanation } = result;
  if (tier === "excluded") return null;

  const deadlineState = getDeadlineState(scholarship);

  return (
    <div
      className={`rounded-2xl border bg-white p-5 transition-shadow sm:p-6 ${
        featured
          ? "border-brand-accent/40 shadow-floating"
          : tier === "lower"
            ? "border-brand-border/8 opacity-90"
            : "border-brand-border/10 shadow-card"
      }`}
    >
      {featured && (
        <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-brand-accent/10 px-2.5 py-1 text-[11px] font-semibold text-brand-accent">
          <Trophy className="h-3 w-3" aria-hidden="true" /> Top Match
        </span>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-heading text-base font-bold leading-snug text-brand-ink">{scholarship.scholarship_name}</h3>
          <p className="mt-0.5 truncate text-sm text-brand-muted">
            {university ? university.university_name : "Government Scholarship"} · {scholarship.country}
          </p>
        </div>
        <MatchBadge tier={tier} label="" score={score.total} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`text-sm font-semibold ${
            tier === "strong" ? "text-status-success" : tier === "potential" ? "text-status-warning" : "text-brand-muted"
          }`}
        >
          {label}
        </span>
      </div>
      {confirmationRequired && <ConfirmationRequiredNote />}

      <div className="mt-4 flex flex-wrap gap-2">
        <FundingBadge type={scholarship.funding_type} />
        <span className="inline-flex items-center rounded-lg bg-brand-primary/5 px-2.5 py-1 text-xs font-semibold text-brand-ink">
          {scholarship.degree_level.map((d) => d[0]!.toUpperCase() + d.slice(1)).join(" / ")}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
            deadlineState === "passed" ? "bg-status-errorBg text-status-error" : "bg-brand-primary/5 text-brand-ink"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          {formatDeadlineShort(scholarship)}
        </span>
        {(scholarship.qs_2026 || scholarship.the_2026) && (
          <span className="inline-flex items-center rounded-lg bg-brand-primary/5 px-2.5 py-1 text-xs font-semibold text-brand-muted">
            QS {scholarship.qs_2026 ?? "—"} · THE {scholarship.the_2026 ?? "—"}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1.5 border-t border-brand-border/8 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Why this matches you</p>
        {explanation.lines.map((line, i) => (
          <p key={i} className="flex items-start gap-2 text-sm text-brand-ink">
            {line.type === "pass" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-success" aria-hidden="true" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
            )}
            <span className={line.type === "warning" ? "text-status-warning" : ""}>{line.text}</span>
          </p>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onView(scholarship.id)}
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primaryLight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        View Scholarship
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
