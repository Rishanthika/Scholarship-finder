import "server-only";
import { getServiceClient, isSupabaseConfigured } from "./supabaseClient";
import type { Scholarship, University } from "@/types";
import scholarshipsSeed from "@/data/scholarships.seed.json";
import universitiesSeed from "@/data/universities.seed.json";

/**
 * Data-access layer for the Scholarships and Universities tables —
 * Supabase edition. Supersedes src/lib/airtable.ts as the active adapter
 * for the Scholarship Finder (that file is left in place, unused, in
 * case Airtable is ever revisited, but src/app/api/match/route.ts now
 * imports from here instead).
 *
 * FALLBACK BEHAVIOR (mirrors the existing Airtable adapter's pattern
 * exactly, per this phase's explicit requirement to reuse it):
 *   1. If SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set, this
 *      module never attempts a network call at all — it serves the local
 *      seed JSON directly, so local development still needs zero
 *      external configuration.
 *   2. If those env vars ARE set but the live query fails for any reason
 *      (Supabase temporarily unavailable, network blip, wrong
 *      credentials), the catch block below logs the failure server-side
 *      and falls back to the same seed data rather than surfacing a
 *      broken Scholarship Finder to a student mid-assessment.
 *
 * SECURITY: this file uses the SERVICE ROLE key, which bypasses Row
 * Level Security entirely by design. It is loaded from
 * SUPABASE_SERVICE_ROLE_KEY (server-only env var, never
 * NEXT_PUBLIC_-prefixed) and this file is marked "server-only" — Next.js
 * will fail the build if any client component ever imports it, exactly
 * like the Airtable adapter before it.
 */

const client = getServiceClient();

// ---------------------------------------------------------------------------
// Row <-> app-type mapping. academic_fields / engineering_domains are
// stored as JSONB (see migration 0001's design note) and come back from
// supabase-js already parsed into JS values, so no manual JSON.parse is
// needed — just a type assertion back to the app's union type.
// ---------------------------------------------------------------------------

interface ScholarshipRow {
  id: string;
  scholarship_name: string;
  provider: string;
  university_id: string | null;
  country: string;
  degree_level: string[];
  academic_fields: unknown;
  excluded_academic_fields: string[];
  engineering_domains: unknown;
  nationality_eligibility: string;
  excluded_nationalities: string[];
  minimum_gpa: number | null;
  minimum_percentage: number | null;
  english_requirement: string | null;
  standardized_test_requirement: string | null;
  work_experience_required_years: number | null;
  work_experience_preferred: boolean;
  research_experience_required: boolean;
  research_experience_preferred: boolean;
  funding_type: string;
  tuition_coverage: string | null;
  living_support: string | null;
  other_benefits: string | null;
  deadline: string | null;
  deadline_confirmed: boolean;
  application_opening_date: string | null;
  intake: string | null;
  official_scholarship_url: string | null;
  official_university_url: string | null;
  verification_status: string;
  verification_notes: string | null;
  last_verified_date: string;
  qs_2026: number | null;
  the_2026: number | null;
  student_facing_description: string;
}

interface UniversityRow {
  id: string;
  university_name: string;
  country: string;
  city: string | null;
  qs_2026: number | null;
  the_2026: number | null;
  official_url: string | null;
  partner_status: string | null;
  last_verified_date: string | null;
}

function mapRowToScholarship(row: ScholarshipRow): Scholarship {
  return {
    id: row.id,
    scholarship_name: row.scholarship_name,
    provider: row.provider,
    university_id: row.university_id,
    country: row.country,
    degree_level: row.degree_level as Scholarship["degree_level"],
    academic_fields: row.academic_fields as Scholarship["academic_fields"],
    excluded_academic_fields: row.excluded_academic_fields as Scholarship["excluded_academic_fields"],
    engineering_domains: row.engineering_domains as Scholarship["engineering_domains"],
    nationality_eligibility: row.nationality_eligibility as Scholarship["nationality_eligibility"],
    excluded_nationalities: row.excluded_nationalities,
    minimum_gpa: row.minimum_gpa,
    minimum_percentage: row.minimum_percentage,
    english_requirement: row.english_requirement,
    standardized_test_requirement: row.standardized_test_requirement,
    work_experience_required_years: row.work_experience_required_years,
    work_experience_preferred: row.work_experience_preferred,
    research_experience_required: row.research_experience_required,
    research_experience_preferred: row.research_experience_preferred,
    funding_type: row.funding_type as Scholarship["funding_type"],
    tuition_coverage: row.tuition_coverage,
    living_support: row.living_support,
    other_benefits: row.other_benefits,
    deadline: row.deadline,
    deadline_confirmed: row.deadline_confirmed,
    application_opening_date: row.application_opening_date,
    intake: row.intake,
    official_scholarship_url: row.official_scholarship_url,
    official_university_url: row.official_university_url,
    verification_status: row.verification_status as Scholarship["verification_status"],
    verification_notes: row.verification_notes,
    last_verified_date: row.last_verified_date,
    qs_2026: row.qs_2026,
    the_2026: row.the_2026,
    student_facing_description: row.student_facing_description,
  };
}

function mapRowToUniversity(row: UniversityRow): University {
  return {
    id: row.id,
    university_name: row.university_name,
    country: row.country,
    city: row.city,
    qs_2026: row.qs_2026,
    the_2026: row.the_2026,
    official_url: row.official_url,
    partner_status: row.partner_status as University["partner_status"],
    last_verified_date: row.last_verified_date,
  };
}

export async function getScholarships(): Promise<Scholarship[]> {
  if (!client) {
    return scholarshipsSeed as Scholarship[];
  }
  try {
    const { data, error } = await client.from("scholarships").select("*");
    if (error) throw error;
    if (!data) throw new Error("Supabase returned no data for scholarships");
    return (data as ScholarshipRow[]).map(mapRowToScholarship);
  } catch (err) {
    console.error("Supabase getScholarships failed, falling back to seed data:", err);
    return scholarshipsSeed as Scholarship[];
  }
}

export async function getUniversities(): Promise<University[]> {
  if (!client) {
    return universitiesSeed as University[];
  }
  try {
    const { data, error } = await client.from("universities").select("*");
    if (error) throw error;
    if (!data) throw new Error("Supabase returned no data for universities");
    return (data as UniversityRow[]).map(mapRowToUniversity);
  } catch (err) {
    console.error("Supabase getUniversities failed, falling back to seed data:", err);
    return universitiesSeed as University[];
  }
}

export const dataSourceStatus = isSupabaseConfigured ? ("supabase" as const) : ("seed" as const);
