-- ============================================================================
-- FutureGrad Scholarship Finder — Supabase migration 0003
-- ============================================================================
-- Admin authorization. Deliberately separate from Supabase Auth's own
-- `auth.users` table — being able to sign in (authenticated) is NOT the
-- same as being authorized to manage scholarship data (admin). This
-- table is the single source of truth for the second question.
--
-- SECURITY MODEL:
--   - RLS is enabled with NO policies for anon or authenticated roles.
--     Nobody can read or write this table using a normal user's session,
--     no matter who they are — only the service_role key (used
--     exclusively server-side, see src/lib/adminAuth.ts) can query it.
--     This is intentional: a user should never be able to inspect the
--     admin list, add themselves to it, or infer who else is an admin,
--     even if their own account happens to legitimately be on it.
--   - This mirrors the same "zero permissive policies" posture as
--     scholarships/universities in migration 0001 — reasoning explained
--     there applies identically here, arguably more so given what this
--     table gates.
-- ============================================================================

create table admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

comment on table admin_users is 'Authorization allowlist for the /admin dashboard. A row here means that auth.users(id) is permitted to manage scholarship/university data — being present in auth.users alone (i.e., merely having signed in) is NOT sufficient. Populated manually by whoever operates the Supabase project (see README "First admin setup") — there is no self-service signup or promotion path, by design.';
comment on column admin_users.email is 'Denormalized copy of the auth user''s email, for readability when inspecting this table directly in the Supabase dashboard — the id column (a real foreign key) is what authorization checks actually use, not this column.';

create index idx_admin_users_email on admin_users (email);

alter table admin_users enable row level security;

-- No policies created for anon/authenticated on this table, matching
-- migration 0001's posture — see the security model note above. Only
-- service_role (which bypasses RLS by design) can read this table, and
-- only src/lib/adminAuth.ts's server-only isAdminUser() function does so.
