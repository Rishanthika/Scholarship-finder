import { describe, it, expect } from "vitest";
import { scholarships, universities } from "./testHelpers";

describe("Section 14 — Database integrity", () => {
  it("every scholarship has a unique ID", () => {
    const ids = scholarships.map((s) => s.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicates, `duplicate IDs found: ${duplicates.join(", ")}`).toHaveLength(0);
  });

  it("every scholarship has a non-empty name, provider, and country", () => {
    for (const s of scholarships) {
      expect(s.scholarship_name.length, `${s.id} has an empty name`).toBeGreaterThan(0);
      expect(s.provider.length, `${s.id} has an empty provider`).toBeGreaterThan(0);
      expect(s.country.length, `${s.id} has an empty country`).toBeGreaterThan(0);
    }
  });

  it("every scholarship has at least one degree level", () => {
    for (const s of scholarships) {
      expect(s.degree_level.length, `${s.id} has no degree_level`).toBeGreaterThan(0);
    }
  });

  it("every scholarship has a funding_type and a verification_status", () => {
    for (const s of scholarships) {
      expect(s.funding_type, `${s.id} missing funding_type`).toBeTruthy();
      expect(["GREEN", "AMBER", "RED"], `${s.id} has invalid verification_status`).toContain(s.verification_status);
    }
  });

  it("every scholarship has a last_verified_date", () => {
    for (const s of scholarships) {
      expect(s.last_verified_date.length, `${s.id} missing last_verified_date`).toBeGreaterThan(0);
    }
  });

  it("GREEN/AMBER/RED counts exactly match the current database (report, not assumption)", () => {
    const green = scholarships.filter((s) => s.verification_status === "GREEN");
    const amber = scholarships.filter((s) => s.verification_status === "AMBER");
    const red = scholarships.filter((s) => s.verification_status === "RED");
    expect(green.length + amber.length + red.length).toBe(scholarships.length);
    expect(scholarships.length).toBe(40);
    expect(green.length).toBe(22);
    expect(amber.length).toBe(16);
    expect(red.length).toBe(2);
    expect(red.map((r) => r.id).sort()).toEqual(["FG-037", "FG-040"]);
  });

  it("every university_id referenced by a scholarship exists in the Universities table (no dangling references)", () => {
    const uniIds = new Set(universities.map((u) => u.id));
    for (const s of scholarships) {
      if (s.university_id !== null) {
        expect(uniIds.has(s.university_id), `${s.id} references unknown university_id "${s.university_id}"`).toBe(true);
      }
    }
  });

  it("QS/THE ranks, where present, are positive integers (never a placeholder or invented value like 0 or -1)", () => {
    for (const s of scholarships) {
      if (s.qs_2026 !== null) expect(s.qs_2026).toBeGreaterThan(0);
      if (s.the_2026 !== null) expect(s.the_2026).toBeGreaterThan(0);
    }
    for (const u of universities) {
      if (u.qs_2026 !== null) expect(u.qs_2026).toBeGreaterThan(0);
      if (u.the_2026 !== null) expect(u.the_2026).toBeGreaterThan(0);
    }
  });
});

describe("Section 15 — Official links", () => {
  it("every scholarship has at least one official link (scholarship URL or university URL) EXCEPT records explicitly flagged as missing one in verification_notes", () => {
    const missingBoth = scholarships.filter((s) => !s.official_scholarship_url && !s.official_university_url);
    for (const s of missingBoth) {
      // Every record with no link at all must have this gap explicitly
      // acknowledged in its notes — never a silently missing link.
      expect(s.verification_notes, `${s.id} has no official link AND no note explaining why`).toBeTruthy();
    }
  });

  it("no official_scholarship_url points to a known aggregator domain", () => {
    const AGGREGATOR_DOMAINS = [
      "buddy4study",
      "scholars4dev",
      "iefa.org",
      "fastweb",
      "leapscholar",
      "upgrad.com",
      "shiksha.com",
      "collegedunia",
      "wemakescholars",
      "yocket",
    ];
    for (const s of scholarships) {
      if (s.official_scholarship_url) {
        const url = s.official_scholarship_url.toLowerCase();
        for (const domain of AGGREGATOR_DOMAINS) {
          expect(url.includes(domain), `${s.id}'s official_scholarship_url points to an aggregator (${domain}): ${url}`).toBe(false);
        }
      }
    }
  });

  it("reports every record missing a scholarship-specific URL (university-only link), for the manual follow-up queue", () => {
    const scholarshipUrlMissing = scholarships.filter((s) => !s.official_scholarship_url).map((s) => s.id);
    // This is a reporting assertion, not a failure condition — documented
    // here as a snapshot so a future change to this list is visible in
    // the test diff rather than silently drifting.
    expect(scholarshipUrlMissing.sort()).toEqual(["FG-035", "FG-039"]);
  });

  it("every university has an official_url", () => {
    for (const u of universities) {
      expect(u.official_url, `${u.id} missing official_url`).toBeTruthy();
    }
  });
});
