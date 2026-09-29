import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const result = await requireAdmin(req);
  if (!result.ok) return result.response;
  return NextResponse.json({ user: result.user });
}
