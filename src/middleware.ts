import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareSupabaseClient } from "./lib/supabaseServerClient";

/**
 * Coarse-grained protection: is there a valid Supabase Auth session at
 * all? If not, redirect to /admin/login before the page ever renders.
 *
 * This is deliberately NOT where the admin_users (authorization) check
 * happens — Next.js Edge Middleware is not the right place for a
 * service-role database query (it's meant to stay fast and avoid
 * Node-only APIs), and more importantly, the brief requires every admin
 * API route to independently re-verify both authentication AND
 * authorization regardless of what middleware already decided. The
 * authorization check (is this authenticated user actually an admin?)
 * lives in src/lib/adminAuth.ts's requireAdmin(), called from:
 *   - every /api/admin/* route (defense in depth, explicitly required)
 *   - /api/admin/me, which AdminLayout calls on mount to decide whether
 *     to render the dashboard or an "Access Denied" screen for a
 *     logged-in-but-not-admin user (middleware alone can't distinguish
 *     these two cases without the database check it deliberately
 *     doesn't do here).
 */
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient(req, res);

  // No Supabase configured at all -> cannot authenticate anyone -> fail
  // closed by redirecting to login (which will itself show a clear
  // "Supabase not configured" state rather than a silent dead end).
  if (!supabase) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return res;
}

export const config = {
  // Only ever runs for /admin/* — the student-facing app ("/", "/api/match",
  // "/api/lead") and all non-admin API routes are completely untouched by
  // this middleware and remain publicly accessible exactly as before.
  matcher: ["/admin/:path*"],
};
