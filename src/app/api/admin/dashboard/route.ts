import { NextRequest, NextResponse } from "next/server";
import { getDashboardStats, AdminDataUnavailableError } from "@/lib/adminData";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (err) {
    if (err instanceof AdminDataUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("GET /api/admin/dashboard failed:", err);
    return NextResponse.json({ error: "Unable to load dashboard statistics." }, { status: 500 });
  }
}
