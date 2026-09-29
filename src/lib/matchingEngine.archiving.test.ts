import { describe, it, expect } from "vitest";
import { runMatchingEngine } from "./matchingEngine";
import { scholarships, universities, baseProfile } from "./testHelpers";
import type { Scholarship } from "@/types";

describe("Admin dashboard phase — archived_at hard filter (Rule 0)", () => {
  it("is a no-op against the real seed data — no existing record sets archived_at, so results are unchanged", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters" }), scholarships, universities);
    // Sanity: confirms the seed data genuinely has no archived records,
    // so this new rule cannot have silently changed any prior test's
    // expected result set.
    expect(scholarships.every((s) => !s.archived_at)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("excludes a scholarship once archived_at is set, even if it would otherwise be a strong match", () => {
    const archived: Scholarship = { ...scholarships.find((s) => s.id === "FG-001")!, archived_at: "2026-09-01T00:00:00Z" };
    const modified = scholarships.map((s) => (s.id === "FG-001" ? archived : s));
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters", workExperience: "3_5" }), modified, universities);
    expect(results.find((r) => r.scholarship.id === "FG-001")).toBeUndefined();
  });

  it("un-archiving (archived_at back to null/undefined) restores the record to eligibility", () => {
    const unarchived: Scholarship = { ...scholarships.find((s) => s.id === "FG-001")!, archived_at: null };
    const modified = scholarships.map((s) => (s.id === "FG-001" ? unarchived : s));
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters", workExperience: "3_5" }), modified, universities);
    expect(results.find((r) => r.scholarship.id === "FG-001")).toBeDefined();
  });
});
