import { createBrowserClient } from "@supabase/ssr";

/**
 * Client-side Supabase client — used ONLY for auth.signInWithPassword()
 * and auth.signOut() on the login page and in AdminLayout's logout
 * button. This uses the PUBLIC anon/publishable key, which is safe to
 * ship to the browser by design (it has no privileges beyond what RLS
 * grants — and per migration 0001/0003, that's currently nothing at all
 * for scholarships/universities/admin_users; it can only be used to
 * authenticate).
 *
 * This file is intentionally the ONLY place in the codebase that
 * constructs a Supabase client with the public key for auth purposes.
 * It must never import or reference SUPABASE_SECRET_KEY /
 * SUPABASE_SERVICE_ROLE_KEY — those stay in src/lib/supabaseClient.ts,
 * which is marked "server-only" and cannot be imported here.
 */
export function getBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be set for admin login to work."
    );
  }

  return createBrowserClient(url, key);
}
