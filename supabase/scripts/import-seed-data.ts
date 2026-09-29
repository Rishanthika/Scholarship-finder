/**
 * Import the existing 40-record scholarship seed data (and 12-record
 * university seed data) into Supabase/Postgres, without retyping anything
 * by hand — this reads directly from src/data/*.seed.json, the same files
 * the app's seed-fallback path already uses.
 *
 * IDEMPOTENT: uses `upsert` keyed on the existing stable `id` column
 * (e.g. "FG-001"). Running this script any number of times converges on
 * the same 40 scholarship rows / 12 university rows — it never creates
 * duplicates, and re-running it after a seed-data correction updates the
 * existing row in place.
 *
 * Universities are imported first (scholarships.university_id has a
 * foreign-key reference to them).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx supabase/scripts/import-seed-data.ts
 *
 * Requires the SERVICE ROLE key (not the anon key) since RLS has no
 * permissive policies for any other role — see migration 0001's RLS
 * section.
 */

import { createClient } from "@supabase/supabase-js";
import scholarshipsSeed from "../../src/data/scholarships.seed.json";
import universitiesSeed from "../../src/data/universities.seed.json";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) must both be set in the environment.");
  console.error("Example: SUPABASE_URL=... SUPABASE_SECRET_KEY=... npx tsx supabase/scripts/import-seed-data.ts");
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function importUniversities() {
  console.log(`Importing ${universitiesSeed.length} universities...`);
  const { error, count } = await client
    .from("universities")
    .upsert(universitiesSeed, { onConflict: "id", count: "exact" });
  if (error) {
    throw new Error(`University import failed: ${error.message}`);
  }
  console.log(`Universities upserted: ${count ?? universitiesSeed.length}`);
}

async function importScholarships() {
  console.log(`Importing ${scholarshipsSeed.length} scholarships...`);
  const { error, count } = await client
    .from("scholarships")
    .upsert(scholarshipsSeed, { onConflict: "id", count: "exact" });
  if (error) {
    throw new Error(`Scholarship import failed: ${error.message}`);
  }
  console.log(`Scholarships upserted: ${count ?? scholarshipsSeed.length}`);
}

async function verify() {
  const { count: totalCount, error: totalErr } = await client
    .from("scholarships")
    .select("*", { count: "exact", head: true });
  if (totalErr) throw totalErr;

  const { count: greenCount, error: greenErr } = await client
    .from("scholarships")
    .select("*", { count: "exact", head: true })
    .eq("verification_status", "GREEN");
  if (greenErr) throw greenErr;

  const { count: amberCount, error: amberErr } = await client
    .from("scholarships")
    .select("*", { count: "exact", head: true })
    .eq("verification_status", "AMBER");
  if (amberErr) throw amberErr;

  const { count: redCount, error: redErr } = await client
    .from("scholarships")
    .select("*", { count: "exact", head: true })
    .eq("verification_status", "RED");
  if (redErr) throw redErr;

  console.log("\n--- Post-import verification ---");
  console.log(`Total scholarships: ${totalCount} (expected 40)`);
  console.log(`GREEN: ${greenCount} (expected 22)`);
  console.log(`AMBER: ${amberCount} (expected 16)`);
  console.log(`RED: ${redCount} (expected 2)`);

  if (totalCount !== 40 || greenCount !== 22 || amberCount !== 16 || redCount !== 2) {
    console.error("\n⚠ Counts do not match expected values — investigate before proceeding.");
    process.exitCode = 1;
  } else {
    console.log("\n✓ All counts match expected values.");
  }
}

async function main() {
  await importUniversities();
  await importScholarships();
  await verify();
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
