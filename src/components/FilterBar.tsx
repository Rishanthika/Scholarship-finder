import type { FundingType, DegreeLevel } from "@/types";
import { SlidersHorizontal } from "lucide-react";

export type SortOption = "best_match" | "deadline" | "qs_rank" | "the_rank";

interface FilterBarProps {
  hideAmber: boolean;
  onToggleHideAmber: (v: boolean) => void;
  sort: SortOption;
  onSortChange: (v: SortOption) => void;
  countries: string[];
  selectedCountry: string;
  onCountryChange: (v: string) => void;
  fundingTypes: FundingType[];
  selectedFunding: string;
  onFundingChange: (v: string) => void;
  degreeLevels: DegreeLevel[];
  selectedDegree: string;
  onDegreeChange: (v: string) => void;
  resultCount: number;
}

const FUNDING_LABELS: Record<FundingType, string> = {
  fully_funded: "Fully Funded",
  full_tuition: "Full Tuition",
  partial_tuition: "Partial Tuition",
  tuition_waiver: "Tuition Waiver",
  stipend: "Stipend",
  merit: "Merit",
  need_based: "Need-Based",
  research_funding: "Research Funding",
  mixed: "Mixed",
};

const DEGREE_LABELS: Record<DegreeLevel, string> = {
  undergraduate: "Undergraduate",
  masters: "Master's",
  phd: "PhD",
  postdoctoral: "Postdoctoral",
  research: "Research",
  multiple: "Multiple",
};

function ChipSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-full border border-brand-border/15 bg-white py-2 pl-3.5 pr-8 text-xs font-medium text-brand-ink transition hover:border-brand-primary/30 focus:border-brand-primary focus:outline-none"
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-brand-muted">▾</span>
    </div>
  );
}

export function FilterBar({
  hideAmber,
  onToggleHideAmber,
  sort,
  onSortChange,
  countries,
  selectedCountry,
  onCountryChange,
  fundingTypes,
  selectedFunding,
  onFundingChange,
  degreeLevels,
  selectedDegree,
  onDegreeChange,
  resultCount,
}: FilterBarProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2.5">
      <SlidersHorizontal className="h-4 w-4 text-brand-muted" aria-hidden="true" />

      <ChipSelect label="Country" value={selectedCountry} onChange={onCountryChange}>
        <option value="">All Countries</option>
        {countries.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </ChipSelect>

      <ChipSelect label="Funding" value={selectedFunding} onChange={onFundingChange}>
        <option value="">Funding</option>
        {fundingTypes.map((f) => (
          <option key={f} value={f}>
            {FUNDING_LABELS[f]}
          </option>
        ))}
      </ChipSelect>

      <ChipSelect label="Degree" value={selectedDegree} onChange={onDegreeChange}>
        <option value="">Degree</option>
        {degreeLevels.map((d) => (
          <option key={d} value={d}>
            {DEGREE_LABELS[d]}
          </option>
        ))}
      </ChipSelect>

      <ChipSelect label="Sort by" value={sort} onChange={(v) => onSortChange(v as SortOption)}>
        <option value="best_match">Best Match</option>
        <option value="deadline">Soonest Deadline</option>
        <option value="qs_rank">QS Rank</option>
        <option value="the_rank">THE Rank</option>
      </ChipSelect>

      <label className="ml-1 flex items-center gap-1.5 text-xs font-medium text-brand-muted">
        <input
          type="checkbox"
          checked={hideAmber}
          onChange={(e) => onToggleHideAmber(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-brand-border/30 text-brand-primary focus:ring-brand-primary"
        />
        Verified only
      </label>

      <span className="ml-auto text-xs font-semibold text-brand-muted">
        {resultCount} match{resultCount === 1 ? "" : "es"}
      </span>
    </div>
  );
}
