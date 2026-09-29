"use client";

import { useMemo, useState } from "react";
import type { MatchApiResponse, DegreeLevel, FundingType, StudentProfile } from "@/types";
import { ScholarshipCard } from "./ScholarshipCard";
import { FilterBar, type SortOption } from "./FilterBar";
import { EmptyState } from "./EmptyState";
import { LeadCaptureCard } from "./LeadCaptureCard";
import { MatchScoreDisclaimer } from "./MatchBadge";
import { ACADEMIC_FIELD_OPTIONS, DEGREE_LEVEL_OPTIONS } from "@/lib/options";

interface ResultsScreenProps {
  response: MatchApiResponse;
  profile: StudentProfile;
  leadName: string;
  onSaveResults: () => void;
  onViewScholarship: (id: string) => void;
  onStartOver: () => void;
}

function profileSummaryText(profile: StudentProfile): string {
  const degree = DEGREE_LEVEL_OPTIONS.find((d) => d.value === profile.degreeLevel)?.label ?? profile.degreeLevel;
  const field = ACADEMIC_FIELD_OPTIONS.find((f) => f.value === profile.intendedField)?.label ?? profile.intendedField;
  return `${degree} \u2022 ${field} \u2022 ${profile.nationality}`;
}

export function ResultsScreen({ response, profile, leadName, onSaveResults, onViewScholarship, onStartOver }: ResultsScreenProps) {
  const [hideAmber, setHideAmber] = useState(false);
  const [sort, setSort] = useState<SortOption>("best_match");
  const [country, setCountry] = useState("");
  const [funding, setFunding] = useState("");
  const [degree, setDegree] = useState("");

  const availableCountries = useMemo(
    () => Array.from(new Set(response.results.map((r) => r.scholarship.country))).sort(),
    [response.results]
  );
  const availableFundingTypes = useMemo(
    () => Array.from(new Set(response.results.map((r) => r.scholarship.funding_type))) as FundingType[],
    [response.results]
  );
  const availableDegreeLevels = useMemo(
    () => Array.from(new Set(response.results.flatMap((r) => r.scholarship.degree_level))) as DegreeLevel[],
    [response.results]
  );
  const fullyFundedCount = useMemo(
    () => response.results.filter((r) => r.scholarship.funding_type === "fully_funded").length,
    [response.results]
  );

  const visibleResults = useMemo(() => {
    let results = response.results;
    if (hideAmber) results = results.filter((r) => r.scholarship.verification_status === "GREEN");
    if (country) results = results.filter((r) => r.scholarship.country === country);
    if (funding) results = results.filter((r) => r.scholarship.funding_type === funding);
    if (degree) results = results.filter((r) => r.scholarship.degree_level.includes(degree as DegreeLevel));

    const sorted = [...results];
    if (sort === "deadline") {
      sorted.sort((a, b) => {
        const da = a.scholarship.deadline_confirmed && a.scholarship.deadline ? new Date(a.scholarship.deadline).getTime() : Infinity;
        const db = b.scholarship.deadline_confirmed && b.scholarship.deadline ? new Date(b.scholarship.deadline).getTime() : Infinity;
        return da - db;
      });
    } else if (sort === "qs_rank") {
      sorted.sort((a, b) => (a.scholarship.qs_2026 ?? Infinity) - (b.scholarship.qs_2026 ?? Infinity));
    } else if (sort === "the_rank") {
      sorted.sort((a, b) => (a.scholarship.the_2026 ?? Infinity) - (b.scholarship.the_2026 ?? Infinity));
    }
    return sorted;
  }, [response.results, hideAmber, sort, country, funding, degree]);

  const hasAnyGreen = response.greenCount > 0;
  const hasAnyResults = response.results.length > 0;
  const isDefaultView = sort === "best_match" && !country && !funding && !degree && !hideAmber;

  return (
    <div className="min-h-[100dvh] bg-brand-background">
      <div className="mx-auto max-w-wide px-5 py-6 sm:px-8 sm:py-10">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">
          {leadName.trim() ? `Your Scholarship Matches, ${leadName.trim().split(" ")[0]}` : "Your Scholarship Matches"}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-brand-muted">
          Based on your profile, here are the strongest opportunities from our verified database.
        </p>

        {hasAnyResults && (
          <div className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-brand-border/10 bg-brand-border/10 sm:grid-cols-3">
            <div className="bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Your Profile</p>
              <p className="mt-1 text-sm font-semibold text-brand-ink">{profileSummaryText(profile)}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Matches</p>
              <p className="mt-1 text-sm font-semibold text-brand-ink">{response.results.length} opportunities</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Funding</p>
              <p className="mt-1 text-sm font-semibold text-brand-ink">{fullyFundedCount} fully funded</p>
            </div>
          </div>
        )}

        {!hasAnyResults && (
          <div className="mt-6">
            <EmptyState variant="no_matches" onContactFutureGrad={onStartOver} />
          </div>
        )}

        {hasAnyResults && !hasAnyGreen && (
          <div className="mt-6">
            <EmptyState variant="amber_only" onContactFutureGrad={onStartOver} />
          </div>
        )}

        {hasAnyResults && (
          <>
            <div className="mt-8">
              <h2 className="mb-4 font-heading text-lg font-bold text-brand-ink">Top Matches</h2>
              <FilterBar
                hideAmber={hideAmber}
                onToggleHideAmber={setHideAmber}
                sort={sort}
                onSortChange={setSort}
                countries={availableCountries}
                selectedCountry={country}
                onCountryChange={setCountry}
                fundingTypes={availableFundingTypes}
                selectedFunding={funding}
                onFundingChange={setFunding}
                degreeLevels={availableDegreeLevels}
                selectedDegree={degree}
                onDegreeChange={setDegree}
                resultCount={visibleResults.length}
              />
            </div>

            {visibleResults.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-brand-border/15 bg-white p-8 text-center text-sm text-brand-muted">
                No matches with the current filters. Try clearing one of them above.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {visibleResults.map((result, i) => (
                  <ScholarshipCard
                    key={result.scholarship.id}
                    result={result}
                    onView={onViewScholarship}
                    featured={isDefaultView && i === 0 && result.tier === "strong"}
                  />
                ))}
              </div>
            )}

            <div className="mt-4">
              <MatchScoreDisclaimer />
            </div>

            <div className="mt-6 max-w-xl">
              <LeadCaptureCard onSave={onSaveResults} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
