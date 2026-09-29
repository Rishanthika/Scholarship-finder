import { NextRequest, NextResponse } from "next/server";
import {
  listScholarships,
  createScholarship,
  listUniversities,
  AdminDataUnavailableError,
} from "@/lib/adminData";
import { validateScholarship, isScholarshipValid, DEFAULT_NEW_SCHOLARSHIP_STATUS } from "@/lib/adminValidation";
import { requireAdmin } from "@/lib/adminAuth";
import type { DegreeLevel, FundingType, VerificationStatus } from "@/types";

/**
 * GET /api/admin/scholarships?search=&country=&degreeLevel=&fundingType=&verificationStatus=&sort=&page=&pageSize=
 * POST /api/admin/scholarships  (create)
 *
 * Both require an authenticated admin session (src/lib/adminAuth.ts).
 * This check is re-verified here independently of anything the
 * frontend or middleware already decided — see that file's comments.
 */

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  try {
    const result = await listScholarships({
      search: searchParams.get("search") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      degreeLevel: (searchParams.get("degreeLevel") as DegreeLevel) ?? undefined,
      fundingType: (searchParams.get("fundingType") as FundingType) ?? undefined,
      verificationStatus: (searchParams.get("verificationStatus") as VerificationStatus) ?? undefined,
      includeArchived: searchParams.get("includeArchived") === "true",
      sort: (searchParams.get("sort") as never) ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AdminDataUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("GET /api/admin/scholarships failed:", err);
    return NextResponse.json({ error: "Unable to load scholarship records." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const universities = await listUniversities({ includeArchived: true });
    const knownUniversityIds = universities.map((u) => u.id);

    const input = body as Record<string, unknown>;

    // The `id` column is a plain text primary key with no database
    // default — the existing 40 records use human-assigned IDs (e.g.
    // "FG-009"), but nothing generates one for a brand-new admin-created
    // record. Slugify the scholarship name and append a short random
    // suffix to guarantee uniqueness without colliding with the existing
    // FG-* numbering scheme. (Found via live testing against a real
    // database — the first attempt failed with a NOT NULL constraint
    // violation on `id`, since nothing upstream had ever supplied one.)
    const slugBase = String(input.scholarship_name ?? "scholarship")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    const generatedId = input.id ?? `${slugBase || "scholarship"}-${Math.random().toString(36).slice(2, 8)}`;

    const withDefaults = {
      ...input,
      id: generatedId,
      verification_status: input.verification_status ?? DEFAULT_NEW_SCHOLARSHIP_STATUS,
      academic_fields: input.academic_fields ?? "all",
      // "conditional" (not "yes") is the honest default — an admin who
      // hasn't explicitly set this hasn't confirmed India eligibility
      // either way, and defaulting to "yes" would risk exactly the kind
      // of false-positive nationality match this whole project has
      // repeatedly had to guard against (see SISGP/ADB-JSP history).
      nationality_eligibility: input.nationality_eligibility ?? "conditional",
      last_verified_date: input.last_verified_date ?? new Date().toISOString().slice(0, 10),
      excluded_academic_fields: input.excluded_academic_fields ?? [],
      excluded_nationalities: input.excluded_nationalities ?? [],
      work_experience_preferred: input.work_experience_preferred ?? false,
      research_experience_required: input.research_experience_required ?? false,
      research_experience_preferred: input.research_experience_preferred ?? false,
      deadline_confirmed: input.deadline_confirmed ?? false,
      student_facing_description: input.student_facing_description ?? "",
    } as unknown as Partial<import("@/types").Scholarship>;

    const errors = validateScholarship(withDefaults, { isUpdate: false, knownUniversityIds });
    if (!isScholarshipValid(errors)) {
      return NextResponse.json({ error: "Validation failed", fieldErrors: errors }, { status: 400 });
    }

    const created = await createScholarship(withDefaults);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof AdminDataUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("POST /api/admin/scholarships failed:", err);
    return NextResponse.json({ error: "Unable to save scholarship. Please try again." }, { status: 500 });
  }
}
