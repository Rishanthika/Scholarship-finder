import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/lead
 *
 * MVP behavior: validates and logs the lead server-side only.
 *
 * NOT YET IMPLEMENTED (intentionally, per the build brief — "do not break
 * the application with an unfinished CRM integration"): forwarding this
 * payload to Privyr and creating a SmartTask follow-up. When ready, that
 * integration goes here — call Privyr's API (or a Zapier/Make webhook)
 * with { name, contact, email, matchedScholarshipIds, submittedAt }.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string" || typeof b.contact !== "string") {
    return NextResponse.json({ error: "Name and contact are required" }, { status: 400 });
  }

  // Server-side log only for MVP — replace with a real CRM/DB write when
  // the Privyr/SmartTask integration is built.
  console.log("New Scholarship Finder lead:", {
    name: b.name,
    contact: b.contact,
    email: b.email ?? null,
    matchedScholarshipIds: b.matchedScholarshipIds ?? [],
    submittedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
