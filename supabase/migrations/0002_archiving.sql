-- ============================================================================
-- FutureGrad Scholarship Finder — Supabase migration 0002
-- ============================================================================
-- Adds soft-delete/archive support for the admin dashboard.
--
-- WHY A NEW FILE, NOT AN EDIT TO 0001: per this phase's explicit
-- instruction, additive schema changes get their own migration rather
-- than mutating one that may have already been run against a real
-- database (0001 was already applied and validated in a prior phase).
--
-- WHY THIS FIELD SPECIFICALLY: the admin brief calls for an "Archive"
-- action instead of permanent deletion ("Do NOT permanently delete
-- records by default"). `created_at`/`updated_at` already exist from
-- migration 0001 — this migration was checked against that first and
-- does not duplicate them. `last_verified_date` also already exists
-- (as a free-text field, since real verification dates in the seed data
-- aren't always ISO-clean — see 0001's comments) so no separate
-- `last_verified_at` is added here either, per this phase's explicit
-- instruction to check for an equivalent field first.
-- ============================================================================

alter table scholarships add column archived_at timestamptz;
alter table universities add column archived_at timestamptz;

comment on column scholarships.archived_at is 'Soft-delete marker. NULL = active. Set to the archive timestamp when a staff member archives a record instead of deleting it. The matching engine does not currently filter on this column — see README §"Admin dashboard" for the follow-up needed to exclude archived records from student results.';
comment on column universities.archived_at is 'Soft-delete marker, same semantics as scholarships.archived_at.';

-- Index for the admin list view's default "active only" filter.
create index idx_scholarships_archived_at on scholarships (archived_at);
create index idx_universities_archived_at on universities (archived_at);
