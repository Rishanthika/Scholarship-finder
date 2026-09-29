// ============================================================================
// Enums — standardized internal values (Phase 4 of the spec).
// Free text is never compared directly in matching logic; everything is
// normalized to one of these values at the data layer.
// ============================================================================

export type DegreeLevel =
  | "undergraduate"
  | "masters"
  | "phd"
  | "postdoctoral"
  | "research"
  | "multiple";

export type VerificationStatus = "GREEN" | "AMBER" | "RED";

export type FundingType =
  | "fully_funded"
  | "full_tuition"
  | "partial_tuition"
  | "tuition_waiver"
  | "stipend"
  | "merit"
  | "need_based"
  | "research_funding"
  | "mixed";

export type IndianEligibility = "yes" | "no" | "conditional";

export type EnglishTest = "IELTS" | "TOEFL" | "PTE" | "Duolingo" | "not_taken" | "exempt";

export type WorkExperienceBand = "none" | "lt_1" | "1_2" | "3_5" | "5_plus";

export type AcademicField =
  | "engineering"
  | "computer_science_technology"
  | "business"
  | "finance"
  | "economics"
  | "management"
  | "medicine"
  | "public_health"
  | "law"
  | "humanities"
  | "social_sciences"
  | "arts"
  | "design"
  | "education"
  | "international_relations"
  | "natural_sciences"
  | "life_sciences"
  | "mathematics"
  | "physics"
  | "chemistry"
  | "other";

export type EngineeringDomain =
  | "computer_science"
  | "software_engineering"
  | "ai_ml"
  | "data_science"
  | "information_technology"
  | "cybersecurity"
  | "information_systems"
  | "robotics"
  | "mechanical"
  | "civil"
  | "electrical"
  | "electronics_communication"
  | "mechatronics"
  | "chemical"
  | "industrial"
  | "manufacturing"
  | "automotive"
  | "aerospace"
  | "biomedical"
  | "environmental"
  | "materials"
  | "petroleum"
  | "mining"
  | "telecommunications"
  | "energy_renewable";

export type FundingPreference = "fully_funded_only" | "full_tuition_ok" | "partial_ok" | "any";

export type CountryFilterMode = "no_preference" | "preferred" | "only_these";

// ============================================================================
// Database records (mirrors the Airtable schema in Phase 3 of the spec).
// Any field can legitimately be `null` — the seed data uses null exactly
// where the master database says "Not specified by official source",
// and the matching engine's missing-data policy treats null accordingly.
// It is NEVER acceptable for a field to be silently invented — see
// src/lib/matchingEngine.ts's neutral-scoring rules.
// ============================================================================

export interface University {
  id: string;
  university_name: string;
  country: string;
  city: string | null;
  qs_2026: number | null;
  the_2026: number | null;
  official_url: string | null;
  partner_status: "FutureGrad Partner" | "Informational Only" | null;
  last_verified_date: string | null;

  // Same rationale as Scholarship above — optional, admin-only, not read
  // by the matching engine.
  created_at?: string;
  updated_at?: string;
  archived_at?: string | null;
}

export interface Scholarship {
  id: string;
  scholarship_name: string;
  provider: string;
  university_id: string | null; // null for government / non-university-specific scholarships
  country: string;
  degree_level: DegreeLevel[]; // most records are single-value; some (e.g. DAAD EPOS) list two
  academic_fields: AcademicField[] | "all"; // "all" = no field restriction published
  excluded_academic_fields: AcademicField[]; // e.g. Trinity excludes engineering/CS/business
  engineering_domains: EngineeringDomain[] | "all" | null; // null = not engineering-relevant at all
  nationality_eligibility: IndianEligibility;
  excluded_nationalities: string[]; // e.g. ["China"] for Trinity Global Excellence
  minimum_gpa: number | null;
  minimum_percentage: number | null;
  english_requirement: string | null; // e.g. "IELTS 6.5" — null = not specified
  standardized_test_requirement: string | null;
  work_experience_required_years: number | null; // null = not mandatory
  work_experience_preferred: boolean;
  research_experience_required: boolean;
  research_experience_preferred: boolean;
  funding_type: FundingType;
  tuition_coverage: string | null; // display string, e.g. "100%", "£5,000", null = unspecified
  living_support: string | null;
  other_benefits: string | null;
  deadline: string | null; // ISO date string, or null if unconfirmed
  deadline_confirmed: boolean; // false = "Next cycle not yet confirmed"
  application_opening_date: string | null;
  intake: string | null;
  official_scholarship_url: string | null;
  official_university_url: string | null;
  verification_status: VerificationStatus;
  verification_notes: string | null; // shown verbatim as the AMBER caveat
  last_verified_date: string;
  qs_2026: number | null; // denormalized copy for display convenience (see README)
  the_2026: number | null;
  student_facing_description: string;

  // Added for the admin dashboard phase — optional because the existing
  // seed JSON files (used as the matching engine's fallback data source)
  // predate these fields and were never required to carry them. The real
  // Supabase columns (migration 0001 for created_at/updated_at, 0002 for
  // archived_at) always populate created_at/updated_at; archived_at is
  // null until an admin archives the record. None of these three fields
  // are read by the matching engine — they exist purely for admin
  // display/sorting (e.g. "Recently Updated", soft-delete via archiving).
  created_at?: string;
  updated_at?: string;
  archived_at?: string | null;
}

// ============================================================================
// Student profile — exact field names carried over from the finalized
// matching-engine specification (Phase 7 of the build brief).
// ============================================================================

export interface StudentProfile {
  nationality: string; // "India" | free text for "Other"
  currentEducationLevel: "high_school" | "bachelors" | "masters";
  degreeLevel: DegreeLevel;
  intake: string; // e.g. "2027" or "not_sure"
  intendedField: AcademicField;
  engineeringDomains: EngineeringDomain[]; // empty if intendedField isn't engineering/CS
  gradingSystem: "percentage" | "cgpa_10" | "gpa_4" | "uk_honours" | "other";
  academicScore: number | null;
  englishTest: EnglishTest;
  englishScore: number | null;
  standardizedTests: string[]; // e.g. ["GRE"]
  workExperience: WorkExperienceBand;
  hasResearchExperience: boolean;
  preferredCountries: string[]; // empty array = no preference
  countryFilterMode: CountryFilterMode;
  fundingPreference: FundingPreference;
}

// ============================================================================
// Matching output
// ============================================================================

export interface MatchExplanationLine {
  type: "pass" | "warning";
  text: string;
}

export interface MatchExplanation {
  lines: MatchExplanationLine[];
}

export interface ScoreBreakdown {
  degreeLevel: number; // /20
  nationality: number; // /20
  domainField: number; // /20
  funding: number; // /15
  academicPerformance: number; // /10
  englishTest: number; // /5
  experience: number; // /5
  countryPreference: number; // /5
  amberDeduction: number; // 0 or -10
  total: number; // 0-100 (floored at 0, never negative in the displayed score)
}

export type MatchTier = "strong" | "potential" | "lower" | "excluded";

export interface MatchResult {
  scholarship: Scholarship;
  university: University | null;
  score: ScoreBreakdown;
  tier: MatchTier;
  label: string; // "Strong Potential Match" | "Potential Match" | "Lower Match — Review"
  confirmationRequired: boolean; // true for AMBER
  explanation: MatchExplanation;
}

export interface MatchApiResponse {
  results: MatchResult[];
  totalCandidates: number; // count that survived hard filters, before threshold cutoff
  greenCount: number;
  amberCount: number;
}

// ============================================================================
// Lead/contact info — collected on the Welcome screen (the first screen,
// before the 6-step assessment), kept entirely separate from
// StudentProfile. This is deliberate: the matching engine
// (matchingEngine.ts) and the /api/match contract only ever see the
// StudentProfile fields relevant to scoring. Name/phone/email are never
// sent to /api/match and never influence score, ranking, GREEN/AMBER/RED,
// or any eligibility logic.
// ============================================================================

export interface LeadInfo {
  name: string;
  phone: string;
  email: string;
}

