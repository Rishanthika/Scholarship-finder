import { NextRequest, NextResponse } from "next/server";
import { getScholarships, getUniversities } from "@/lib/supabase";
import { runMatchingEngine } from "@/lib/matchingEngine";
import type { MatchApiResponse, StudentProfile } from "@/types";

/**
 * POST /api/match
 *
 * Accepts a StudentProfile and returns ranked MatchResults.
 *
 * SECURITY (spec Phase 23): this is the ONLY place scoring happens. The
 * client never computes or transmits a score — it can only submit raw
 * profile answers, which this route validates before running the engine.
 * Airtable credentials are read server-side only (see src/lib/airtable.ts,
 * marked "server-only"), never exposed to the browser.
 */

function isValidStudentProfile(body: unknown): body is StudentProfile {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.nationality === "string" &&
    typeof b.degreeLevel === "string" &&
    typeof b.intendedField === "string" &&
    Array.isArray(b.engineeringDomains) &&
    typeof b.gradingSystem === "string" &&
    typeof b.englishTest === "string" &&
    Array.isArray(b.standardizedTests) &&
    typeof b.workExperience === "string" &&
    typeof b.hasResearchExperience === "boolean" &&
    Array.isArray(b.preferredCountries) &&
    typeof b.countryFilterMode === "string" &&
    typeof b.fundingPreference === "string" &&
    typeof b.intake === "string"
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidStudentProfile(body)) {
    return NextResponse.json({ error: "Invalid or incomplete student profile" }, { status: 400 });
  }

  try {
    const [scholarships, universities] = await Promise.all([getScholarships(), getUniversities()]);
    const { results, totalCandidates } = runMatchingEngine(body, scholarships, universities);

    const greenCount = results.filter((r) => r.scholarship.verification_status === "GREEN").length;
    const amberCount = results.filter((r) => r.scholarship.verification_status === "AMBER").length;

    const response: MatchApiResponse = { results, totalCandidates, greenCount, amberCount };
    return NextResponse.json(response);
  } catch (err) {
    // Never expose the raw error to the client (spec Phase 22) — log
    // server-side only.
    console.error("Matching engine error:", err);
    return NextResponse.json({ error: "We're having trouble finding matches right now. Please try again." }, { status: 503 });
  }
}
