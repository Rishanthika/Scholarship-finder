import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

/**
 * Reads the caller's Supabase Auth session from cookies and returns the
 * authenticated user, or null if there is no valid session.
 *
 * IMPORTANT: this uses the PUBLIC anon/publishable key, not the secret
 * key — session verification is exactly what the anon key is for
 * (Supabase's client library validates/refreshes the session token
 * itself; it does not need elevated privileges to do this). This is the
 * officially recommended pattern for Supabase Auth + Next.js App
 * Router, used instead of hand-rolling JWT verification, since it
 * transparently handles whichever signing scheme the project's Auth
 * server actually uses.
 *
 * Used from Route Handlers (API routes) via getAuthenticatedUserFromRequest.
 * Middleware has its own analogous setup in src/middleware.ts, since
 * middleware needs to read AND write refreshed cookies onto the
 * response, which Route Handlers don't.
 */
export async function getAuthenticatedUserFromRequest(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {
        // Route Handlers don't need to persist refreshed cookies back —
        // middleware (src/middleware.ts) already handles session refresh
        // on every navigation. A no-op here is correct, not a shortcut.
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/** Same as above, but for middleware, where refreshed cookies DO need to
 * be written back onto the response for the session to stay alive. */
export function createMiddlewareSupabaseClient(req: NextRequest, res: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
}
