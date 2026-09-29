import { NextRequest, NextResponse } from "next/server";
import { getUniversityById, updateUniversity, listScholarships, AdminDataUnavailableError } from "@/lib/adminData";
import { validateUniversity, isUniversityValid } from "@/lib/adminValidation";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const record = await getUniversityById(params.id);
    if (!record) return NextResponse.json({ error: "University not found." }, { status: 404 });
    const { records: relatedScholarships } = await listScholarships({ includeArchived: true, pageSize: 100 });
    return NextResponse.json({
      ...record,
      relatedScholarships: relatedScholarships.filter((s) => s.university_id === params.id),
    });
  } catch (err) {
    if (err instanceof AdminDataUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error(`GET /api/admin/universities/${params.id} failed:`, err);
    return NextResponse.json({ error: "Unable to load university record." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const existing = await getUniversityById(params.id);
    if (!existing) return NextResponse.json({ error: "University not found." }, { status: 404 });

    const patch = body as Record<string, unknown>;
    const merged = { ...existing, ...patch };
    const errors = validateUniversity(merged);
    if (!isUniversityValid(errors)) {
      return NextResponse.json({ error: "Validation failed", fieldErrors: errors }, { status: 400 });
    }

    const updated = await updateUniversity(params.id, patch);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof AdminDataUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error(`PATCH /api/admin/universities/${params.id} failed:`, err);
    return NextResponse.json({ error: "Unable to save university. Please try again." }, { status: 500 });
  }
}
