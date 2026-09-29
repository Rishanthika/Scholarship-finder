import type { FundingType } from "@/types";
import { Wallet, Percent, Banknote, Award, HeartHandshake, FlaskConical, Layers } from "lucide-react";

const FUNDING_META: Record<FundingType, { label: string; icon: typeof Wallet; strong: boolean }> = {
  fully_funded: { label: "Fully Funded", icon: Wallet, strong: true },
  full_tuition: { label: "Full Tuition", icon: Wallet, strong: true },
  partial_tuition: { label: "Partial Tuition", icon: Percent, strong: false },
  tuition_waiver: { label: "Tuition Waiver", icon: Percent, strong: false },
  stipend: { label: "Stipend", icon: Banknote, strong: false },
  merit: { label: "Merit Scholarship", icon: Award, strong: false },
  need_based: { label: "Need-Based", icon: HeartHandshake, strong: false },
  research_funding: { label: "Research Funding", icon: FlaskConical, strong: false },
  mixed: { label: "Mixed Funding", icon: Layers, strong: false },
};

/** Fully-funded/full-tuition get the emerald "strong" treatment; every
 * other funding type gets a neutral navy-tinted pill — a partial award is
 * never allowed to visually read as equivalent to a fully-funded one. */
export function FundingBadge({ type }: { type: FundingType }) {
  const { label, icon: Icon, strong } = FUNDING_META[type];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
        strong ? "bg-status-successBg text-status-success" : "bg-brand-primary/5 text-brand-ink"
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
