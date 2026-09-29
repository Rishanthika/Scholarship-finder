import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single shared Supabase client factory. Both src/lib/supabase.ts (the
 * read-only, seed-fallback adapter used by student matching) and
 * src/lib/adminData.ts (the admin CRUD layer, no fallback) use this —
 * per this phase's explicit instruction not to create a second database
 * layer. There is exactly one place the URL/key env vars are read and
 * exactly one place the client is constructed.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
// Supabase's newer short key format (SUPABASE_SECRET_KEY, e.g.
// "sb_secret_...") is checked first; the legacy long-JWT
// SUPABASE_SERVICE_ROLE_KEY name is a fallback for older projects.
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_SECRET_KEY);

let cachedClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!cachedClient) {
    cachedClient = createClient(SUPABASE_URL as string, SUPABASE_SECRET_KEY as string, {
      auth: { persistSession: false },
    });
  }
  return cachedClient;
}
