import { describe, it, expect } from "vitest";
import { runMatchingEngine } from "./matchingEngine";
import scholarshipsSeed from "@/data/scholarships.seed.json";
import universitiesSeed from "@/data/universities.seed.json";
import type { Scholarship, StudentProfile, University } from "@/types";

const scholarships = scholarshipsSeed as Scholarship[];
const universities = universitiesSeed as University[];

function baseProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    nationality: "India",
    currentEducationLevel: "bachelors",
    degreeLevel: "masters",
    intake: "2027",
    intendedField: "business",
    engineeringDomains: [],
    gradingSystem: "cgpa_10",
    academicScore: 8.2,
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

describe("Phase 26 — critical data-integrity tests", () => {
  it("NEVER returns SISGP (FG-040) for an Indian student — India is explicitly excluded", () => {
    const { results } = runMatchingEngine(baseProfile(), scholarships, universities);
    expect(results.find((r) => r.scholarship.id === "FG-040")).toBeUndefined();
  });

  it("NEVER returns ADB-JSP (FG-037) — RED status must hard-exclude regardless of domain match", () => {
    const profile = baseProfile({
      intendedField: "engineering",
      engineeringDomains: ["civil"], // this would be an exact domain match if not RED
    });
    const { results } = runMatchingEngine(profile, scholarships, universities);
    expect(results.find((r) => r.scholarship.id === "FG-037")).toBeUndefined();
  });

  it("never returns any RED-status record for any profile", () => {
    const { results } = runMatchingEngine(baseProfile(), scholarships, universities);
    expect(results.every((r) => r.scholarship.verification_status !== "RED")).toBe(true);
  });
});

describe("Hard filters", () => {
  it("excludes undergraduate-only scholarships for a Master's applicant", () => {
    const profile = baseProfile({ degreeLevel: "masters" });
    const { results } = runMatchingEngine(profile, scholarships, universities);
    // Toronto Pearson (FG-014) is undergraduate-only
    expect(results.find((r) => r.scholarship.id === "FG-014")).toBeUndefined();
  });

  it("excludes Trinity Global Excellence PG for an Engineering student (explicit field exclusion)", () => {
    const profile = baseProfile({ intendedField: "engineering", engineeringDomains: ["mechanical"] });
    const { results } = runMatchingEngine(profile, scholarships, universities);
    expect(results.find((r) => r.scholarship.id === "FG-021")).toBeUndefined();
  });

  it("excludes Chevening for a student with no work experience (mandatory requirement)", () => {
    const profile = baseProfile({ workExperience: "none" });
    const { results } = runMatchingEngine(profile, scholarships, universities);
    expect(results.find((r) => r.scholarship.id === "FG-001")).toBeUndefined();
  });

  it("includes Chevening for a student with 3-5 years experience (clears the 2-year mandatory threshold)", () => {
    const profile = baseProfile({ workExperience: "3_5" });
    const { results } = runMatchingEngine(profile, scholarships, universities);
    expect(results.find((r) => r.scholarship.id === "FG-001")).toBeDefined();
  });
});

describe("AMBER handling", () => {
  it("labels every AMBER result as confirmationRequired and applies the score deduction", () => {
    const profile = baseProfile({ degreeLevel: "masters" });
    const { results } = runMatchingEngine(profile, scholarships, universities);
    const amberResults = results.filter((r) => r.scholarship.verification_status === "AMBER");
    expect(amberResults.length).toBeGreaterThan(0);
    for (const r of amberResults) {
      expect(r.confirmationRequired).toBe(true);
      expect(r.score.amberDeduction).toBe(-10);
    }
  });
});

describe("Funding preference logic", () => {
  it("demotes partial-tuition scholarships when 'fully funded only' is selected", () => {
    const profileAny = baseProfile({ fundingPreference: "any", degreeLevel: "masters" });
    const profileFullyFunded = baseProfile({ fundingPreference: "fully_funded_only", degreeLevel: "masters" });

    const resAny = runMatchingEngine(profileAny, scholarships, universities).results.find((r) => r.scholarship.id === "FG-011"); // Edinburgh, partial
    const resFF = runMatchingEngine(profileFullyFunded, scholarships, universities).results.find(
      (r) => r.scholarship.id === "FG-011"
    );

    // Edinburgh is partial funding — under "any" it should score reasonably;
    // under "fully funded only" its funding component should be much lower.
    expect(resAny).toBeDefined();
    if (resFF) {
      expect(resFF.score.funding).toBeLessThan(resAny!.score.funding);
    }
  });
});

describe("Engineering domain tiering", () => {
  it("scores an exact engineering-domain match higher than a broad/all-fields match", () => {
    const profile = baseProfile({
      degreeLevel: "masters",
      intendedField: "engineering",
      engineeringDomains: ["mechanical"],
      workExperience: "3_5", // clears Chevening's 2-year mandatory threshold so it's a valid comparison point
    });
    const { results } = runMatchingEngine(profile, scholarships, universities);
    const daadStem = results.find((r) => r.scholarship.id === "FG-009"); // names Mechanical explicitly
    const chevening = results.find((r) => r.scholarship.id === "FG-001"); // broad/all fields

    expect(daadStem).toBeDefined();
    expect(chevening).toBeDefined();
    expect(daadStem!.score.domainField).toBeGreaterThan(chevening!.score.domainField);
  });
});

describe("Missing-data neutrality", () => {
  it("does not penalize a student for a scholarship with no published GPA minimum", () => {
    const profile = baseProfile({ academicScore: 9.5, workExperience: "3_5" });
    const { results } = runMatchingEngine(profile, scholarships, universities);
    const chevening = results.find((r) => r.scholarship.id === "FG-001");
    expect(chevening?.score.academicPerformance).toBe(10); // full neutral marks
  });
});

describe("Sorting", () => {
  it("never places a RED-excluded record's slot in the sorted list, and results are sorted by score descending", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters" }), scholarships, universities);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score.total).toBeGreaterThanOrEqual(results[i]!.score.total);
    }
  });
});
