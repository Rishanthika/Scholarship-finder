# FutureGrad Scholarship Finder — MVP

A standalone scholarship-matching application for FutureGrad, built against the finalized 40-record verified database and matching-engine specification produced earlier in this project. This README doubles as the Phase 30 "final output" deliverable.

---

## 1. What was built

A complete, working Next.js application implementing:
- The 6-step student assessment (exact questions from the finalized questionnaire)
- Server-side hard-filter + 100-point scoring matching engine (no redesign — a direct implementation of the finalized spec)
- Results page with GREEN/AMBER handling, filtering, sorting
- Scholarship detail page with the full disclaimer and official-link CTA hierarchy
- Post-results lead capture (UI + API route; CRM wiring intentionally not built yet, see §12)
- Basic analytics event hooks (console-logged; provider not yet chosen)
- An Airtable data adapter that **currently runs on local seed data** and will switch to live Airtable automatically the moment credentials are supplied — zero code changes required

**This is a functional MVP, not a mockup.** It has a passing automated test suite and a clean production build (`npm run build` succeeds; verified in this session).

## 2. Files created

```
futuregrad-scholarship-finder/
├── src/
│   ├── types/index.ts                  # All TypeScript types (StudentProfile, Scholarship, University, MatchResult, etc.)
│   ├── data/
│   │   ├── scholarships.seed.json      # All 40 master-database records, converted to the app's schema
│   │   └── universities.seed.json      # University lookup table (QS/THE ranks, kept separate per spec)
│   ├── lib/
│   │   ├── airtable.ts                 # Data-access layer — Airtable with automatic seed-data fallback
│   │   ├── matchingEngine.ts           # Hard filters + scoring + explanations (the core logic)
│   │   ├── matchingEngine.test.ts      # Automated tests (12 tests, all passing — see §9)
│   │   ├── options.ts                  # UI option lists / labels for every enum
│   │   └── analytics.ts                # track() event helper
│   ├── components/
│   │   ├── LandingScreen.tsx
│   │   ├── AssessmentFlow.tsx           # The 6-step wizard
│   │   ├── AssessmentStep.tsx           # Reusable step wrapper (progress bar, back/next)
│   │   ├── Question.tsx                 # RadioCardQuestion, CheckboxListQuestion, NumberInputQuestion
│   │   ├── ProgressBar.tsx
│   │   ├── LoadingState.tsx
│   │   ├── ResultsScreen.tsx
│   │   ├── ScholarshipCard.tsx
│   │   ├── ScholarshipDetail.tsx
│   │   ├── MatchBadge.tsx
│   │   ├── FundingBadge.tsx
│   │   ├── FilterBar.tsx
│   │   ├── EmptyState.tsx
│   │   └── LeadCaptureCard.tsx
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx                     # Orchestrates landing → assessment → loading → results → detail
│       ├── globals.css                  # Brand color/font variables (placeholders — see §6)
│       └── api/
│           ├── match/route.ts           # POST — the only place scoring runs
│           └── lead/route.ts            # POST — lead capture (logs only, see §12)
├── package.json, tsconfig.json, tailwind.config.ts, postcss.config.js, next.config.js
├── vitest.config.ts
├── .env.example
└── README.md (this file)
```

No files were modified that didn't need to be — this was a greenfield build (see the Current Project Audit given at the start of this phase).

## 3. Database structure (implemented)

**As of the Supabase migration phase, this is now a real Postgres schema, not just an Airtable plan.** Two tables — `scholarships` (35 fields, exact match to `Scholarship` in `src/types/index.ts` — see the audit note in §3a below) and `universities` (9 fields). Country/Funding/Verification remain columns on `scholarships`, not separate tables, for the same reasoning as before: they have no independent lifecycle worth normalizing.

### 3a. Supabase/Postgres migration

- **Migration file:** `supabase/migrations/0001_init.sql` — creates 5 Postgres ENUM types (`degree_level_enum`, `verification_status_enum`, `funding_type_enum`, `indian_eligibility_enum`, `partner_status_enum`), both tables, all indexes, `updated_at` triggers, and RLS.
- **Schema audit correction:** an earlier planning-phase document referenced a 50-field Airtable schema. The schema actually implemented in code (and reproduced here) has **35 fields** on `Scholarship`, not 50 — several planned fields (e.g. a separate "Scholarship Type," "Application Method," "Nomination Required?") were consolidated or dropped during implementation. The migration mirrors the real, current TypeScript interface exactly, field-for-field.
- **Polymorphic fields:** `academic_fields` and `engineering_domains` are `"all" | array | null` unions in the app. Rather than lossily normalizing that into extra boolean/array columns, both are stored as `JSONB` so the exact value round-trips without information loss (verified in this session — see §9a).
- **Free-text date-like fields:** `application_opening_date`, `intake`, and `last_verified_date` contain genuinely non-ISO values in the real seed data (e.g. `"1 June"`, `"Spring 2027"`, `"13 Aug 2026"`) and are stored as `TEXT`, not `DATE` — forcing them into `DATE` would silently corrupt existing data. `deadline` **is** a clean ISO date in every current record, so it's a real `DATE` column.
- **Indexes:** `country`, `university_id`, `degree_level` (GIN, since it's an array), `funding_type`, `verification_status`, `deadline`, `engineering_domains` (GIN on JSONB), `academic_fields` (GIN on JSONB), plus a composite `(verification_status, country)` index for the matching engine's most common combined filter.
- **RLS:** enabled on both tables with **zero permissive policies** for `anon`/`authenticated` — no public reads, no public writes. The app's server-side adapter uses the **service role key**, which bypasses RLS by design, so the app functions correctly without any policy at all. See the migration file's comments for how to add a narrow public-read policy later if a use case ever needs one.
- **Import script:** `supabase/scripts/import-seed-data.ts` reads directly from the existing `src/data/*.seed.json` files (no manual retyping) and `upsert`s by the existing stable `id` column (e.g. `"FG-009"`) — idempotent by design.

## 4. Matching-engine implementation

`src/lib/matchingEngine.ts` implements, in order:
1. **8 hard filters** (RED status, nationality exclusion, degree-level mismatch, field exclusion, named-nationality exclusion, deadline-passed-with-no-next-cycle, mandatory work experience, mandatory research experience, country-only restriction)
2. **100-point scoring** across the 8 weighted components from the spec (degree 20, nationality 20, domain/field 20, funding 15, academic performance 10, English 5, experience 5, country preference 5), with every "missing data" case defaulting to a **neutral** score component, never a penalty
3. **AMBER handling** — flat -10 deduction + `confirmationRequired: true`, never silently upgraded to GREEN
4. **RED exclusion** — enforced at the hard-filter stage, before scoring ever runs; confirmed by both unit tests and a live API smoke test (see §9)
5. **Thresholding** (≥80 Strong / ≥60 Potential / ≥40 Lower — Review / <40 dropped entirely)
6. **Sorting** — score → verification status → deadline urgency → QS → THE, exactly per spec Part K

## 5. Assessment flow

6 screens (About You → Study Plans → Academic Background → Academic Profile → Experience & Tests → Funding & Destination Preferences), using only the finalized questionnaire wording, with the engineering-domain question appearing conditionally only for Engineering/CS students. Required-field validation blocks "Continue" until answered; optional fields are always skippable.

## 6. Results & detail flow

Results page shows the count summary, a single trust-oriented filter ("only show fully verified matches") plus a sort control (Best Match default, never overridden by ranking), and cards using only the approved labels (Strong Potential Match / Potential Match / Lower Match — Review), with the fixed "Potential Match — Confirmation Required" sub-label on every AMBER card. The detail page shows the full breakdown and ends with the fixed disclaimer sentence immediately above the two outbound CTAs.

## 7. Lead-capture flow

**Updated:** name, phone, and email are now collected on the **Welcome screen — the very first screen, before the 6-step assessment begins** — not after results. This is deliberate: it means contact info exists in application state even if a student abandons the assessment partway through. The Welcome screen validates all three fields (non-empty meaningful name, permissive international phone format, standard email format) before allowing "Start Finding My Scholarships." Lead state is lifted to `page.tsx` so it survives the student navigating back to the Welcome screen and forward again.

This is kept entirely separate from `StudentProfile` — name/phone/email are **never** sent to `/api/match` and cannot influence score, ranking, or GREEN/AMBER/RED status (see `src/types/index.ts`'s `LeadInfo` type and its accompanying comment).

The results page now shows a personalized greeting ("Your Scholarship Matches, [First Name]") but never displays phone or email. The post-results card no longer re-asks for contact details (they're already known) — it's now a single "Save My Results" action that submits the already-collected lead info plus matched scholarship IDs to `/api/lead`, which still only validates and **logs** server-side (no Privyr/SmartTask/Airtable calls exist anywhere in this codebase — verified by grep during this change, see the QA note below).

## 7a. Admin dashboard (internal tool, /admin)

A staff-facing admin dashboard lives at `/admin`, entirely separate from the student application at `/`. It lets FutureGrad staff manage scholarship and university records without touching Supabase directly.

**Pages:** `/admin` (dashboard with real counts + upcoming deadlines + recently updated), `/admin/scholarships` (searchable/filterable/sortable table), `/admin/scholarships/[id]` (detail view, 7 sections), `/admin/scholarships/new` and `/admin/scholarships/[id]/edit` (shared form component), `/admin/verification` (AMBER/RED workflow with confirmation modals), `/admin/universities` (list with live scholarship counts), `/admin/universities/new` and `/admin/universities/[id]/edit`, `/admin/settings` (honest placeholder — nothing configurable yet).

**API:** `/api/admin/scholarships` (GET list w/ filters, POST create), `/api/admin/scholarships/[id]` (GET, PATCH — including archive via `{archived: true}`), `/api/admin/universities` (GET, POST), `/api/admin/universities/[id]` (GET, PATCH), `/api/admin/dashboard` (GET stats). No DELETE routes exist anywhere — archiving (`archived_at`, migration 0002) is the only removal mechanism, and archived records are excluded from admin lists by default but never permanently deleted.

**Safety rules enforced server-side, not just in the UI:**
- New scholarships default to `AMBER`, never `GREEN` — an admin must explicitly choose GREEN.
- Any change to `verification_status` on an existing record requires a `statusChangeConfirmed: true` flag in the PATCH body — the API itself rejects the change with a 400 and a clear field error if it's missing, so this can't be bypassed by calling the API directly, only the UI's confirmation modal sets this flag.
- A best-effort check flags a `fully_funded`/`full_tuition` record whose `tuition_coverage` text contradicts that (e.g. contains "partial" or a sub-100% figure).
- RED records are never deleted and remain visible in `/admin/verification` for audit purposes, but the matching engine's existing RED hard-exclusion (unchanged) keeps them out of student results regardless of anything the admin dashboard does.

**One necessary touch to the matching engine:** a new Hard Filter Rule 0 excludes any scholarship with `archived_at` set. Without it, archiving a record in the admin UI would have no actual effect on student results. This is a pure data-scope filter, not a scoring change — no existing seed record sets `archived_at`, so it's a proven no-op against all prior test expectations (see `matchingEngine.archiving.test.ts`).

**Authentication: IMPLEMENTED as of this phase — see §7b below for the full architecture.** `/admin` now requires a valid Supabase Auth session AND an entry in the `admin_users` allowlist. This replaced the earlier phase's "no auth exists" warning banner, which has been removed since it would now be actively false.

**Admin CRUD has no seed-data fallback** (unlike the student-facing matching adapter) — editing the checked-in JSON seed file from a running server isn't a safe, persistent operation. If Supabase isn't configured, every admin API route returns a `503` with a clear message rather than silently pretending to save.

**Real bugs found and fixed via live testing against a real database** (not just `tsc`/build passing): the `scholarships`/`universities` tables' `id` columns have no default — the initial create implementation crashed with a NOT NULL violation because nothing generated an ID for a brand-new record. Fixed with a slug-plus-random-suffix generator. Two more NOT-NULL columns (`academic_fields`, `nationality_eligibility`) had no safe default either — fixed with `academic_fields` defaulting to `"all"` and `nationality_eligibility` defaulting to `"conditional"` (deliberately not `"yes"`, to avoid ever defaulting toward a false-positive nationality match).

**Known form gap:** the create/edit form does not yet expose `engineering_domains`, `excluded_academic_fields`, or `excluded_nationalities` as editable fields (they can only be set via a direct API call or left at their defaults). The detail view *displays* these correctly; the form for editing them is a follow-up item, not something silently broken.

## 7b. Admin authentication

### Architecture

Two independent checks, both required, both fail closed:

1. **Authentication** — does the request carry a valid Supabase Auth session? Checked via `src/lib/supabaseServerClient.ts`'s `getAuthenticatedUserFromRequest()` (Route Handlers) and an equivalent in `src/middleware.ts` (page-level redirect). Both use the officially recommended `@supabase/ssr` + `auth.getUser()` pattern — this delegates actual token verification to Supabase's own client library rather than hand-rolling JWT verification, so it works correctly regardless of which signing scheme (shared-secret HS256 or the newer asymmetric JWKS-based keys) a given project uses.
2. **Authorization** — is that authenticated user's ID present in the `admin_users` table (migration `0003_admin_auth.sql`)? Checked via `src/lib/adminAuth.ts`'s `isAdminUser()`, using the service-role client. **Being able to log in is not the same as being an admin** — there is no self-service path from one to the other; a row must be added to `admin_users` manually (see "First admin setup" below).

`src/lib/adminAuth.ts`'s `requireAdmin()` combines both checks into the single function every admin API route calls first, independently of whatever the frontend or middleware already decided:
- No session → **401**
- Session exists, but not in `admin_users` → **403**
- Both pass → request proceeds, handler receives `{ id, email }`

**Page-level protection** (`src/middleware.ts`) only performs check #1 (authentication) — it redirects to `/admin/login` if there's no session at all. It deliberately does *not* perform the `admin_users` lookup (Edge Middleware is the wrong place for a service-role database query). The full authorization check for page access happens in `AdminLayout.tsx`, which calls `/api/admin/me` on mount: a 401 redirects to login, a 403 renders an "Access Denied" screen (for a real, authenticated, but non-admin user), and success renders the dashboard with the user's email and a logout button.

**Every existing admin API route was updated to call `requireAdmin()` independently** — `/api/admin/scholarships`, `/api/admin/scholarships/[id]`, `/api/admin/universities`, `/api/admin/universities/[id]`, `/api/admin/dashboard`, and the new `/api/admin/me`. None of them trust that middleware already checked anything.

### Supabase Auth setup

No special project configuration is needed beyond having Supabase Auth enabled (it is, by default, on every Supabase project) and email/password sign-in turned on (also the default).

### First admin setup

There is no signup form and no way to self-promote to admin — by design, per the brief this phase was built against ("do not invent usernames/passwords", "do not require a fake auth system"). To create the first admin:

1. In the Supabase Dashboard, go to **Authentication → Users → Add User** and create an account with an email and password (or invite a real staff member's email).
2. Copy that user's **UUID** (shown in the Users list).
3. Run migration `0003_admin_auth.sql` if you haven't already (adds the `admin_users` table).
4. Insert a row authorizing that user, either via the Supabase Table Editor or SQL:
   ```sql
   insert into admin_users (id, email) values ('<paste-the-uuid>', '<their-email>');
   ```
5. Start the application (`npm run dev` or a deployed instance) with the environment variables from §8 set.
6. Visit `/admin/login`.
7. Sign in with the email/password from step 1.

To authorize additional admins later, repeat steps 1-4 for each new user — there's no UI for this yet (see "known limitations").

### Session handling

Session cookies are managed entirely by `@supabase/ssr` — refreshing the browser does not log an admin out (the session cookie persists and is refreshed by middleware on each navigation), opening any `/admin/*` URL directly still triggers the full middleware check, and an expired session results in the same 401/redirect-to-login path as never having logged in. Logout (`AdminLayout`'s "Log out" button) calls `supabase.auth.signOut()` client-side, which invalidates the session, then redirects to `/admin/login`.

### Security considerations

- `SUPABASE_SECRET_KEY`/`SUPABASE_SERVICE_ROLE_KEY` are used only in `server-only`-marked files (`supabaseClient.ts`, `adminData.ts`, `adminAuth.ts`) — confirmed this phase by grepping the **compiled build output**, not just source, for a planted secret marker: it appeared in neither the client nor server bundle (Next.js doesn't inline non-`NEXT_PUBLIC_` env vars into any build artifact at all — they're read from the live process environment only at request time).
- `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are intentionally public — the publishable/anon key has zero privileges beyond what RLS grants (currently nothing, on every table) and can only be used to authenticate.
- `admin_users` has RLS enabled with **zero permissive policies** — confirmed this phase with a direct SQL test: even a role explicitly `GRANT`ed `SELECT` on the table still got zero rows back, because no RLS policy permits it. Only the service-role key (used exclusively server-side) can read it.
- `isAdminUser()` fails closed on every error path (Supabase misconfigured, query error) — it returns `false`, never assumes admin.

### Testing commands

```bash
npm test              # full suite, 161 tests
npx tsc --noEmit       # TypeScript check
npm run build          # production build (also confirms middleware registers correctly)
```

### Honest limitation

The "authenticated non-admin → 403" and "authenticated admin → 200" paths were tested by mocking session resolution (the one piece requiring a live Supabase Auth/GoTrue server this environment has no network route to) while the `admin_users` database lookup itself was tested for real, live, against a real Postgres instance with the actual `supabase-js` client. The "no session → 401/redirect" paths were tested fully live with zero mocking. What was **not** tested: the exact cookie-parsing behavior of a genuine browser-issued Supabase session cookie end-to-end — replicating `@supabase/ssr`'s internal cookie format precisely would be fragile and version-specific rather than a meaningful test. A real login through a real Supabase project (§8a) is the way to close this gap.

## 8. Environment variables required

See `.env.example`. The server-side Supabase vars are **optional** — the app runs fully functional on seed data with none of them set. The `NEXT_PUBLIC_*` vars are **required for admin login to work** (§7b), but the student-facing app and matching engine don't need them at all.

```
# Server-side (optional — student app falls back to seed data without these)
SUPABASE_URL=
SUPABASE_SECRET_KEY=

# Client-side (required for /admin/login — safe to expose publicly)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

**Key format note:** Supabase has two supported formats. Newer projects use short `sb_secret_...`/`sb_publishable_...` keys; older projects use a long JWT-based `service_role` key and `anon` key. Both are supported as fallbacks: `SUPABASE_SERVICE_ROLE_KEY` for the server-side secret, `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the client-side public key. `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL` are typically the same value — both exist because Next.js requires the `NEXT_PUBLIC_` prefix specifically to allow a variable into client-side code; the plain `SUPABASE_URL` name is kept for the server-only adapters that predate the auth phase. Legacy Airtable variables remain in `.env.example` but are unused since `src/app/api/match/route.ts` imports from `src/lib/supabase.ts`.

**Note on `NEXT_PUBLIC_*` timing:** these are baked into the JavaScript bundle at **build time**, not read at runtime — set them before running `npm run build`, not just before `npm run start`, or admin login will fail with a clear error rather than silently using stale values.

### 8a. Setting up Supabase for real

1. In your Supabase project's SQL editor, run `supabase/migrations/0001_init.sql`, then `0002_archiving.sql`, then `0003_admin_auth.sql`, in that order.
2. Put all four env vars above in a **local `.env.local`** file (already gitignored — never commit it, never paste real secret values into a chat/ticket/PR description).
3. Run the import from a machine with real network access to your project: `SUPABASE_URL=... SUPABASE_SECRET_KEY=... npx tsx supabase/scripts/import-seed-data.ts`
4. It prints a verification block confirming 40 total / 22 GREEN / 16 AMBER / 2 RED. Re-running it at any time is safe — it upserts by `id`, never duplicates.
5. Follow "First admin setup" (§7b) to create and authorize your first admin account.
6. Build and start the app with all four env vars set (`npm run build && npm run start`, or `npm run dev`) — `src/lib/supabase.ts` and `src/lib/adminData.ts` will automatically switch from seed data to live queries with no code changes.

**Important — this step (actually running the migration/import against a live project, and calling its REST API) must be done from an environment with real network access to `*.supabase.co`.** It was *not* executed against a live project in this repository's own development/CI sandbox, which only has network access to a fixed allowlist (npm registries, GitHub, Ubuntu package mirrors) and cannot reach arbitrary hosts like a Supabase project URL. Everything that *doesn't* require that live network path — the migration SQL's correctness (all three migrations, including the auth one, validated in sequence), the import script's idempotency, the admin authorization logic, the app's behavior with Supabase configured-but-unreachable — was validated for real using a local Postgres+PostgREST stand-in (see §9a, §7b's "honest limitation" note).

## 9. Testing results

**Automated test suite** (`npm run test`) — **161 tests across 9 files, all passing** (as of the admin authentication phase; earlier phases' counts below are kept for history). Covering:
- The finalized spec's all **10 worked test profiles** (`matchingEngine.profiles.test.ts`)
- All **16 edge cases** from spec Part Q (`matchingEngine.edgecases.test.ts`), plus one companion case (9b) found during this QA pass
- Funding safety, RED regression (with a reusable `assertNoRedResults()` helper), India-nationality logic, 10 required engineering domains, degree-level filtering, missing-data neutrality, AMBER/GREEN/RED behavior, explainability integrity, score determinism/integrity, and result-ordering rules (`matchingEngine.safety.test.ts`, 46 tests)
- Database integrity and official-link validation — unique IDs, required fields, exact GREEN/AMBER/RED counts (22/16/2), no dangling university references, no aggregator URLs (`database.integrity.test.ts`, 12 tests)
- The original core suite from the first build pass (`matchingEngine.test.ts`, 12 tests)

**Production build:** clean (`npm run build`) — a real TypeScript error was caught and fixed during this pass (a possibly-undefined array index in the new synthetic test fixture, addressed with an explicit non-null assertion once the invariant guaranteeing it was verified).

**Live end-to-end API tests:** server started, real HTTP calls made to `/api/match`. Confirmed: 5-67ms response times, zero RED leakage in live responses, zero funding-type misrepresentation under "fully funded only," and the critical PhD/Civil-Engineering-vs-ADB-JSP case (an exact domain match that must still be excluded) verified correct in an actual server response, not just a unit test. A malformed request correctly returns HTTP 400.

**A real bug found and fixed during this pass:** the sandbox/production clock is 3 Sept 2026, and several seed records' *confirmed* deadlines (KAIST, MAECI, Manchester, UNSW Scientia, Trinity, DAAD Helmut-Schmidt, IYT, GREAT Scholarships) had already passed relative to that date. The original hard filter only excluded a past deadline when it was *unconfirmed* — meaning a confirmed-but-now-expired deadline was incorrectly treated as still open. Fixed: any past deadline now excludes the record (for a normal intake selection), regardless of the confirmation flag, which was never meant to encode "still open" in the first place. Regression-tested in both directions (Edge case 9b).

**Two items found but deliberately NOT fixed in this pass** (per the QA brief's instruction not to silently resolve genuine spec ambiguities, and not to add new product features during a QA-only pass):
1. **Engineering-domain "related" tier ambiguity** — when a scholarship names a specific, narrow list of domains that doesn't include the student's exact domain (e.g. DAAD STEM names Mechanical/Civil/Electrical/CS; a Cybersecurity student has no named overlap), the spec's own tier-4 example is illustrated at the academic-*field* level, not the domain-*list* level. The current implementation conservatively scores this as the "related" tier (15 pts) rather than hard-excluding. This is documented and locked in by a test (`matchingEngine.edgecases.test.ts`, Edge case 5) but flagged as an open product decision.
2. **Product-brief Phase 12's "Other funding options you may consider" separate section** is not yet built — demoted partial-funding results under "fully funded only" currently stay in the main ranked list (correctly scoring below full-funding matches, never claiming to be fully funded) rather than being moved to a visually separate section. The underlying scoring/labeling is correct and safe; this is a UI-organization enhancement, not a safety issue, and is called out here as a Phase 2-appropriate follow-up rather than built now.

### 9a. Supabase migration validation (this phase)

Rather than write the migration and import script blind, I stood up a genuine local Postgres 16 instance in this environment, downloaded a PostgREST binary, and built a small path-rewriting proxy to emulate Supabase's real `/rest/v1` gateway routing — giving a true end-to-end test of the exact, unmodified `supabase-js` client code, not just SQL syntax review.

**Confirmed:**
- `0001_init.sql` runs cleanly against real Postgres — all 35 scholarship columns + 9 university columns created with the exact types, all indexes, RLS enabled with zero permissive policies.
- The real `import-seed-data.ts` script, run twice in a row: **40/40 scholarships, zero duplicate IDs** (checked directly against the database, not just the script's own report), exact 22 GREEN / 16 AMBER / 2 RED split both times.
- Three live app configurations tested end-to-end via real HTTP calls to `/api/match`: (1) unconfigured -> seed data, (2) pointed at the live local Postgres/PostgREST stack -> **identical results to the seed path** (proving the JSONB/enum round-trip for `academic_fields`/`engineering_domains`/`degree_level` is lossless), (3) pointed at an unreachable address -> graceful fallback to seed, HTTP 200, no crash, fallback warning logged server-side.
- The critical ADB-JSP (FG-037) and SISGP (FG-040) RED-exclusion held in all three configurations, including when scholarship data came from the live database rather than the JSON file.
- Along the way, `npx tsc --noEmit` (run as its own explicit check, separate from `next build`) surfaced 8 pre-existing strict-null-check errors in test files from an earlier phase that `next build`'s type-checking scope doesn't catch. Fixed with non-null assertions after confirming the underlying invariants -- zero change to matching logic.

### 9b. Real-project connection attempt (this phase)

The user supplied real Supabase project credentials (URL + a redacted secret key) and asked to connect the app to the actual live project. Two things were confirmed before proceeding, both blocking the live-database steps specifically:

- **Network:** this development sandbox's outbound network is restricted to a fixed allowlist and does not include `*.supabase.co` — confirmed with a direct request, which returned an explicit `403 Host not in allowlist` from the sandbox's own egress proxy, not from Supabase.
- **Credentials:** the secret key was shared in redacted form (only the publishable key was given in full), so even without the network restriction, writing to the real project wasn't possible from here.

**What this means concretely:** the migration was not run against the real project from this environment, the import script was not run against it, and no live HTTP calls were made to it. Those three things need to happen from a machine with real network access, using the real (unredacted) secret key, per §8a above.

**What WAS still verified for real, against the real project's own hostname:** pointing the running app at the actual `SUPABASE_URL` (with a placeholder key, since network access to it is blocked here regardless of key validity) correctly triggered the seed-data fallback path — HTTP 200, correct scholarship counts, fallback warning logged server-side, no crash. This is a genuine, honest test of the "Supabase temporarily unavailable" behavior using the real project's real hostname, which is exactly the failure mode that behavior is designed for.

A compatibility fix was made and verified during this phase: `src/lib/supabase.ts` and `supabase/scripts/import-seed-data.ts` now accept `SUPABASE_SECRET_KEY` (Supabase's newer short-key format, matching this project) in addition to the legacy `SUPABASE_SERVICE_ROLE_KEY` JWT name.

### 9c. Admin authentication testing (this phase)

- `src/lib/adminAuth.test.ts` (4 tests): the 401 (no session) and 403 (authenticated, not admin) branches of `requireAdmin()`, with session resolution mocked (the one piece needing live Supabase Auth) and the fail-closed behavior of `isAdminUser()` when Supabase isn't configured.
- **Live, unmocked, against real Postgres+PostgREST:** minted a stub `auth.users` table (vanilla Postgres lacks Supabase's managed auth schema) and ran all three migrations against it in sequence. Confirmed RLS genuinely blocks `admin_users` reads even for a role explicitly `GRANT`ed `SELECT` — zero rows returned, not a permission error, exactly the intended posture. Called the real `isAdminUser()` function through the actual `supabase-js` client and got the correct `true`/`false`/`false` for an admin, a non-admin, and a nonexistent user.
- **Live, against the actual running app:** `/admin` with no session → `307` redirect to `/admin/login`; `/admin/login` itself → `200`, no redirect loop; an admin API route with no session → `401` with a clear error body; the student landing page and `/api/match` → both `200`, completely unaffected by the new middleware (confirmed the matcher is scoped to `/admin/*` only).
- **Security audit went beyond source grep:** built the app with a distinctive planted string in place of the real secret key, then grepped the *compiled* `.next/static` and `.next/server` output for it — found in neither, confirming Next.js doesn't inline non-`NEXT_PUBLIC_` env vars into any build artifact at all (stronger evidence than "the source code looks clean").
- **Not tested:** a genuine end-to-end login through real Supabase Auth (GoTrue) — see §7b's "honest limitation" note for exactly what this does and doesn't prove.

### 9d. Production-readiness audit (this phase)

**RLS re-verified across all 3 tables, not just admin_users:** created `anon` and `authenticated` test roles against a fresh local Postgres instance with all 3 migrations applied, explicitly `GRANT`ed them SELECT/INSERT/UPDATE/DELETE at the SQL-privilege level (worse than their real-world grants), and confirmed RLS still returns **zero rows on every table for both roles**, and an `UPDATE` attempt as `authenticated` affected **zero rows** despite having write privilege. This is the strongest available proof that RLS — not just application code — is what's actually preventing unauthorized access.

**Dependency audit (`npm audit`):** 6 advisories found, classified rather than blindly force-fixed:
- **postcss (high)** — our own top-level copy: **fixed**, bumped 8.4.39 → 8.5.28 (safe patch, same major version). Next.js's own internally-bundled copy remains vulnerable and can only be resolved by a Next.js major-version upgrade (see below) — outside this app's control via `package.json` alone.
- **esbuild/vite/vitest chain (moderate)** — bumped vitest 1.6.0 → 1.6.1 (safe patch); the underlying esbuild advisory ("enables any website to send requests to the development server") can only be fully resolved by vitest 5.x, a major version jump. **Classified: development-only, transitive, safe to defer** — this affects vite's dev server, which this project never runs (Next.js has its own dev server; vitest uses vite internally only for running tests, never for serving the actual application), so it has zero production exposure regardless of whether it's fixed.
- **Next.js itself (high, ~20 CVEs across a broad version range)** — **classified: requires a deliberate future upgrade, not fixed in this pass.** 14.2.35 (this project's pinned version) is already the latest patch release in the 14.2.x line — there is no smaller, non-breaking fix available. `npm audit fix --force` offers Next.js 16.3.4, a two-major-version jump, which risks real breakage and needs its own dedicated migration/testing effort, not something to force through during a production-readiness pass per this phase's explicit instruction. Several of the listed advisories concern features this app doesn't use at all (Server Actions, i18n Pages Router config, custom WebSocket servers) and are very likely not exploitable in this app's actual configuration — but that hasn't been individually confirmed advisory-by-advisory, so this is flagged AMBER, not dismissed.
- All changes re-verified: 161/161 tests still pass, `tsc --noEmit` clean, build clean.

**Error-handling audit:** every `catch` block across all API routes was checked for raw error leakage. Every instance of returning `err.message` directly to the client is scoped specifically to the app's own custom `AdminDataUnavailableError` class, whose message is a hardcoded, safe, pre-written string containing no secrets/SQL/stack traces. Every other error path (`instanceof` check fails) logs the real error via `console.error` server-side only and returns a fixed, generic message to the client.

**Security headers added** — see §11d.

## 10. How to run locally

1. Download and extract the project folder.
2. Open a terminal in that folder.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:3000` in your browser.

**Local development uses the included seed scholarship data. Airtable is not required for local UI/matching testing.** The app automatically falls back to `src/data/scholarships.seed.json` and `src/data/universities.seed.json` whenever the Airtable environment variables aren't set — this was verified in this session with a clean `npm install` from a freshly extracted copy of the zip, with zero environment configuration.

To run the automated test suite: `npm run test`
To run a production build locally: `npm run build && npm run start`

## 11. How to deploy

Recommended: **Vercel** (zero-config for Next.js — matches the framework this app already uses, no reason to consider anything else).

### 11a. Deployment steps

1. Push this project to a GitHub repo.
2. Import it in Vercel.
3. **Build command:** `next build` (Vercel's default for Next.js — no override needed). **Output:** Vercel auto-detects the `.next` directory; no custom output configuration required.
4. Add environment variables in Vercel's project settings (Production environment):
   ```
   SUPABASE_URL=<your project URL>
   SUPABASE_SECRET_KEY=<your secret key — from Supabase Project Settings > API Keys>
   NEXT_PUBLIC_SUPABASE_URL=<same project URL>
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your publishable key>
   ```
   **Set these BEFORE the first deploy** — `NEXT_PUBLIC_*` values are baked into the JavaScript bundle at build time (§8), so adding them after a build and just restarting the server does not work; a fresh build is required.
5. Ensure migrations `0001_init.sql`, `0002_archiving.sql`, and `0003_admin_auth.sql` have already been run against the Supabase project (§8a), the seed data imported, and at least one admin account created (§7b) — the deployed app expects this to already exist, it doesn't set any of it up itself.
6. Deploy. Vercel will assign a URL; point a custom subdomain (e.g. `scholarships.gofuturegrad.com` or `finder.gofuturegrad.com`, per the "standalone URL" requirement) at it via DNS CNAME once the domain is confirmed available.
7. On the main gofuturegrad.com WordPress site, add a single CTA button/banner linking to that URL — no WordPress page changes beyond that.

### 11b. Post-deployment smoke tests

Run these manually against the live URL immediately after deploying, before announcing it to anyone:

1. Load `/` — landing page renders, no console errors.
2. Complete the 6-step assessment with a simple profile — results appear.
3. Load `/admin` while logged out — redirects to `/admin/login`.
4. Log in with a real admin account — dashboard loads with real counts (should read 40/22/16/2/13, assuming the database hasn't changed since Phase 6-8).
5. Log out — confirm `/admin` immediately redirects to login again.
6. Check response headers on `/` (e.g. via browser DevTools Network tab) — confirm `Content-Security-Policy`, `X-Frame-Options`, etc. are present (§11d).
7. Submit the post-results lead form once with throwaway test data — confirm it doesn't error (it currently only logs server-side, per §12 item 3 — check Vercel's function logs to confirm the log line appears, then treat that test lead as noise, not a real inquiry).

### 11c. Database backup & recovery

This project doesn't implement automated backups itself — that's a Supabase project-level setting, not application code. What should be backed up, and how:

- **Schema (structure):** the three migration files in `supabase/migrations/` ARE the schema backup — they're plain SQL, checked into this repo, and fully reproduce the schema from scratch on any fresh Postgres/Supabase project. Keep them in version control; don't rely on Supabase's dashboard alone to remember the schema.
- **Seed/reference data:** `src/data/scholarships.seed.json` and `src/data/universities.seed.json` are the last-known-good snapshot as of when they were generated — also checked into this repo. They are NOT automatically kept in sync with live edits made through the admin dashboard; treat them as a disaster-recovery starting point (40 verified records), not a live mirror.
- **Live production data (including any admin edits since the seed snapshot):** Supabase's own dashboard (Database → Backups) provides point-in-time recovery on paid plans, and daily backups on some tiers — this is a Supabase project setting to confirm/enable directly in the Supabase dashboard, not something this codebase controls. Check the current plan's backup retention window and confirm it meets FutureGrad's actual risk tolerance before relying on it.
- **`admin_users` allowlist:** small enough to note manually (it's just UUID+email pairs) — worth keeping an out-of-band record (e.g. a private note of which staff emails are authorized) in case the table needs to be recreated from scratch.
- **What NOT to back up in a plaintext/committed file:** the `SUPABASE_SECRET_KEY` or any admin password — those live only in Supabase's own systems and the deployment platform's environment variable store.

### 11d. Security headers

The headers are defined once in `security-headers.js` and applied to every route by `next.config.js`: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, and a `Content-Security-Policy`.

**The CSP differs between development and production, on purpose:**

| | `script-src` |
|---|---|
| `npm run dev` (development) | `'self' 'unsafe-inline' 'unsafe-eval'` |
| `npm run build` / `npm start` (production) | `'self' 'unsafe-inline'` |

`next dev` compiles with webpack's eval-based devtool and injects the react-refresh runtime; the dev bundle wraps every module in `eval()`. Without `'unsafe-eval'` the browser throws `EvalError: Evaluating a string as JavaScript violates the following Content-Security-Policy directive` when `main-app.js` loads, React never initializes, and no click/submit handler is ever attached (buttons do nothing; a `<form>` falls back to a native submission). Production bundles contain no `eval()`/`new Function()` (checked: 0 occurrences in `.next/static/chunks`), so `'unsafe-eval'` is added **only** when `NODE_ENV` is not `production` and never appears in a production build's headers. `src/lib/csp.test.ts` pins this: dev contains it, production does not, and it is the only difference between the two.

**History / lesson:** this CSP was first added in the production-readiness phase and was only tested against a production build (`npm run build && npm start`), where it worked. It was not tested under `npm run dev`, which is where it broke. Any future header change must be checked in **both** modes.

Other notes: `script-src` still includes `'unsafe-inline'` because Next.js App Router's inline hydration scripts need per-request nonce plumbing to tighten further, a real future hardening step that has not been attempted. `connect-src` allows `https://*.supabase.co` (REST and Auth) and self; `img-src` allows the FutureGrad logo's host plus `data:`; fonts/styles allow Google Fonts' two hosts, matching `layout.tsx`.

### 11e. The "Found lockfile missing swc dependencies" warning (cosmetic)

`next dev` may print `Found lockfile missing swc dependencies, patching...` followed by `Failed to patch lockfile` and `TypeError: Cannot read properties of undefined (reading 'os')`. It does not affect compilation or the app. Cause: (1) `package-lock.json` only lists the Linux `@next/swc-*` entries (it was regenerated on a Linux machine), so Next sees the Windows ones as missing; (2) Next 14.2.35's lockfile patcher looks each SWC package up at Next's own version (14.2.35), but Next 14.2.34/14.2.35 still pin SWC at 14.2.33 and 14.2.35 was never published for those packages, so the registry lookup returns nothing and reading `.os` throws. The patch can therefore never succeed on this version.

To silence it without touching the lockfile or `node_modules`, use Next's own opt-out: add `NEXT_IGNORE_INCORRECT_LOCKFILE=1` to `.env.local` (verified to work), or set it in the shell before `npm run dev`.

## 12. What still needs manual configuration

0. **First admin account creation** (§7b "First admin setup") — authentication is now implemented, but there is no admin account until one is manually created via the Supabase Dashboard and added to `admin_users`. This is a one-time, deliberately manual step, not an oversight.
1. **Real Supabase connection — credentials now exist, but the migration/import/live-verification still need to be run from a machine with real network access** (§8a, §9b). Real project credentials (URL + secret key format) were supplied and the adapters were updated to support them, but this development sandbox cannot reach `*.supabase.co` at all (confirmed with a direct request returning an explicit allowlist block) — so the actual `psql`/import-script runs against the live project (now including migration `0003_admin_auth.sql`), and live HTTP calls to confirm the 40/22/16/2 counts and a real login flow, are the one remaining concrete action item, to be run by whoever has real network access and the full secret key.
2. **Real brand assets** — `src/app/globals.css` now holds a complete, tasteful *temporary* design system (Ink Navy `#0F1B3D` / Amber `#E8A33D` / Emerald `#1F9D77`, Plus Jakarta Sans + Inter), built as a genuine visual redesign, not just placeholder colors — but it is still not FutureGrad's real brand. Every token is centralized in that one file specifically so swapping in real brand values later is a single-file change. The logo URL (`https://gofuturegrad.com/wp-content/uploads/2026/06/cropped-cropped-Futuregrad-logo-official-1.jpeg`) is wired into `LandingScreen.tsx` and loads correctly once deployed. Real hex codes/fonts from DevTools are still pending.
3. **Privyr/SmartTask integration** — `src/app/api/lead/route.ts` currently only logs submissions. Wiring the actual webhook/API call to Privyr (and onward to SmartTask) is a scoped, well-isolated next step — the payload shape (`name`, `contact`, `email`, `matchedScholarshipIds`) is already correct.
4. **Analytics provider** — `src/lib/analytics.ts`'s `track()` function currently logs to console. Swap its body for a real provider call (Plausible, GA, etc.) once one is chosen; every call site in the app is already correctly placed.
5. **Domain/subdomain DNS** — whoever manages gofuturegrad.com's DNS needs to point the chosen subdomain at the Vercel deployment.
6. **A UI for managing `admin_users`** — adding a second/third admin currently requires direct SQL or the Supabase Table Editor (§7b). Fine for a small team, worth a proper admin-management screen if the team grows.
7. **A genuine end-to-end login test through real Supabase Auth** — see §7b/§9c's "honest limitation" note for exactly what was and wasn't verifiable without live network access to a real Auth server.

## 13. Known limitations

- The two open items from §9 (engineering-domain tier-4 ambiguity, the "other funding options" section) are documented product decisions for the next phase, not defects.
- The `Min GPA/Percentage` cross-system comparison (e.g. a scholarship publishing a GPA minimum when the student entered a percentage) is deliberately treated as neutral rather than converted — this is correct per the spec's "never invent a conversion" rule, but means academic-performance scoring is currently inert for most records (consistent with the observation made in the matching spec itself: almost no current record publishes a numeric minimum at all).
- `/api/lead` currently logs submitted name/contact/email to the server console as its MVP stopgap (explicitly scoped that way in the build brief, pending real Privyr/SmartTask wiring) — acceptable for local development, but this should not be how lead PII is retained once this goes to any shared/production environment; replace with the real CRM write before public launch.
- Mobile device testing (real iOS Safari / Android Chrome) has not been performed in this session — only responsive-layout code review and a QA-focused API/build pass. Recommend a manual pass before launch.
- The lead-capture form has minimal client-side validation (name + contact required, no format checking) — acceptable for MVP, worth hardening before a public launch.
- No rate limiting on `/api/match` or `/api/lead` — fine at expected MVP traffic, worth adding if this gets promoted heavily.
- Several seed records now have expired deadlines (a natural consequence of static seed data plus real elapsed time) — this isn't a code defect, but it does mean the effective GREEN candidate pool for a "normal intake" query is smaller than it looks at a glance. Recommend a deadline-refresh verification pass as a data-maintenance task, independent of any code change.

## 14. Recommended next step

Two genuinely parallel-izable tracks:
1. **Product/ops track:** obtain real brand assets (§12.2) and set up the Airtable base (§12.1) — neither blocks the other, and both unblock a real visual/content review.
2. **Engineering track:** codify the remaining test profiles and edge cases from the matching spec as automated tests (§13), then do a real-device mobile QA pass — this is the highest-value remaining engineering work before this goes anywhere near real students, since it directly protects the trust guarantees (no RED leakage, no false "fully funded" claims) that this entire project has been built around.
