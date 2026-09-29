-- ============================================================================
-- FutureGrad Scholarship Finder — Supabase migration 0001
-- ============================================================================
-- Reproduces the EXACT schema already defined in src/types/index.ts:
--   - Scholarship: 35 fields (see audit note in the accompanying README —
--     an earlier planning-phase spec referenced 50 fields, but the schema
--     actually implemented in code, and reproduced here, has 35)
--   - University: 9 fields
--
-- No field is simplified, renamed, or dropped. Field names match the
-- TypeScript interface exactly so the mapping layer (src/lib/supabase.ts)
-- is a near 1:1 pass-through.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUM types — mirror the TypeScript union types exactly (stronger than
-- leaving these as free text, and exactly what the matching engine already
-- assumes is a closed set).
-- ----------------------------------------------------------------------------

create type degree_level_enum as enum (
  'undergraduate', 'masters', 'phd', 'postdoctoral', 'research', 'multiple'
);

create type verification_status_enum as enum ('GREEN', 'AMBER', 'RED');

create type funding_type_enum as enum (
  'fully_funded', 'full_tuition', 'partial_tuition', 'tuition_waiver',
  'stipend', 'merit', 'need_based', 'research_funding', 'mixed'
);

create type indian_eligibility_enum as enum ('yes', 'no', 'conditional');

create type partner_status_enum as enum ('FutureGrad Partner', 'Informational Only');

-- ----------------------------------------------------------------------------
-- universities — 9 fields, exact match to the University TS interface.
-- Created first since scholarships.university_id references it.
-- ----------------------------------------------------------------------------

create table universities (
  id                  text primary key,
  university_name     text not null,
  country             text not null,
  city                text,
  qs_2026             integer,
  the_2026            integer,
  official_url        text,
  partner_status      partner_status_enum,
  last_verified_date  text, -- free text in existing data (e.g. "2026-09-01"); kept as-is, not forced to DATE

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table universities is 'University lookup table — rankings and partner status kept separate from scholarships, mirroring the app''s existing design rationale (see product architecture doc: rankings have their own update cadence).';

-- ----------------------------------------------------------------------------
-- scholarships — 35 fields, exact match to the Scholarship TS interface.
--
-- Design note on academic_fields / engineering_domains: both are
-- polymorphic in the app ("all" | an array of enum strings | null for
-- engineering_domains). Rather than lossily normalizing this into two
-- separate columns (a boolean "is_all" flag + an array), these are stored
-- as JSONB so the exact union value round-trips without any information
-- loss — a JSONB value of the string "all" or a JSON array are both
-- represented faithfully.
-- ----------------------------------------------------------------------------

create table scholarships (
  id                                text primary key,                    -- e.g. "FG-001" — the existing stable ID, used as the idempotent import key
  scholarship_name                  text not null,
  provider                          text not null,
  university_id                     text references universities(id),    -- null for government/non-university-specific scholarships
  country                           text not null,

  degree_level                      degree_level_enum[] not null,        -- most records are single-value; some (e.g. DAAD EPOS) list two

  academic_fields                   jsonb not null,                      -- "all" | AcademicField[] — see design note above
  excluded_academic_fields          text[] not null default '{}',        -- e.g. ["engineering","computer_science_technology"] for Trinity

  engineering_domains               jsonb,                               -- "all" | EngineeringDomain[] | null (null = not engineering-relevant at all)

  nationality_eligibility           indian_eligibility_enum not null,
  excluded_nationalities            text[] not null default '{}',        -- e.g. ["China"] for Trinity Global Excellence

  minimum_gpa                       numeric,
  minimum_percentage                numeric,
  english_requirement               text,
  standardized_test_requirement     text,

  work_experience_required_years    numeric,                             -- null = not mandatory
  work_experience_preferred         boolean not null default false,
  research_experience_required      boolean not null default false,
  research_experience_preferred     boolean not null default false,

  funding_type                      funding_type_enum not null,
  tuition_coverage                  text,                                -- display string, e.g. "100%", "£5,000"
  living_support                    text,
  other_benefits                    text,

  deadline                          date,                                -- real ISO dates in all current records; null = unconfirmed
  deadline_confirmed                boolean not null default false,      -- false = "Next cycle not yet confirmed"
  application_opening_date          text,                                -- free text in existing data (e.g. "1 June", "2026 (early)") — kept as TEXT, not DATE
  intake                            text,                                -- free text (e.g. "2027", "Spring 2027", "Ongoing by semester")

  official_scholarship_url          text,
  official_university_url          text,

  verification_status               verification_status_enum not null,
  verification_notes                text,                                -- shown verbatim as the AMBER caveat
  last_verified_date                text not null,                       -- free text in existing data (e.g. "13 Aug 2026") — kept as TEXT

  qs_2026                            integer,                             -- denormalized copy for display convenience, mirrors the app's own comment in types/index.ts
  the_2026                           integer,

  student_facing_description        text not null default '',

  created_at                         timestamptz not null default now(),
  updated_at                         timestamptz not null default now()
);

comment on table scholarships is 'Full scholarship/funding record set, including RED (do-not-surface) records retained for audit purposes. The application-layer matching engine is solely responsible for excluding RED from student-facing results — this table intentionally does not hide them at the database level, since admins need to see and manage them.';
comment on column scholarships.id is 'Stable business key (e.g. "FG-009"), used as the idempotent upsert target by the import script — never regenerate or reuse an ID for a different scholarship.';

-- ----------------------------------------------------------------------------
-- Indexes — per the fields the matching engine (src/lib/matchingEngine.ts)
-- actually filters/sorts on. `id` is already indexed via the primary key.
-- ----------------------------------------------------------------------------

create index idx_scholarships_country              on scholarships (country);
create index idx_scholarships_university_id        on scholarships (university_id);
create index idx_scholarships_degree_level          on scholarships using gin (degree_level);
create index idx_scholarships_funding_type          on scholarships (funding_type);
create index idx_scholarships_verification_status   on scholarships (verification_status);
create index idx_scholarships_deadline              on scholarships (deadline);
create index idx_scholarships_engineering_domains   on scholarships using gin (engineering_domains jsonb_path_ops);
create index idx_scholarships_academic_fields       on scholarships using gin (academic_fields jsonb_path_ops);

create index idx_universities_country               on universities (country);

-- A composite index on the single most common hot-path filter combination
-- (hard filters check verification_status != RED and country together far
-- more often than either alone) — kept in addition to, not instead of, the
-- individual indexes above, since queries also filter on each independently.
create index idx_scholarships_status_country on scholarships (verification_status, country);

-- ----------------------------------------------------------------------------
-- updated_at auto-maintenance — future admin edits (e.g. flipping AMBER to
-- GREEN once confirmed) should update this automatically, not rely on the
-- editor remembering to set it.
-- ----------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_scholarships_updated_at
  before update on scholarships
  for each row execute function set_updated_at();

create trigger trg_universities_updated_at
  before update on universities
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security — deliberately restrictive.
--
-- The Next.js app fetches data server-side ONLY (src/lib/supabase.ts is
-- marked "server-only", mirroring the existing src/lib/airtable.ts
-- pattern) using the Supabase SERVICE ROLE key, which bypasses RLS
-- entirely by design in Supabase/Postgres. That means no policy below is
-- required for the application itself to function.
--
-- RLS is still enabled and no permissive policies are added for anon or
-- authenticated roles, specifically so that:
--   (a) the tables are NOT publicly writable — there is no INSERT/UPDATE/
--       DELETE policy for anon/authenticated, so even if someone obtained
--       the public anon key, they could not modify scholarship data.
--   (b) the tables are NOT publicly readable via the anon key either,
--       by default — this is the more conservative posture the brief
--       asked for ("do not expose... for unrestricted writes" plus
--       "deliberately" adding RLS). If a future phase wants students'
--       browsers to query Supabase directly (bypassing the Next.js API),
--       a narrow read-only SELECT policy can be added then — deliberately
--       deferred rather than granted now "just in case".
-- ----------------------------------------------------------------------------

alter table scholarships enable row level security;
alter table universities enable row level security;

-- No policies are created for anon/authenticated on either table.
-- Only the service_role (used exclusively server-side) can read or write,
-- since service_role bypasses RLS by default in Supabase.

-- If/when a future phase needs public read access (e.g. a public API),
-- add a policy explicitly rather than relaxing this migration, e.g.:
--   create policy "Public read access" on scholarships
--     for select using (verification_status != 'RED');
-- (Note: even then, RED should stay filtered out at the RLS layer too,
-- not just in application code — defense in depth.)
