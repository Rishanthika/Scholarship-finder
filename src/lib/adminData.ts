import "server-only";
import { getServiceClient, isSupabaseConfigured } from "./supabaseClient";
import type { Scholarship, University, DegreeLevel, VerificationStatus, FundingType } from "@/types";

/**
 * Admin CRUD layer. Deliberately has NO seed-data fallback, unlike
 * src/lib/supabase.ts (the student-facing read adapter). Reasoning:
 * editing the checked-in JSON seed file from a running server process is
 * not a safe or persistent operation — writes would vanish on the next
 * deploy, and concurrent admin edits to a file aren't safely
 * serializable the way a real database's writes are. If Supabase isn't
 * configured, every function here throws a clear, typed error that the
 * API routes turn into a 503 with an actionable message, rather than
 * silently "succeeding" against a file that won't actually persist.
 */

export class AdminDataUnavailableError extends Error {
  constructor() {
    super("Supabase is not configured — admin editing requires a live database connection (SUPABASE_URL and SUPABASE_SECRET_KEY). There is no seed-data fallback for admin writes.");
    this.name = "AdminDataUnavailableError";
  }
}

function requireClient() {
  const client = getServiceClient();
  if (!client) throw new AdminDataUnavailableError();
  return client;
}

export { isSupabaseConfigured };

// ---------------------------------------------------------------------------
// Query option types
// ---------------------------------------------------------------------------

export interface ScholarshipListFilters {
  search?: string; // matches scholarship_name, provider, or country (ILIKE)
  country?: string;
  degreeLevel?: DegreeLevel;
  fundingType?: FundingType;
  verificationStatus?: VerificationStatus;
  includeArchived?: boolean; // default false
  sort?: "updated_desc" | "updated_asc" | "deadline" | "name" | "university" | "status";
  page?: number; // 1-indexed
  pageSize?: number;
}

export interface ScholarshipListResult {
  records: Scholarship[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listScholarships(filters: ScholarshipListFilters = {}): Promise<ScholarshipListResult> {
  const client = requireClient();
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 25;

  let query = client.from("scholarships").select("*", { count: "exact" });

  if (!filters.includeArchived) {
    query = query.is("archived_at", null);
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(`scholarship_name.ilike.${term},provider.ilike.${term},country.ilike.${term}`);
  }
  if (filters.country) query = query.eq("country", filters.country);
  if (filters.fundingType) query = query.eq("funding_type", filters.fundingType);
  if (filters.verificationStatus) query = query.eq("verification_status", filters.verificationStatus);
  if (filters.degreeLevel) query = query.contains("degree_level", [filters.degreeLevel]);

  switch (filters.sort) {
    case "updated_asc":
      query = query.order("updated_at", { ascending: true });
      break;
    case "deadline":
      query = query.order("deadline", { ascending: true, nullsFirst: false });
      break;
    case "name":
      query = query.order("scholarship_name", { ascending: true });
      break;
    case "university":
      query = query.order("university_id", { ascending: true, nullsFirst: false });
      break;
    case "status":
      query = query.order("verification_status", { ascending: true });
      break;
    case "updated_desc":
    default:
      query = query.order("updated_at", { ascending: false });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return { records: (data ?? []) as Scholarship[], total: count ?? 0, page, pageSize };
}

export async function getScholarshipById(id: string): Promise<Scholarship | null> {
  const client = requireClient();
  const { data, error } = await client.from("scholarships").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Scholarship) ?? null;
}

export async function createScholarship(input: Partial<Scholarship>): Promise<Scholarship> {
  const client = requireClient();
  const { data, error } = await client.from("scholarships").insert(input).select("*").single();
  if (error) throw error;
  return data as Scholarship;
}

export async function updateScholarship(id: string, patch: Partial<Scholarship>): Promise<Scholarship> {
  const client = requireClient();
  const { data, error } = await client.from("scholarships").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Scholarship;
}

export async function archiveScholarship(id: string, archived: boolean): Promise<Scholarship> {
  return updateScholarship(id, { archived_at: archived ? new Date().toISOString() : null });
}

// ---------------------------------------------------------------------------
// Universities
// ---------------------------------------------------------------------------

export interface UniversityListFilters {
  search?: string; // matches university_name or country
  includeArchived?: boolean;
}

export async function listUniversities(filters: UniversityListFilters = {}): Promise<University[]> {
  const client = requireClient();
  let query = client.from("universities").select("*").order("university_name", { ascending: true });
  if (!filters.includeArchived) query = query.is("archived_at", null);
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(`university_name.ilike.${term},country.ilike.${term}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as University[];
}

export async function getUniversityById(id: string): Promise<University | null> {
  const client = requireClient();
  const { data, error } = await client.from("universities").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as University) ?? null;
}

export async function createUniversity(input: Partial<University>): Promise<University> {
  const client = requireClient();
  const { data, error } = await client.from("universities").insert(input).select("*").single();
  if (error) throw error;
  return data as University;
}

export async function updateUniversity(id: string, patch: Partial<University>): Promise<University> {
  const client = requireClient();
  const { data, error } = await client.from("universities").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as University;
}

export async function countScholarshipsForUniversity(universityId: string): Promise<number> {
  const client = requireClient();
  const { count, error } = await client
    .from("scholarships")
    .select("*", { count: "exact", head: true })
    .eq("university_id", universityId);
  if (error) throw error;
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Dashboard aggregate stats — every number here comes from a real query,
// never a hardcoded/invented figure.
// ---------------------------------------------------------------------------

export interface DashboardStats {
  total: number;
  green: number;
  amber: number;
  red: number;
  universityCount: number;
  upcomingDeadlines: Scholarship[]; // next 5, confirmed + future only
  recentlyUpdated: Scholarship[]; // last 5 by updated_at
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const client = requireClient();

  const countFor = async (status?: VerificationStatus) => {
    let q = client.from("scholarships").select("*", { count: "exact", head: true }).is("archived_at", null);
    if (status) q = q.eq("verification_status", status);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  };

  const [total, green, amber, red, universityCountResult, upcomingResult, recentResult] = await Promise.all([
    countFor(),
    countFor("GREEN"),
    countFor("AMBER"),
    countFor("RED"),
    client.from("universities").select("*", { count: "exact", head: true }).is("archived_at", null),
    client
      .from("scholarships")
      .select("*")
      .is("archived_at", null)
      .eq("deadline_confirmed", true)
      .gte("deadline", new Date().toISOString().slice(0, 10))
      .order("deadline", { ascending: true })
      .limit(5),
    client.from("scholarships").select("*").is("archived_at", null).order("updated_at", { ascending: false }).limit(5),
  ]);

  if (universityCountResult.error) throw universityCountResult.error;
  if (upcomingResult.error) throw upcomingResult.error;
  if (recentResult.error) throw recentResult.error;

  return {
    total,
    green,
    amber,
    red,
    universityCount: universityCountResult.count ?? 0,
    upcomingDeadlines: (upcomingResult.data ?? []) as Scholarship[],
    recentlyUpdated: (recentResult.data ?? []) as Scholarship[],
  };
}
