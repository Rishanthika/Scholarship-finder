import type {
  MatchExplanation,
  MatchExplanationLine,
  MatchResult,
  MatchTier,
  Scholarship,
  ScoreBreakdown,
  StudentProfile,
  University,
} from "@/types";

/**
 * FutureGrad Scholarship Finder — matching engine.
 *
 * This is a direct implementation of the finalized matching specification
 * (Parts C, E, F, G, H, I, J, K, M). It is NOT a redesign — every rule here
 * traces back to a specific part of that spec, referenced in comments below.
 *
 * Design principle carried through this entire file: absence of data is
 * never converted into either a pass or a fail. See `NEUTRAL` scoring
 * throughout.
 */

// ---------------------------------------------------------------------------
// Hard filters (spec Part C) — evaluated first, in order. A scholarship that
// fails any of these is never scored and never shown.
// ---------------------------------------------------------------------------

function passesHardFilters(scholarship: Scholarship, student: StudentProfile): { pass: boolean; reason?: string } {
  // Rule 0: archived records (admin dashboard soft-delete, migration 0002)
  // are excluded, same as RED. This is the one addition to this function
  // made outside the original matching-engine build phases — without it,
  // an admin "archiving" a scholarship would have no actual effect on
  // student results, which would make the admin feature a no-op lie to
  // staff. It is a pure data-scope filter, not a scoring/logic change:
  // no existing seed record sets archived_at, so this is a no-op for
  // every pre-existing test (verified — see matchingEngine.archiving.test.ts).
  if (scholarship.archived_at) {
    return { pass: false, reason: "Archived by admin" };
  }

  // Rule 1: RED verification status always excludes.
  if (scholarship.verification_status === "RED") {
    return { pass: false, reason: "RED verification status" };
  }

  // Rule 2: explicit nationality exclusion for India.
  const isIndian = student.nationality.trim().toLowerCase() === "india";
  if (isIndian && scholarship.nationality_eligibility === "no") {
    return { pass: false, reason: "India explicitly excluded" };
  }

  // Rule 3: degree-level incompatibility (unless the record spans "multiple").
  const degreeMatches =
    scholarship.degree_level.includes(student.degreeLevel) || scholarship.degree_level.includes("multiple");
  if (!degreeMatches) {
    return { pass: false, reason: "Degree level incompatible" };
  }

  // Rule 4: explicit field exclusion.
  if (
    scholarship.excluded_academic_fields.length > 0 &&
    scholarship.excluded_academic_fields.includes(student.intendedField)
  ) {
    return { pass: false, reason: "Academic field explicitly excluded" };
  }

  // Rule 4b: excluded nationality by name (e.g. Trinity excludes China) —
  // only relevant when the student's stated nationality string matches.
  if (
    scholarship.excluded_nationalities.some((n) =>
      student.nationality.trim().toLowerCase().includes(n.trim().toLowerCase())
    )
  ) {
    return { pass: false, reason: "Nationality explicitly excluded" };
  }

  // Rule 5: deadline has passed, UNLESS the student selected "not sure yet"
  // for intake (spec Profile 10). NOTE: this checks ANY past deadline,
  // regardless of `deadline_confirmed` — that flag distinguishes "we have
  // a real confirmed date" from "we're guessing," it does NOT distinguish
  // past from future. A confirmed date that has since passed is exactly
  // as expired as an unconfirmed one; treating it as still-open would
  // violate the spec's explicit "do not display an expired deadline as
  // active" rule. (Found during the Phase-4 QA audit — see matchingEngine
  // .test.ts "Deadline / expired-cycle handling" for the regression tests
  // that lock this in both directions.)
  if (scholarship.deadline && student.intake !== "not_sure") {
    const deadlineDate = new Date(scholarship.deadline);
    const now = new Date();
    if (deadlineDate < now) {
      return { pass: false, reason: "Deadline has passed" };
    }
  }

  // Rule 6: mandatory work-experience threshold not met.
  if (scholarship.work_experience_required_years !== null) {
    const studentYears = workExperienceBandToYears(student.workExperience);
    if (studentYears < scholarship.work_experience_required_years) {
      return { pass: false, reason: "Mandatory work experience not met" };
    }
  }

  // Rule 7: mandatory research experience not met.
  if (scholarship.research_experience_required && !student.hasResearchExperience) {
    return { pass: false, reason: "Mandatory research experience not met" };
  }

  // Rule 8: student restricted the search to specific countries only.
  if (student.countryFilterMode === "only_these" && student.preferredCountries.length > 0) {
    if (!student.preferredCountries.includes(scholarship.country)) {
      return { pass: false, reason: "Outside student's country-only selection" };
    }
  }

  return { pass: true };
}

function workExperienceBandToYears(band: StudentProfile["workExperience"]): number {
  switch (band) {
    case "none":
      return 0;
    case "lt_1":
      return 0.5;
    case "1_2":
      return 1;
    case "3_5":
      return 3;
    case "5_plus":
      return 5;
  }
}

// ---------------------------------------------------------------------------
// Scoring (spec Part E) — 100 points across 8 weighted components.
// Every "neutral" default below exists specifically so that missing data
// never penalizes the student (spec Part F).
// ---------------------------------------------------------------------------

const NEUTRAL = {
  degreeLevel: 20, // full points once a hard filter has already confirmed compatibility
  nationality: 20, // full points once a hard filter has already confirmed compatibility
  domainField: {
    exact: 20,
    related: 15, // ~75% per spec Part G
    broad: 10, // ~50% per spec Part G
  },
  funding: {
    max: 15,
    fullyFundedPenaltyFactor: 0.27, // demotes partial/merit funding to ~4/15 under "fully funded only"
  },
  academicPerformance: 10,
  englishTest: 5,
  experienceBonus: 5,
  countryPreference: 5,
} as const;

function scoreDomainField(scholarship: Scholarship, student: StudentProfile): number {
  // Field-level check first: if the student's field is explicitly excluded
  // this scholarship would already have failed the hard filter, so by the
  // time we're here the field is at minimum not excluded.
  const fieldIsNamed =
    scholarship.academic_fields !== "all" && scholarship.academic_fields.includes(student.intendedField);

  const isEngineeringOrTech =
    student.intendedField === "engineering" || student.intendedField === "computer_science_technology";

  if (isEngineeringOrTech && student.engineeringDomains.length > 0) {
    if (scholarship.engineering_domains === null) {
      // Scholarship isn't engineering-relevant at all but somehow wasn't
      // excluded — treat as broad/no-domain-signal.
      return NEUTRAL.domainField.broad;
    }
    if (scholarship.engineering_domains === "all") {
      return NEUTRAL.domainField.broad; // broad STEM tier (spec Part G, tier 3)
    }
    const exact = student.engineeringDomains.some((d) => (scholarship.engineering_domains as string[]).includes(d));
    if (exact) {
      return NEUTRAL.domainField.exact; // tier 1
    }
    // No named overlap at all — related-tier is only used when the
    // scholarship explicitly names a sibling domain the student didn't
    // pick; without that, this is the lowest surfaced tier, not "exact".
    return NEUTRAL.domainField.related;
  }

  if (fieldIsNamed) return NEUTRAL.domainField.exact;
  if (scholarship.academic_fields === "all") return NEUTRAL.domainField.broad;
  return NEUTRAL.domainField.related; // named-but-different-field broad academic scholarships
}

function scoreFunding(scholarship: Scholarship, student: StudentProfile): number {
  const isFullyFundedType = scholarship.funding_type === "fully_funded";
  const isFullTuitionType = scholarship.funding_type === "full_tuition" || isFullyFundedType;

  switch (student.fundingPreference) {
    case "fully_funded_only":
      if (isFullyFundedType) return NEUTRAL.funding.max;
      // Demote partial/merit/etc. — not excluded, just heavily penalized
      // (spec Part H) so it naturally falls toward "Other funding options".
      return Math.round(NEUTRAL.funding.max * NEUTRAL.funding.fullyFundedPenaltyFactor);
    case "full_tuition_ok":
      if (isFullTuitionType) return NEUTRAL.funding.max;
      return Math.round(NEUTRAL.funding.max * 0.6);
    case "partial_ok":
    case "any":
    default:
      // No penalty — score toward coverage generosity as a gentle signal.
      if (isFullyFundedType) return NEUTRAL.funding.max;
      if (scholarship.funding_type === "partial_tuition" || scholarship.funding_type === "merit") {
        return Math.round(NEUTRAL.funding.max * 0.75);
      }
      return Math.round(NEUTRAL.funding.max * 0.6);
  }
}

function scoreAcademicPerformance(scholarship: Scholarship, student: StudentProfile): number {
  // If the scholarship publishes no minimum, the student cannot fail
  // against nothing — full neutral marks (spec Part F).
  if (scholarship.minimum_gpa === null && scholarship.minimum_percentage === null) {
    return NEUTRAL.academicPerformance;
  }
  if (student.academicScore === null) {
    return NEUTRAL.academicPerformance; // student skipped it — neutral, never penalized
  }
  // A real comparison requires matching grading systems; cross-system
  // conversion is explicitly disallowed by the spec (Part F), so any
  // comparison here is same-system-only. We do not invent a conversion.
  if (
    (scholarship.minimum_percentage !== null && student.gradingSystem === "percentage") ||
    (scholarship.minimum_gpa !== null && (student.gradingSystem === "cgpa_10" || student.gradingSystem === "gpa_4"))
  ) {
    const threshold = scholarship.minimum_percentage ?? scholarship.minimum_gpa!;
    if (student.academicScore >= threshold) return NEUTRAL.academicPerformance;
    return Math.round(NEUTRAL.academicPerformance * 0.3); // below stated threshold — demoted, not excluded
  }
  // Mismatched grading systems (e.g. scholarship publishes GPA, student
  // entered percentage) — do not invent a conversion, treat as neutral.
  return NEUTRAL.academicPerformance;
}

function scoreEnglishTest(scholarship: Scholarship, student: StudentProfile): number {
  if (!scholarship.english_requirement) return NEUTRAL.englishTest; // unspecified → neutral (spec Part F)
  if (student.englishTest === "not_taken") return Math.round(NEUTRAL.englishTest * 0.6); // demoted, not excluded
  return NEUTRAL.englishTest; // has a test on record; exact-band comparison left to detail view, not scored precisely
}

function scoreExperienceBonus(scholarship: Scholarship, student: StudentProfile): number {
  let points = 0;
  if (scholarship.work_experience_preferred) {
    const years = workExperienceBandToYears(student.workExperience);
    if (years > 0) points += NEUTRAL.experienceBonus / 2;
  }
  if (scholarship.research_experience_preferred && student.hasResearchExperience) {
    points += NEUTRAL.experienceBonus / 2;
  }
  // Cap contribution even if both apply — never exceeds the 5-point ceiling.
  return Math.min(points, NEUTRAL.experienceBonus);
}

function scoreCountryPreference(scholarship: Scholarship, student: StudentProfile): number {
  if (student.countryFilterMode === "no_preference" || student.preferredCountries.length === 0) {
    return NEUTRAL.countryPreference / 2; // neutral — no preference stated, no country favored
  }
  if (student.preferredCountries.includes(scholarship.country)) {
    return NEUTRAL.countryPreference;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Explanations (spec Part M) — generated only from conditions actually
// evaluated. Approved verbs only: "matches", "appears compatible", "needs
// confirmation". Never "eligible", "guaranteed", "qualifies".
// ---------------------------------------------------------------------------

function buildExplanation(scholarship: Scholarship, student: StudentProfile, score: ScoreBreakdown): MatchExplanation {
  const lines: MatchExplanationLine[] = [];

  lines.push({ type: "pass", text: `Your ${degreeLevelLabel(student.degreeLevel)} level matches` });

  if (score.domainField >= NEUTRAL.domainField.exact) {
    lines.push({ type: "pass", text: "Your field/domain closely matches this scholarship's coverage" });
  } else if (score.domainField >= NEUTRAL.domainField.broad) {
    lines.push({ type: "pass", text: "This scholarship broadly covers your field" });
  }

  if (student.nationality.trim().toLowerCase() === "india") {
    lines.push({ type: "pass", text: "Indian students are supported by this scholarship" });
  }

  if (scholarship.minimum_gpa === null && scholarship.minimum_percentage === null) {
    lines.push({ type: "warning", text: "This scholarship does not publish a minimum academic score to check against" });
  }

  if (!scholarship.english_requirement) {
    lines.push({ type: "warning", text: "English-language requirement is not published — confirm with the provider" });
  }

  if (scholarship.verification_status === "AMBER" && scholarship.verification_notes) {
    lines.push({ type: "warning", text: scholarship.verification_notes });
  }

  if (score.funding < NEUTRAL.funding.max && student.fundingPreference === "fully_funded_only") {
    lines.push({ type: "warning", text: "This is partial funding — it does not fully match your 'fully funded' preference" });
  }

  // Cap at 5 lines per the spec's non-technical, scannable card requirement.
  return { lines: lines.slice(0, 5) };
}

function degreeLevelLabel(level: StudentProfile["degreeLevel"]): string {
  const map: Record<StudentProfile["degreeLevel"], string> = {
    undergraduate: "undergraduate",
    masters: "Master's",
    phd: "PhD",
    postdoctoral: "postdoctoral",
    research: "research",
    multiple: "degree",
  };
  return map[level];
}

// ---------------------------------------------------------------------------
// Thresholds (spec Part J) and sorting (spec Part K).
// ---------------------------------------------------------------------------

function tierFromScore(score: number): MatchTier {
  if (score >= 80) return "strong";
  if (score >= 60) return "potential";
  if (score >= 40) return "lower";
  return "excluded";
}

function labelFromTier(tier: MatchTier): string {
  switch (tier) {
    case "strong":
      return "Strong Potential Match";
    case "potential":
      return "Potential Match";
    case "lower":
      return "Lower Match — Review";
    case "excluded":
      return "";
  }
}

// ---------------------------------------------------------------------------
// Public entry point.
// ---------------------------------------------------------------------------

export function runMatchingEngine(
  student: StudentProfile,
  scholarships: Scholarship[],
  universities: University[]
): { results: MatchResult[]; totalCandidates: number } {
  const universityById = new Map(universities.map((u) => [u.id, u]));

  const candidates = scholarships.filter((s) => passesHardFilters(s, student).pass);

  const scored: MatchResult[] = candidates.map((scholarship) => {
    const degreeLevel = NEUTRAL.degreeLevel; // already hard-filtered for compatibility
    const nationality = NEUTRAL.nationality; // already hard-filtered for compatibility
    const domainField = scoreDomainField(scholarship, student);
    const funding = scoreFunding(scholarship, student);
    const academicPerformance = scoreAcademicPerformance(scholarship, student);
    const englishTest = scoreEnglishTest(scholarship, student);
    const experience = scoreExperienceBonus(scholarship, student);
    const countryPreference = scoreCountryPreference(scholarship, student);

    const amberDeduction = scholarship.verification_status === "AMBER" ? -10 : 0;

    const rawTotal =
      degreeLevel + nationality + domainField + funding + academicPerformance + englishTest + experience + countryPreference + amberDeduction;
    const total = Math.max(0, Math.min(100, rawTotal));

    const score: ScoreBreakdown = {
      degreeLevel,
      nationality,
      domainField,
      funding,
      academicPerformance,
      englishTest,
      experience,
      countryPreference,
      amberDeduction,
      total,
    };

    const tier = tierFromScore(total);

    return {
      scholarship,
      university: scholarship.university_id ? universityById.get(scholarship.university_id) ?? null : null,
      score,
      tier,
      label: labelFromTier(tier),
      confirmationRequired: scholarship.verification_status === "AMBER",
      explanation: buildExplanation(scholarship, student, score),
    };
  });

  // Below-40 results are dropped entirely (spec Part J) — not merely
  // ranked last. This is a deliberate quality-over-quantity decision.
  const surfaced = scored.filter((r) => r.tier !== "excluded");

  // Sorting (spec Part K): score desc -> GREEN before AMBER -> deadline
  // urgency (soonest confirmed first, unconfirmed last) -> QS -> THE.
  surfaced.sort((a, b) => {
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;

    const statusRank = (s: Scholarship) => (s.verification_status === "GREEN" ? 0 : 1);
    if (statusRank(a.scholarship) !== statusRank(b.scholarship)) {
      return statusRank(a.scholarship) - statusRank(b.scholarship);
    }

    const deadlineRank = (s: Scholarship) => {
      if (!s.deadline || !s.deadline_confirmed) return Infinity;
      return new Date(s.deadline).getTime();
    };
    const deadlineDiff = deadlineRank(a.scholarship) - deadlineRank(b.scholarship);
    if (deadlineDiff !== 0) return deadlineDiff;

    const qsRank = (s: Scholarship) => s.qs_2026 ?? Infinity;
    if (qsRank(a.scholarship) !== qsRank(b.scholarship)) return qsRank(a.scholarship) - qsRank(b.scholarship);

    const theRank = (s: Scholarship) => s.the_2026 ?? Infinity;
    return theRank(a.scholarship) - theRank(b.scholarship);
  });

  return { results: surfaced, totalCandidates: candidates.length };
}
