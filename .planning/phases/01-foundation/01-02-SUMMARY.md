---
phase: 01-foundation
plan: 02
subsystem: database
tags: [supabase, postgres, rls, typescript]

# Dependency graph
requires:
  - phase: 01-01
    provides: Next.js 15 project structure
provides:
  - Supabase client libraries (@supabase/supabase-js, @supabase/ssr)
  - Browser and server Supabase client helpers
  - Database schema SQL (profiles, listings, videos, credits)
  - RLS policies enforcing user isolation
  - Profile auto-creation trigger
affects: [01-03-auth, 02-create-wizard, 04-dashboard, 05-payments]

# Tech tracking
tech-stack:
  added: [@supabase/supabase-js, @supabase/ssr]
  patterns: [server-client-separation, rls-user-isolation, append-only-ledger]

key-files:
  created:
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - supabase/migrations/001_initial_schema.sql
    - supabase/migrations/002_rls_policies.sql
    - .env.example
  modified:
    - package.json
    - .gitignore

key-decisions:
  - "Separate browser/server Supabase clients using @supabase/ssr pattern"
  - "Credits table as append-only ledger (no UPDATE/DELETE policies)"
  - "Videos table has no DELETE policy (audit trail)"
  - "Profile auto-creation via database trigger on auth.users"

patterns-established:
  - "Server client uses cookies() from next/headers for session handling"
  - "RLS pattern: auth.uid() = user_id for user isolation"
  - "JSONB columns for flexible data (script_sections, neighborhood_pois)"

issues-created: []

# Metrics
duration: 2min
completed: 2026-01-13
---

# Phase 1 Plan 02: Supabase Schema Summary

**Supabase client libraries with typed browser/server helpers, complete database schema (profiles, listings, videos, credits), and RLS policies enforcing user isolation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-13T23:12:03Z
- **Completed:** 2026-01-13T23:14:24Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Installed @supabase/supabase-js and @supabase/ssr for Next.js 15 integration
- Created typed Supabase clients for browser (createBrowserClient) and server (createServerClient with cookie handling)
- Built complete database schema with 4 tables: profiles, listings, videos, credits
- Implemented RLS policies enforcing strict user isolation (auth.uid() = user_id pattern)
- Added auto-profile creation trigger on Supabase Auth signup

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Supabase client and configure environment** - `3826689` (feat)
2. **Task 2: Create database schema SQL migration** - `a9fe4d0` (feat)
3. **Task 3: Create RLS policies SQL** - `d079f1d` (feat)

**Plan metadata:** `ffe64a5` (docs: complete plan)

## Files Created/Modified

- `src/lib/supabase/client.ts` - Browser-side Supabase client using createBrowserClient
- `src/lib/supabase/server.ts` - Server-side Supabase client with cookies handling
- `supabase/migrations/001_initial_schema.sql` - Complete schema with 4 tables and indexes
- `supabase/migrations/002_rls_policies.sql` - RLS policies and profile creation trigger
- `.env.example` - Environment variable template for Supabase credentials
- `package.json` - Added Supabase dependencies
- `.gitignore` - Allow .env.example to be committed

## Decisions Made

- Used @supabase/ssr package for proper Next.js 15 App Router integration (handles cookies correctly)
- Credits table designed as append-only ledger - no UPDATE/DELETE policies, INSERT via service role only
- Videos table has no DELETE policy to maintain audit trail of all generated videos
- Profile creation handled via database trigger rather than application code (more reliable)
- JSONB columns for script_sections and neighborhood_pois (flexible schema evolution)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added .env.example instead of .env.local**
- **Found during:** Task 1 (Environment configuration)
- **Issue:** .env.local is gitignored by default (correctly), but we need a template for developers
- **Fix:** Created .env.example with same placeholders and updated .gitignore to allow it
- **Files modified:** .env.example, .gitignore
- **Verification:** File commits successfully, contains correct placeholder values
- **Committed in:** 3826689 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Minor adjustment - .env.example is the standard pattern for template env files. No scope creep.

## Issues Encountered

None - SQL syntax is valid and all files created correctly.

## Next Phase Readiness

- Supabase client helpers ready for auth implementation
- Schema SQL ready for manual execution in Supabase dashboard
- User must complete manually:
  1. Create Supabase project at supabase.com
  2. Run 001_initial_schema.sql in SQL Editor
  3. Run 002_rls_policies.sql in SQL Editor
  4. Copy project URL and anon key to .env.local
- Ready for 01-03: Auth flow (login, signup, session management)

---
*Phase: 01-foundation*
*Completed: 2026-01-13*
