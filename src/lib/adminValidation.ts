import type { Scholarship, DegreeLevel, VerificationStatus, FundingType, University } from "@/types";

export interface ScholarshipValidationErrors {
  scholarship_name?: string;
  university_id?: string;
  country?: string;
  degree_level?: string;
  verification_status?: string;
  official_scholarship_url?: string;
  official_university_url?: string;
  deadline?: string;
  application_opening_date?: string;
  funding_type?: string;
  tuition_coverage?: string;
  statusChange?: string; // set when a verification_status transition needs confirmation
}

const DEGREE_LEVELS: DegreeLevel[] = ["undergraduate", "masters", "phd", "postdoctoral", "research", "multiple"];
const VERIFICATION_STATUSES: VerificationStatus[] = ["GREEN", "AMBER", "RED"];
const FUNDING_TYPES: FundingType[] = [
  "fully_funded", "full_tuition", "partial_tuition", "tuition_waiver",
  "stipend", "merit", "need_based", "research_funding", "mixed",
];

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(value).getTime());
}

/**
 * Best-effort heuristic for Rule 9 ("do not allow a scholarship marked as
 * fully funded to contain contradictory partial-funding data"). Since
 * `tuition_coverage` is a free-text display string (by original design —
 * see the schema's own comments on why it isn't a structured field), this
 * cannot be a perfect check. It catches the clearest contradictions
 * (an explicit sub-100% figure, or the word "partial") without trying to
 * parse arbitrary prose.
 */
function fundingContradicts(fundingType: FundingType | undefined, tuitionCoverage: string | null | undefined): string | null {
  if (!fundingType || !tuitionCoverage) return null;
  const isFullyFundedClaim = fundingType === "fully_funded" || fundingType === "full_tuition";
  if (!isFullyFundedClaim) return null;

  const lower = tuitionCoverage.toLowerCase();
  if (lower.includes("partial")) {
    return `Funding type is "${fundingType}" but Tuition Coverage says "partial" — these contradict each other.`;
  }
  const percentMatch = lower.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch && Number(percentMatch[1]) < 100) {
    return `Funding type is "${fundingType}" but Tuition Coverage states ${percentMatch[1]}%, not 100% — these contradict each other.`;
  }
  return null;
}

export interface ScholarshipValidationInput extends Partial<Scholarship> {
  /** Must be explicitly true when verification_status is being changed
   * on an existing record — enforced server-side, not just a UI nicety.
   * Not required when creating a brand-new record (there's no prior
   * status to accidentally overwrite). */
  statusChangeConfirmed?: boolean;
}

export function validateScholarship(
  input: ScholarshipValidationInput,
  options: { isUpdate: boolean; existingStatus?: VerificationStatus; knownUniversityIds: string[] }
): ScholarshipValidationErrors {
  const errors: ScholarshipValidationErrors = {};

  // Rule 1: name required.
  if (!input.scholarship_name || !input.scholarship_name.trim()) {
    errors.scholarship_name = "Scholarship name is required.";
  }

  // Rule 2: university, if given, must reference an existing university.
  if (input.university_id && !options.knownUniversityIds.includes(input.university_id)) {
    errors.university_id = `University "${input.university_id}" does not exist. Create the university first.`;
  }

  // Rule 3: country required.
  if (!input.country || !input.country.trim()) {
    errors.country = "Country is required.";
  }

  // Rule 4: degree level must use allowed enum values.
  if (input.degree_level) {
    const invalid = input.degree_level.filter((d) => !DEGREE_LEVELS.includes(d));
    if (invalid.length > 0 || input.degree_level.length === 0) {
      errors.degree_level = `Degree level must be one or more of: ${DEGREE_LEVELS.join(", ")}.`;
    }
  } else {
    errors.degree_level = "At least one degree level is required.";
  }

  // Rule 5: verification status must be GREEN/AMBER/RED.
  if (!input.verification_status || !VERIFICATION_STATUSES.includes(input.verification_status)) {
    errors.verification_status = "Verification status must be GREEN, AMBER, or RED.";
  }

  // Rule 6: URLs must be valid when provided.
  if (input.official_scholarship_url && !isValidUrl(input.official_scholarship_url)) {
    errors.official_scholarship_url = "Official scholarship URL must be a valid http(s) URL.";
  }
  if (input.official_university_url && !isValidUrl(input.official_university_url)) {
    errors.official_university_url = "Official university URL must be a valid http(s) URL.";
  }

  // Rule 7: dates must be valid when provided.
  if (input.deadline && !isValidIsoDate(input.deadline)) {
    errors.deadline = "Deadline must be a valid date (YYYY-MM-DD).";
  }

  // Rule 8/9: funding type must be a known value, and must not
  // contradict the tuition coverage text.
  if (input.funding_type && !FUNDING_TYPES.includes(input.funding_type)) {
    errors.funding_type = `Funding type must be one of: ${FUNDING_TYPES.join(", ")}.`;
  }
  const contradiction = fundingContradicts(input.funding_type, input.tuition_coverage);
  if (contradiction) {
    errors.tuition_coverage = contradiction;
  }

  // Rule 10: accidental RED/status-change publication. On update, ANY
  // verification_status transition requires explicit confirmation from
  // the caller (the UI is expected to show a confirmation modal and set
  // this flag only after the user confirms — see admin brief's Audit /
  // Data Safety section, which asks for confirmation on every one of the
  // 5 named transitions, not just RED-related ones).
  if (
    options.isUpdate &&
    options.existingStatus &&
    input.verification_status &&
    input.verification_status !== options.existingStatus &&
    !input.statusChangeConfirmed
  ) {
    errors.statusChange = `Changing verification status from ${options.existingStatus} to ${input.verification_status} requires explicit confirmation.`;
  }

  return errors;
}

export function isScholarshipValid(errors: ScholarshipValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}

/**
 * Default verification status for a brand-new scholarship. Per the admin
 * brief: never auto-GREEN — a new record has not yet been reviewed by a
 * human against an authoritative source, so AMBER (not GREEN) is the
 * honest default. GREEN is something an admin explicitly opts into.
 */
export const DEFAULT_NEW_SCHOLARSHIP_STATUS: VerificationStatus = "AMBER";

// ---------------------------------------------------------------------------
// University validation — smaller surface, same principles.
// ---------------------------------------------------------------------------

export interface UniversityValidationErrors {
  university_name?: string;
  country?: string;
  official_url?: string;
}

export function validateUniversity(input: Partial<University>): UniversityValidationErrors {
  const errors: UniversityValidationErrors = {};
  if (!input.university_name || !input.university_name.trim()) {
    errors.university_name = "University name is required.";
  }
  if (!input.country || !input.country.trim()) {
    errors.country = "Country is required.";
  }
  if (input.official_url && !isValidUrl(input.official_url)) {
    errors.official_url = "Official URL must be a valid http(s) URL.";
  }
  return errors;
}

export function isUniversityValid(errors: UniversityValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}
