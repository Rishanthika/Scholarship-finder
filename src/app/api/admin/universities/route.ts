import { NextRequest, NextResponse } from "next/server";
import { listUniversities, createUniversity, countScholarshipsForUniversity, AdminDataUnavailableError } from "@/lib/adminData";
import { validateUniversity, isUniversityValid } from "@/lib/adminValidation";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  try {
    const universities = await listUniversities({ search: searchParams.get("search") ?? undefined });
    const withCounts = await Promise.all(
      universities.map(async (u) => ({ ...u, scholarshipCount: await countScholarshipsForUniversity(u.id) }))
    );
    return NextResponse.json({ records: withCounts });
  } catch (err) {
    if (err instanceof AdminDataUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("GET /api/admin/universities failed:", err);
    return NextResponse.json({ error: "Unable to load university records." }, { status: 500 });
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

  const input = body as Record<string, unknown>;
  const errors = validateUniversity(input);
  if (!isUniversityValid(errors)) {
    return NextResponse.json({ error: "Validation failed", fieldErrors: errors }, { status: 400 });
  }

  // Same id-generation gap as scholarships (see that route's comment) —
  // universities.id is also a plain text primary key with no default.
  const slugBase = String(input.university_name ?? "university")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const withId = { ...input, id: input.id ?? `uni_${slugBase || "university"}_${Math.random().toString(36).slice(2, 8)}` } as unknown as Partial<
    import("@/types").University
  >;

  try {
    const created = await createUniversity(withId);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof AdminDataUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("POST /api/admin/universities failed:", err);
    return NextResponse.json({ error: "Unable to save university. Please try again." }, { status: 500 });
  }
}
