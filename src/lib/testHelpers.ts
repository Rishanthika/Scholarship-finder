import { expect } from "vitest";
import scholarshipsSeed from "@/data/scholarships.seed.json";
import universitiesSeed from "@/data/universities.seed.json";
import type { MatchResult, Scholarship, StudentProfile, University } from "@/types";

export const scholarships = scholarshipsSeed as Scholarship[];
export const universities = universitiesSeed as University[];

export const RED_IDS = scholarships.filter((s) => s.verification_status === "RED").map((s) => s.id);

/**
 * Default profile used as a baseline across the profile/edge-case suites.
 * Every test overrides only the fields relevant to what it's checking —
 * this keeps each test's intent readable (what changed vs. the baseline
 * is what the test is actually about).
 */
export function baseProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    nationality: "India",
    currentEducationLevel: "bachelors",
    degreeLevel: "masters",
    intake: "2027",
    intendedField: "business",
    engineeringDomains: [],
    gradingSystem: "cgpa_10",
    academicScore: 8.0,
    englishTest: "IELTS",
    englishScore: 7,
    standardizedTests: [],
    workExperience: "1_2",
    hasResearchExperience: false,
    preferredCountries: [],
    countryFilterMode: "no_preference",
    fundingPreference: "any",
    ...overrides,
  };
}

/**
 * Reusable regression assertion (spec Phase 5's requested
 * `assertNoRedResults()` helper) — fails loudly if any RED-status
 * scholarship appears anywhere in a result set, regardless of how well
 * it would otherwise score.
 */
export function assertNoRedResults(results: MatchResult[]) {
  const leaked = results.filter((r) => r.scholarship.verification_status === "RED");
  expect(leaked, `RED scholarships must never appear in results, but found: ${leaked.map((r) => r.scholarship.id).join(", ")}`).toHaveLength(0);
  for (const redId of RED_IDS) {
    expect(results.find((r) => r.scholarship.id === redId), `RED record ${redId} must never appear`).toBeUndefined();
  }
}

export function findResult(results: MatchResult[], id: string): MatchResult | undefined {
  return results.find((r) => r.scholarship.id === id);
}
