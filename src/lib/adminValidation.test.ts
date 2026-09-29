import { describe, it, expect } from "vitest";
import {
  validateScholarship,
  isScholarshipValid,
  validateUniversity,
  isUniversityValid,
  DEFAULT_NEW_SCHOLARSHIP_STATUS,
} from "./adminValidation";
import type { ScholarshipValidationInput } from "./adminValidation";

const KNOWN_UNIS = ["uni_edinburgh", "uni_kaist"];

function validInput(overrides: Partial<ScholarshipValidationInput> = {}): ScholarshipValidationInput {
  return {
    scholarship_name: "Test Scholarship",
    country: "United Kingdom",
    degree_level: ["masters"],
    verification_status: "AMBER",
    funding_type: "partial_tuition",
    tuition_coverage: "50%",
    ...overrides,
  };
}

describe("Scholarship validation — create (new record)", () => {
  it("accepts a fully valid new record", () => {
    const errors = validateScholarship(validInput(), { isUpdate: false, knownUniversityIds: KNOWN_UNIS });
    expect(isScholarshipValid(errors)).toBe(true);
  });

  it("rejects an empty scholarship name", () => {
    const errors = validateScholarship(validInput({ scholarship_name: "" }), { isUpdate: false, knownUniversityIds: KNOWN_UNIS });
    expect(errors.scholarship_name).toBeDefined();
  });

  it("rejects a whitespace-only scholarship name", () => {
    const errors = validateScholarship(validInput({ scholarship_name: "   " }), { isUpdate: false, knownUniversityIds: KNOWN_UNIS });
    expect(errors.scholarship_name).toBeDefined();
  });

  it("rejects a university_id that doesn't exist", () => {
    const errors = validateScholarship(validInput({ university_id: "uni_does_not_exist" }), {
      isUpdate: false,
      knownUniversityIds: KNOWN_UNIS,
    });
    expect(errors.university_id).toBeDefined();
  });

  it("accepts a university_id that does exist", () => {
    const errors = validateScholarship(validInput({ university_id: "uni_kaist" }), { isUpdate: false, knownUniversityIds: KNOWN_UNIS });
    expect(errors.university_id).toBeUndefined();
  });

  it("rejects an empty country", () => {
    const errors = validateScholarship(validInput({ country: "" }), { isUpdate: false, knownUniversityIds: KNOWN_UNIS });
    expect(errors.country).toBeDefined();
  });

  it("rejects an invalid degree level enum value", () => {
    const errors = validateScholarship(validInput({ degree_level: ["bachelors_degree" as never] }), {
      isUpdate: false,
      knownUniversityIds: KNOWN_UNIS,
    });
    expect(errors.degree_level).toBeDefined();
  });

  it("rejects a missing degree level array", () => {
    const errors = validateScholarship(validInput({ degree_level: undefined }), { isUpdate: false, knownUniversityIds: KNOWN_UNIS });
    expect(errors.degree_level).toBeDefined();
  });

  it("rejects an invalid verification_status", () => {
    const errors = validateScholarship(validInput({ verification_status: "BLUE" as never }), {
      isUpdate: false,
      knownUniversityIds: KNOWN_UNIS,
    });
    expect(errors.verification_status).toBeDefined();
  });

  it("rejects a malformed official_scholarship_url", () => {
    const errors = validateScholarship(validInput({ official_scholarship_url: "not-a-url" }), {
      isUpdate: false,
      knownUniversityIds: KNOWN_UNIS,
    });
    expect(errors.official_scholarship_url).toBeDefined();
  });

  it("accepts a valid official_scholarship_url", () => {
    const errors = validateScholarship(validInput({ official_scholarship_url: "https://example.com/scholarship" }), {
      isUpdate: false,
      knownUniversityIds: KNOWN_UNIS,
    });
    expect(errors.official_scholarship_url).toBeUndefined();
  });

  it("rejects a malformed deadline", () => {
    const errors = validateScholarship(validInput({ deadline: "15th November" }), { isUpdate: false, knownUniversityIds: KNOWN_UNIS });
    expect(errors.deadline).toBeDefined();
  });

  it("accepts a valid ISO deadline", () => {
    const errors = validateScholarship(validInput({ deadline: "2027-11-15" }), { isUpdate: false, knownUniversityIds: KNOWN_UNIS });
    expect(errors.deadline).toBeUndefined();
  });
});

describe("Scholarship validation — funding contradiction (Rule 9)", () => {
  it("rejects fully_funded with a sub-100% tuition coverage figure", () => {
    const errors = validateScholarship(
      validInput({ funding_type: "fully_funded", tuition_coverage: "50%" }),
      { isUpdate: false, knownUniversityIds: KNOWN_UNIS }
    );
    expect(errors.tuition_coverage).toBeDefined();
  });

  it("rejects fully_funded with the word 'partial' in tuition coverage", () => {
    const errors = validateScholarship(
      validInput({ funding_type: "fully_funded", tuition_coverage: "Partial tuition support" }),
      { isUpdate: false, knownUniversityIds: KNOWN_UNIS }
    );
    expect(errors.tuition_coverage).toBeDefined();
  });

  it("accepts fully_funded with a genuine 100% figure", () => {
    const errors = validateScholarship(
      validInput({ funding_type: "fully_funded", tuition_coverage: "100%" }),
      { isUpdate: false, knownUniversityIds: KNOWN_UNIS }
    );
    expect(errors.tuition_coverage).toBeUndefined();
  });

  it("does not flag partial_tuition scholarships for having a sub-100% figure (that's expected, not a contradiction)", () => {
    const errors = validateScholarship(
      validInput({ funding_type: "partial_tuition", tuition_coverage: "20%" }),
      { isUpdate: false, knownUniversityIds: KNOWN_UNIS }
    );
    expect(errors.tuition_coverage).toBeUndefined();
  });
});

describe("Scholarship validation — status-change confirmation (Rule 10)", () => {
  it("requires confirmation when changing an existing record's verification_status", () => {
    const errors = validateScholarship(validInput({ verification_status: "GREEN" }), {
      isUpdate: true,
      existingStatus: "AMBER",
      knownUniversityIds: KNOWN_UNIS,
    });
    expect(errors.statusChange).toBeDefined();
  });

  it("accepts the change once statusChangeConfirmed is true", () => {
    const errors = validateScholarship(validInput({ verification_status: "GREEN", statusChangeConfirmed: true }), {
      isUpdate: true,
      existingStatus: "AMBER",
      knownUniversityIds: KNOWN_UNIS,
    });
    expect(errors.statusChange).toBeUndefined();
  });

  it("does NOT require confirmation when the status is unchanged", () => {
    const errors = validateScholarship(validInput({ verification_status: "AMBER" }), {
      isUpdate: true,
      existingStatus: "AMBER",
      knownUniversityIds: KNOWN_UNIS,
    });
    expect(errors.statusChange).toBeUndefined();
  });

  it("does NOT require confirmation on a brand-new record (isUpdate: false)", () => {
    const errors = validateScholarship(validInput({ verification_status: "RED" }), {
      isUpdate: false,
      knownUniversityIds: KNOWN_UNIS,
    });
    expect(errors.statusChange).toBeUndefined();
  });

  it("RED -> GREEN transition also requires confirmation (no special-case bypass)", () => {
    const errors = validateScholarship(validInput({ verification_status: "GREEN" }), {
      isUpdate: true,
      existingStatus: "RED",
      knownUniversityIds: KNOWN_UNIS,
    });
    expect(errors.statusChange).toBeDefined();
  });
});

describe("New-scholarship default status", () => {
  it("defaults to AMBER, never GREEN", () => {
    expect(DEFAULT_NEW_SCHOLARSHIP_STATUS).toBe("AMBER");
  });
});

describe("University validation", () => {
  it("accepts a valid university", () => {
    const errors = validateUniversity({ university_name: "Test University", country: "Testland" });
    expect(isUniversityValid(errors)).toBe(true);
  });

  it("rejects an empty name", () => {
    const errors = validateUniversity({ university_name: "", country: "Testland" });
    expect(errors.university_name).toBeDefined();
  });

  it("rejects an empty country", () => {
    const errors = validateUniversity({ university_name: "Test University", country: "" });
    expect(errors.country).toBeDefined();
  });

  it("rejects a malformed official_url", () => {
    const errors = validateUniversity({ university_name: "Test University", country: "Testland", official_url: "not-a-url" });
    expect(errors.official_url).toBeDefined();
  });
});
