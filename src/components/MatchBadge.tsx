import type { MatchTier } from "@/types";

const TIER_STYLES: Record<Exclude<MatchTier, "excluded">, { ring: string; text: string; label: string }> = {
  strong: { ring: "stroke-status-success", text: "text-status-success", label: "Strong Potential Match" },
  potential: { ring: "stroke-status-warning", text: "text-status-warning", label: "Potential Match" },
  lower: { ring: "stroke-brand-muted", text: "text-brand-muted", label: "Lower Match — Review" },
};

interface MatchRingProps {
  tier: Exclude<MatchTier, "excluded">;
  score: number;
  size?: number;
}

/** Circular match-score ring. Deliberately capped visual weight (a ring,
 * not a giant dominant number) so it reads as "compatibility indicator"
 * rather than an implied precise scientific probability. */
export function MatchRing({ tier, score, size = 64 }: MatchRingProps) {
  const style = TIER_STYLES[tier];
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} className="stroke-brand-border/10" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${style.ring} transition-[stroke-dashoffset] duration-500 ease-out`}
          fill="none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-heading text-sm font-bold ${style.text}`}>{Math.round(score)}%</span>
      </div>
    </div>
  );
}

interface MatchBadgeProps {
  tier: Exclude<MatchTier, "excluded">;
  label: string;
  score: number;
}

/** Compact horizontal badge (ring + label) used on result cards. */
export function MatchBadge({ tier, label, score }: MatchBadgeProps) {
  const style = TIER_STYLES[tier];
  return (
    <div className="flex items-center gap-3">
      <MatchRing tier={tier} score={score} size={52} />
      <span className={`text-sm font-semibold ${style.text}`}>{label}</span>
    </div>
  );
}

export function ConfirmationRequiredNote() {
  return <p className="mt-1 text-xs font-medium text-status-warning">Potential Match — Confirmation Required</p>;
}

export function MatchScoreDisclaimer() {
  return (
    <p className="text-xs leading-relaxed text-brand-muted">
      Match score reflects compatibility with the FutureGrad matching criteria, not official scholarship eligibility.
    </p>
  );
}
