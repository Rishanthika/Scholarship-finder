import { NextRequest, NextResponse } from "next/server";
import { getScholarshipById, updateScholarship, archiveScholarship, listUniversities, AdminDataUnavailableError } from "@/lib/adminData";
import { validateScholarship, isScholarshipValid } from "@/lib/adminValidation";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const record = await getScholarshipById(params.id);
    if (!record) return NextResponse.json({ error: "Scholarship not found." }, { status: 404 });
    return NextResponse.json(record);
  } catch (err) {
    if (err instanceof AdminDataUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error(`GET /api/admin/scholarships/${params.id} failed:`, err);
    return NextResponse.json({ error: "Unable to load scholarship record." }, { status: 500 });
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
    const existing = await getScholarshipById(params.id);
    if (!existing) return NextResponse.json({ error: "Scholarship not found." }, { status: 404 });

    const patch = body as Record<string, unknown>;

    // Archiving is a distinct action from a normal field edit — no other
    // validation applies (an archived record doesn't need to still pass
    // "is this a well-formed publishable record" checks).
    if (typeof patch.archived === "boolean" && Object.keys(patch).length === 1) {
      const archived = await archiveScholarship(params.id, patch.archived);
      return NextResponse.json(archived);
    }

    const universities = await listUniversities({ includeArchived: true });
    const knownUniversityIds = universities.map((u) => u.id);

    // Validate against the MERGED record (existing + patch) so partial
    // updates (e.g. only changing the deadline) don't spuriously fail
    // required-field checks for fields the caller didn't touch.
    const merged = { ...existing, ...patch };

    const errors = validateScholarship(merged, {
      isUpdate: true,
      existingStatus: existing.verification_status,
      knownUniversityIds,
    });
    if (!isScholarshipValid(errors)) {
      return NextResponse.json({ error: "Validation failed", fieldErrors: errors }, { status: 400 });
    }

    // statusChangeConfirmed is a request-only flag, never persisted.
    const { statusChangeConfirmed: _ignored, ...persistablePatch } = patch as Record<string, unknown> & {
      statusChangeConfirmed?: boolean;
    };

    const updated = await updateScholarship(params.id, persistablePatch);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof AdminDataUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error(`PATCH /api/admin/scholarships/${params.id} failed:`, err);
    return NextResponse.json({ error: "Unable to save scholarship. Please try again." }, { status: 500 });
  }
}
