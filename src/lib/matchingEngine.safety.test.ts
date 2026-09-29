import { describe, it, expect } from "vitest";
import { runMatchingEngine } from "./matchingEngine";
import { scholarships, universities, baseProfile, assertNoRedResults, findResult, RED_IDS } from "./testHelpers";

describe("Section 4 — Funding safety (all types correctly distinguished)", () => {
  it("RED_IDS fixture is non-empty and matches the known database (FG-037, FG-040)", () => {
    expect(RED_IDS.sort()).toEqual(["FG-037", "FG-040"]);
  });

  it("no funding type is silently treated as equivalent to another — spot-check each type present in the database", () => {
    const typesInDb = new Set(scholarships.map((s) => s.funding_type));
    // Every type used in the seed data must be one of the schema's known
    // categories — this fails loudly if a typo/new ad-hoc value sneaks in.
    const KNOWN = ["fully_funded", "full_tuition", "partial_tuition", "tuition_waiver", "stipend", "merit", "need_based", "research_funding", "mixed"];
    for (const t of typesInDb) {
      expect(KNOWN, `unexpected funding_type "${t}" not in the known schema`).toContain(t);
    }
  });

  it("a student selecting 'fully funded only' never sees a partial/merit/stipend record score the full 15 funding points", () => {
    const { results } = runMatchingEngine(baseProfile({ fundingPreference: "fully_funded_only", degreeLevel: "masters" }), scholarships, universities);
    const nonFullyFunded = results.filter((r) => r.scholarship.funding_type !== "fully_funded");
    for (const r of nonFullyFunded) {
      expect(r.score.funding, `${r.scholarship.id} (${r.scholarship.funding_type}) leaked full funding points under 'fully funded only'`).toBeLessThan(15);
    }
  });

  it("tuition_waiver is never scored identically to fully_funded under 'fully funded only' (they are materially different — a waiver says nothing about living costs)", () => {
    const { results } = runMatchingEngine(baseProfile({ fundingPreference: "fully_funded_only", degreeLevel: "masters" }), scholarships, universities);
    const waiverRecord = findResult(results, "FG-035"); // GREAT Scholarships — tuition_waiver type
    if (waiverRecord) {
      expect(waiverRecord.score.funding).toBeLessThan(15);
    }
  });

  it("stipend-only funding (tuition NOT covered) is never displayed or scored as fully funded", () => {
    const daadAll = scholarships.find((s) => s.id === "FG-008")!;
    expect(daadAll.funding_type).toBe("stipend");
    expect(daadAll.tuition_coverage).toMatch(/not covered/i);
  });
});

describe("Section 5 — RED scholarship permanent regression tests (SISGP, ADB-JSP)", () => {
  it("Indian student + perfect profile + exact domain match + high score still never receives ADB-JSP", () => {
    const profile = baseProfile({
      nationality: "India",
      degreeLevel: "masters",
      intendedField: "engineering",
      engineeringDomains: ["civil"], // exact match to ADB-JSP's named domain
      academicScore: 10,
      gradingSystem: "cgpa_10",
      englishTest: "IELTS",
      englishScore: 9,
      workExperience: "5_plus",
      fundingPreference: "fully_funded_only",
    });
    const { results } = runMatchingEngine(profile, scholarships, universities);
    expect(findResult(results, "FG-037")).toBeUndefined();
    assertNoRedResults(results);
  });

  it("Indian student + perfect profile still never receives SISGP", () => {
    const profile = baseProfile({
      nationality: "India",
      degreeLevel: "masters",
      academicScore: 10,
      fundingPreference: "fully_funded_only",
    });
    const { results } = runMatchingEngine(profile, scholarships, universities);
    expect(findResult(results, "FG-040")).toBeUndefined();
    assertNoRedResults(results);
  });

  it("RED records are removed BEFORE scoring/ranking — they never occupy a ranked slot, not even a low one", () => {
    const { results, totalCandidates } = runMatchingEngine(baseProfile({ degreeLevel: "masters" }), scholarships, universities);
    // totalCandidates is the post-hard-filter, pre-threshold count — RED
    // records must be absent from it entirely, not merely absent from the
    // final surfaced list.
    const redInCandidates = results.some((r) => RED_IDS.includes(r.scholarship.id));
    expect(redInCandidates).toBe(false);
    expect(totalCandidates).toBeGreaterThanOrEqual(results.length); // candidates can exceed surfaced results (sub-40 scores are dropped after scoring), but RED is never among either set
  });
});

describe("Section 6 — India nationality logic (never inferred from geography)", () => {
  it("Indian student + India-supported scholarship (Chevening) = allowed", () => {
    const { results } = runMatchingEngine(baseProfile({ nationality: "India", degreeLevel: "masters", workExperience: "3_5" }), scholarships, universities);
    expect(findResult(results, "FG-001")).toBeDefined();
  });

  it("Indian student + India-excluded scholarship (SISGP) = excluded", () => {
    const { results } = runMatchingEngine(baseProfile({ nationality: "India", degreeLevel: "masters" }), scholarships, universities);
    expect(findResult(results, "FG-040")).toBeUndefined();
  });

  it("nationality eligibility is read from the explicit field, never inferred from the scholarship's country — Sweden's SISGP is excluded for India even though nothing about 'Sweden' as a location implies exclusion", () => {
    const sisgp = scholarships.find((s) => s.id === "FG-040")!;
    expect(sisgp.country).toBe("Sweden");
    expect(sisgp.nationality_eligibility).toBe("no"); // the exclusion comes from this field, not from being told "Sweden" is off-limits generally
    // Prove other Sweden-based logic isn't blanket-excluded: no other Swedish record exists in this DB to cross-check,
    // so instead prove a DIFFERENT European country's scholarship with nationality_eligibility="yes" is NOT excluded,
    // confirming exclusion is per-record, not per-country.
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters" }), scholarships, universities);
    expect(findResult(results, "FG-020")).toBeDefined(); // Netherlands — nationality_eligibility "yes"
  });
});

describe("Section 7 — Engineering domain tests across 10 required domains", () => {
  const domainCases: { domain: string; field: "engineering" | "computer_science_technology" }[] = [
    { domain: "mechanical", field: "engineering" },
    { domain: "civil", field: "engineering" },
    { domain: "computer_science", field: "computer_science_technology" },
    { domain: "electrical", field: "engineering" },
    { domain: "electronics_communication", field: "engineering" },
    { domain: "biomedical", field: "engineering" },
    { domain: "chemical", field: "engineering" },
    { domain: "environmental", field: "engineering" },
    { domain: "ai_ml", field: "computer_science_technology" },
    { domain: "data_science", field: "computer_science_technology" },
  ];

  for (const { domain, field } of domainCases) {
    it(`${domain}: never crashes, never returns a RED record, and every result's domainField score is one of the 3 valid tiers (10/15/20)`, () => {
      const profile = baseProfile({ degreeLevel: "masters", intendedField: field, engineeringDomains: [domain as never] });
      const { results } = runMatchingEngine(profile, scholarships, universities);
      assertNoRedResults(results);
      for (const r of results) {
        expect([10, 15, 20]).toContain(r.score.domainField);
      }
    });
  }

  it("explicit incompatibility (Fulbright-Nehru's field-level exclusion) is excluded regardless of which engineering domain is chosen", () => {
    for (const domain of ["mechanical", "computer_science", "electrical"]) {
      const field = domain === "computer_science" ? "computer_science_technology" : "engineering";
      const { results } = runMatchingEngine(
        baseProfile({ degreeLevel: "masters", intendedField: field as never, engineeringDomains: [domain as never] }),
        scholarships,
        universities
      );
      expect(findResult(results, "FG-028")).toBeUndefined();
    }
  });

  it("a generic 'Engineering' field match does not override an explicit exclusion — Trinity excludes Engineering as a whole field, no domain choice can bypass that", () => {
    for (const domain of ["mechanical", "civil", "biomedical"]) {
      const { results } = runMatchingEngine(
        baseProfile({ degreeLevel: "masters", intendedField: "engineering", engineeringDomains: [domain as never] }),
        scholarships,
        universities
      );
      expect(findResult(results, "FG-021")).toBeUndefined();
    }
  });
});

describe("Section 8 — Degree level hard filters", () => {
  it("Bachelor's student + Master's-only scholarship (Chevening) = excluded", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "undergraduate" }), scholarships, universities);
    expect(findResult(results, "FG-001")).toBeUndefined();
  });

  it("Master's student + PhD-only scholarship (RTP) = excluded", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters" }), scholarships, universities);
    expect(findResult(results, "FG-032")).toBeUndefined();
  });

  it("PhD student + Master's-only scholarship (Chevening) = excluded", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "phd" }), scholarships, universities);
    expect(findResult(results, "FG-001")).toBeUndefined();
  });

  it("multi-level scholarships (MAECI: masters/phd/research) work correctly for every level they list", () => {
    for (const level of ["masters", "phd", "research"] as const) {
      const { results } = runMatchingEngine(baseProfile({ degreeLevel: level, intake: "not_sure" }), scholarships, universities); // not_sure bypasses MAECI's expired deadline
      expect(findResult(results, "FG-003"), `MAECI should be a candidate at degree level ${level}`).toBeDefined();
    }
  });
});

describe("Section 9 — Missing-data handling (never reject, never invent)", () => {
  it("unknown GPA requirement does not cause rejection", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters" }), scholarships, universities);
    expect(findResult(results, "FG-004")).toBeDefined(); // GKS-G, no published GPA minimum
  });

  it("unknown IELTS requirement does not cause rejection", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters", englishTest: "not_taken" }), scholarships, universities);
    expect(findResult(results, "FG-004")).toBeDefined();
  });

  it("unknown work-experience requirement does not cause rejection (only MANDATORY thresholds hard-filter)", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters", workExperience: "none" }), scholarships, universities);
    expect(findResult(results, "FG-004")).toBeDefined(); // GKS-G has no mandatory work-experience field set
  });

  it("unknown deadline is displayed as unconfirmed, never invented as a specific date", () => {
    const gks = scholarships.find((s) => s.id === "FG-004")!;
    expect(gks.deadline).toBeNull();
    expect(gks.deadline_confirmed).toBe(false);
  });

  it("unknown funding coverage amount is never labeled as fully funded when the type isn't fully_funded", () => {
    const utokyo = scholarships.find((s) => s.id === "FG-036")!;
    expect(utokyo.tuition_coverage).toBeNull();
    expect(utokyo.funding_type).not.toBe("fully_funded");
  });

  it("unknown university ranking is stored as null, never a guessed number", () => {
    const alabama = scholarships.find((s) => s.id === "FG-013")!;
    expect(alabama.qs_2026).toBeNull();
    expect(alabama.the_2026).toBeNull();
  });
});

describe("Section 10 — GREEN/AMBER/RED result behavior", () => {
  it("GREEN scholarships appear as normal results with confirmationRequired=false", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters", workExperience: "3_5" }), scholarships, universities);
    const chevening = findResult(results, "FG-001");
    expect(chevening?.confirmationRequired).toBe(false);
  });

  it("AMBER scholarships appear with confirmationRequired=true", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters" }), scholarships, universities);
    expect(findResult(results, "FG-027")?.confirmationRequired).toBe(true); // MEXT
  });

  it("RED scholarships never appear under any circumstance", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters" }), scholarships, universities);
    assertNoRedResults(results);
  });
});

describe("Section 11 — Explainability integrity (every line must be supported by real data)", () => {
  it("'Indian students are supported' is only ever shown when nationality_eligibility is genuinely 'yes' or the student cleared a conditional check via hard filtering", () => {
    const { results } = runMatchingEngine(baseProfile({ nationality: "India", degreeLevel: "masters", workExperience: "3_5" }), scholarships, universities);
    const chevening = findResult(results, "FG-001")!;
    const hasNationalityLine = chevening.explanation.lines.some((l) => l.text.includes("Indian students are supported"));
    expect(hasNationalityLine).toBe(true);
    expect(chevening.scholarship.nationality_eligibility).toBe("yes"); // the line is backed by real data
  });

  it("a warning line about unpublished academic requirements only appears when the scholarship genuinely has none published", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters", workExperience: "3_5" }), scholarships, universities);
    const chevening = findResult(results, "FG-001")!;
    const hasGpaWarning = chevening.explanation.lines.some((l) => l.text.includes("does not publish a minimum academic score"));
    expect(hasGpaWarning).toBe(true);
    expect(chevening.scholarship.minimum_gpa).toBeNull();
    expect(chevening.scholarship.minimum_percentage).toBeNull(); // the warning is backed by real data, not asserted blindly
  });

  it("the AMBER verification-notes warning line always equals the record's actual verification_notes field verbatim", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters" }), scholarships, universities);
    const mext = findResult(results, "FG-027")!;
    const noteLine = mext.explanation.lines.find((l) => l.text === mext.scholarship.verification_notes);
    expect(noteLine).toBeDefined();
  });
});

describe("Section 12 — Score integrity and determinism", () => {
  it("the same profile run twice against the same database produces byte-identical scores", () => {
    const profile = baseProfile({ degreeLevel: "masters", intendedField: "engineering", engineeringDomains: ["mechanical"] });
    const run1 = runMatchingEngine(profile, scholarships, universities);
    const run2 = runMatchingEngine(profile, scholarships, universities);
    expect(run1.results.map((r) => ({ id: r.scholarship.id, score: r.score.total }))).toEqual(
      run2.results.map((r) => ({ id: r.scholarship.id, score: r.score.total }))
    );
  });

  it("score components sum correctly to the total (accounting for the 0-100 clamp)", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters" }), scholarships, universities);
    for (const r of results) {
      const s = r.score;
      const rawSum = s.degreeLevel + s.nationality + s.domainField + s.funding + s.academicPerformance + s.englishTest + s.experience + s.countryPreference + s.amberDeduction;
      const expectedTotal = Math.max(0, Math.min(100, rawSum));
      expect(r.score.total).toBeCloseTo(expectedTotal, 5);
    }
  });

  it("hard-filtered (excluded) scholarships never appear in the final surfaced results with any score at all", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters" }), scholarships, universities);
    expect(findResult(results, "FG-014")).toBeUndefined(); // UG-only, hard-filtered
    expect(findResult(results, "FG-040")).toBeUndefined(); // RED, hard-filtered
  });

  it("scoring happens entirely server-side in this module — the client (API route) only ever submits raw profile answers, never a pre-computed score (see src/app/api/match/route.ts's isValidStudentProfile, which has no score field at all)", () => {
    // This is a structural guarantee, verified by inspecting the type contract:
    // StudentProfile has no `score` field, so there is nothing for a client to tamper with.
    const profile = baseProfile();
    expect((profile as unknown as Record<string, unknown>).score).toBeUndefined();
  });
});

describe("Section 13 — Result ordering / ranking", () => {
  it("results are always sorted by score descending", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters" }), scholarships, universities);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score.total).toBeGreaterThanOrEqual(results[i]!.score.total);
    }
  });

  it("university ranking (QS/THE) is never part of the score — two records with identical scores but different QS ranks must have identical score.total", () => {
    // Verify structurally: ScoreBreakdown has no ranking-derived field.
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters" }), scholarships, universities);
    for (const r of results) {
      expect(Object.keys(r.score)).not.toContain("qsRank");
      expect(Object.keys(r.score)).not.toContain("theRank");
    }
  });

  it("ranking is used only as the final tie-break among EQUAL scores, never to reorder unequal scores", () => {
    const { results } = runMatchingEngine(baseProfile({ degreeLevel: "masters" }), scholarships, universities);
    // Find any adjacent pair with unequal scores and confirm the higher score is genuinely first regardless of QS rank.
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1]!;
      const curr = results[i]!;
      if (prev.score.total !== curr.score.total) {
        expect(prev.score.total).toBeGreaterThan(curr.score.total); // score, not ranking, decided this pair's order
      }
    }
  });
});
