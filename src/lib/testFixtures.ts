import { expect } from "vitest";
import { runMatchingEngine } from "./matchingEngine";
import { baseProfile } from "./testHelpers";
import type { Scholarship } from "@/types";

/**
 * No current seed record sets `work_experience_preferred` or
 * `research_experience_preferred` to true (every record either makes
 * experience mandatory via `work_experience_required_years` /
 * `research_experience_required`, or says nothing about it at all).
 * That means the soft-bonus scoring branch in matchingEngine.ts
 * (scoreExperienceBonus) is currently untestable against real data —
 * this is itself a QA finding (see the Final QA Report), not a defect.
 *
 * This fixture verifies the scoring arithmetic directly with a minimal
 * synthetic record, so the branch has real test coverage even though the
 * live database doesn't currently exercise it.
 */
function syntheticScholarship(overrides: Partial<Scholarship> = {}): Scholarship {
  return {
    id: "TEST-SYNTHETIC-001",
    scholarship_name: "Synthetic Test Scholarship",
    provider: "Test Fixture",
    university_id: null,
    country: "United Kingdom",
    degree_level: ["masters"],
    academic_fields: "all",
    excluded_academic_fields: [],
    engineering_domains: "all",
    nationality_eligibility: "yes",
    excluded_nationalities: [],
    minimum_gpa: null,
    minimum_percentage: null,
    english_requirement: null,
    standardized_test_requirement: null,
    work_experience_required_years: null,
    work_experience_preferred: true,
    research_experience_required: false,
    research_experience_preferred: true,
    funding_type: "fully_funded",
    tuition_coverage: "100%",
    living_support: "Yes",
    other_benefits: null,
    deadline: null,
    deadline_confirmed: false,
    application_opening_date: null,
    intake: null,
    official_scholarship_url: "https://example.com",
    official_university_url: null,
    verification_status: "GREEN",
    verification_notes: null,
    last_verified_date: "2026-09-01",
    qs_2026: null,
    the_2026: null,
    student_facing_description: "Test fixture only — never used in production seed data.",
    ...overrides,
  };
}

export function scoreEdgeCaseFixtures() {
  const universities: never[] = [];
  const fixture = syntheticScholarship();

  const noExperience = runMatchingEngine(
    baseProfile({ workExperience: "none", hasResearchExperience: false, degreeLevel: "masters" }),
    [fixture],
    universities
  ).results[0]!;

  const workOnly = runMatchingEngine(
    baseProfile({ workExperience: "3_5", hasResearchExperience: false, degreeLevel: "masters" }),
    [fixture],
    universities
  ).results[0]!;

  const bothPreferred = runMatchingEngine(
    baseProfile({ workExperience: "3_5", hasResearchExperience: true, degreeLevel: "masters" }),
    [fixture],
    universities
  ).results[0]!;

  // No experience at all -> 0 bonus points.
  expect(noExperience.score.experience).toBe(0);
  // Work experience alone (record prefers it) -> half the 5-point ceiling.
  expect(workOnly.score.experience).toBe(2.5);
  // Both work and research experience preferred and present -> full 5 points, capped, not additive beyond the ceiling.
  expect(bothPreferred.score.experience).toBe(5);
}
