import "server-only";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServiceClient } from "./supabaseClient";
import { getAuthenticatedUserFromRequest } from "./supabaseServerClient";

export interface AdminUser {
  id: string;
  email: string;
}

/**
 * Checks the admin_users allowlist (migration 0003) for a given user ID.
 * Deliberately a separate, small, pure-ish function (only dependency is
 * the service-role client) so it can be unit-tested against a real
 * database independent of whatever authentication mechanism produced
 * the user ID — see adminAuth.test.ts.
 */
export async function isAdminUser(userId: string): Promise<boolean> {
  const client = getServiceClient();
  if (!client) {
    // No Supabase configured at all -> cannot possibly be an admin.
    // Fails closed, never open.
    return false;
  }
  const { data, error } = await client.from("admin_users").select("id").eq("id", userId).maybeSingle();
  if (error) {
    console.error("isAdminUser query failed:", error);
    return false; // fail closed on error, never assume admin
  }
  return data !== null;
}

export type RequireAdminResult = { ok: true; user: AdminUser } | { ok: false; response: NextResponse };

/**
 * The single function every admin API route calls first. Two
 * independent checks, each fails closed:
 *   1. Is there a valid Supabase Auth session at all? -> 401 if not.
 *   2. Is that authenticated user's ID in admin_users? -> 403 if not.
 *
 * This function has NO knowledge of whatever the frontend/middleware
 * already decided — it re-verifies from scratch on every call, per the
 * brief's explicit "do not rely only on frontend route protection"
 * requirement.
 */
export async function requireAdmin(req: NextRequest): Promise<RequireAdminResult> {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user || !user.email) {
    return { ok: false, response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  const admin = await isAdminUser(user.id);
  if (!admin) {
    return { ok: false, response: NextResponse.json({ error: "You are not authorized to access this resource." }, { status: 403 }) };
  }

  return { ok: true, user: { id: user.id, email: user.email } };
}
