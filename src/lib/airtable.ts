import "server-only";
// NOTE: superseded as of the Supabase migration phase — src/app/api/match/route.ts
// now imports from src/lib/supabase.ts instead. This file is left in place,
// unused, in case Airtable is ever revisited as an alternative data source;
// it was never connected to real credentials in any prior phase either.
import type { Scholarship, University } from "@/types";
import scholarshipsSeed from "@/data/scholarships.seed.json";
import universitiesSeed from "@/data/universities.seed.json";

/**
 * Data-access layer for the Scholarships and Universities tables.
 *
 * CURRENT STATE: no Airtable base has been connected yet (no API key was
 * available at build time). This module transparently falls back to the
 * local seed data (a faithful conversion of the 40-record master database)
 * so the rest of the application — matching engine, API route, UI — is
 * fully functional right now without any external dependency.
 *
 * TO CONNECT REAL AIRTABLE (the one remaining manual step):
 *   1. Create an Airtable base with a `Scholarships` table and a
 *      `Universities` table, using the field names in src/types/index.ts.
 *   2. Set these environment variables (see .env.example):
 *        AIRTABLE_API_KEY
 *        AIRTABLE_BASE_ID
 *        AIRTABLE_SCHOLARSHIPS_TABLE  (defaults to "Scholarships")
 *        AIRTABLE_UNIVERSITIES_TABLE  (defaults to "Universities")
 *   3. Nothing else changes — this file already checks for those variables
 *      and switches from seed data to live Airtable calls automatically.
 *
 * This file is server-only ("server-only" import above enforces it at
 * build time) — the API key is never bundled into client-side code.
 */

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const SCHOLARSHIPS_TABLE = process.env.AIRTABLE_SCHOLARSHIPS_TABLE ?? "Scholarships";
const UNIVERSITIES_TABLE = process.env.AIRTABLE_UNIVERSITIES_TABLE ?? "Universities";

const isAirtableConfigured = Boolean(AIRTABLE_API_KEY && AIRTABLE_BASE_ID);

interface AirtableRecord<TFields> {
  id: string;
  fields: TFields;
}

interface AirtableListResponse<TFields> {
  records: AirtableRecord<TFields>[];
  offset?: string;
}

async function fetchAllAirtableRecords<TFields>(table: string): Promise<AirtableRecord<TFields>[]> {
  const records: AirtableRecord<TFields>[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      // Always fetch fresh data — staff edits in Airtable should be
      // reflected on the very next assessment run, never a stale cache.
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Airtable request failed (${res.status}) for table "${table}"`);
    }

    const data = (await res.json()) as AirtableListResponse<TFields>;
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

/**
 * Maps a raw Airtable "Scholarships" record into the app's Scholarship type.
 * Field names here should match whatever the real Airtable base uses;
 * adjust the left-hand keys (not the Scholarship type itself) if the base
 * ends up using slightly different column names.
 */
function mapAirtableScholarship(record: AirtableRecord<Record<string, unknown>>): Scholarship {
  const f = record.fields;
  return {
    id: (f.id as string) ?? record.id,
    scholarship_name: (f.scholarship_name as string) ?? "",
    provider: (f.provider as string) ?? "",
    university_id: (f.university_id as string) ?? null,
    country: (f.country as string) ?? "",
    degree_level: (f.degree_level as Scholarship["degree_level"]) ?? [],
    academic_fields: (f.academic_fields as Scholarship["academic_fields"]) ?? "all",
    excluded_academic_fields: (f.excluded_academic_fields as Scholarship["excluded_academic_fields"]) ?? [],
    engineering_domains: (f.engineering_domains as Scholarship["engineering_domains"]) ?? null,
    nationality_eligibility: (f.nationality_eligibility as Scholarship["nationality_eligibility"]) ?? "conditional",
    excluded_nationalities: (f.excluded_nationalities as string[]) ?? [],
    minimum_gpa: (f.minimum_gpa as number) ?? null,
    minimum_percentage: (f.minimum_percentage as number) ?? null,
    english_requirement: (f.english_requirement as string) ?? null,
    standardized_test_requirement: (f.standardized_test_requirement as string) ?? null,
    work_experience_required_years: (f.work_experience_required_years as number) ?? null,
    work_experience_preferred: Boolean(f.work_experience_preferred),
    research_experience_required: Boolean(f.research_experience_required),
    research_experience_preferred: Boolean(f.research_experience_preferred),
    funding_type: (f.funding_type as Scholarship["funding_type"]) ?? "mixed",
    tuition_coverage: (f.tuition_coverage as string) ?? null,
    living_support: (f.living_support as string) ?? null,
    other_benefits: (f.other_benefits as string) ?? null,
    deadline: (f.deadline as string) ?? null,
    deadline_confirmed: Boolean(f.deadline_confirmed),
    application_opening_date: (f.application_opening_date as string) ?? null,
    intake: (f.intake as string) ?? null,
    official_scholarship_url: (f.official_scholarship_url as string) ?? null,
    official_university_url: (f.official_university_url as string) ?? null,
    verification_status: (f.verification_status as Scholarship["verification_status"]) ?? "AMBER",
    verification_notes: (f.verification_notes as string) ?? null,
    last_verified_date: (f.last_verified_date as string) ?? "",
    qs_2026: (f.qs_2026 as number) ?? null,
    the_2026: (f.the_2026 as number) ?? null,
    student_facing_description: (f.student_facing_description as string) ?? "",
  };
}

function mapAirtableUniversity(record: AirtableRecord<Record<string, unknown>>): University {
  const f = record.fields;
  return {
    id: (f.id as string) ?? record.id,
    university_name: (f.university_name as string) ?? "",
    country: (f.country as string) ?? "",
    city: (f.city as string) ?? null,
    qs_2026: (f.qs_2026 as number) ?? null,
    the_2026: (f.the_2026 as number) ?? null,
    official_url: (f.official_url as string) ?? null,
    partner_status: (f.partner_status as University["partner_status"]) ?? null,
    last_verified_date: (f.last_verified_date as string) ?? null,
  };
}

export async function getScholarships(): Promise<Scholarship[]> {
  if (!isAirtableConfigured) {
    return scholarshipsSeed as Scholarship[];
  }
  const records = await fetchAllAirtableRecords<Record<string, unknown>>(SCHOLARSHIPS_TABLE);
  return records.map(mapAirtableScholarship);
}

export async function getUniversities(): Promise<University[]> {
  if (!isAirtableConfigured) {
    return universitiesSeed as University[];
  }
  const records = await fetchAllAirtableRecords<Record<string, unknown>>(UNIVERSITIES_TABLE);
  return records.map(mapAirtableUniversity);
}

export const dataSourceStatus = isAirtableConfigured ? ("airtable" as const) : ("seed" as const);
