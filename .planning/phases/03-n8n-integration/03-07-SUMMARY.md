---
phase: 03-n8n-integration
plan: 07
subsystem: api, realtime
tags: [supabase, realtime, webhook, n8n, toast, sonner]

# Dependency graph
requires:
  - phase: 03-06
    provides: json2video closing card, complete video rendering pipeline
provides:
  - Completion webhook endpoint for n8n callbacks
  - Realtime video status subscriptions
  - Toast notifications for video completion/failure
affects: [04-dashboard, user-experience]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Service role client for server-to-server callbacks
    - Supabase Realtime subscriptions for status updates
    - Client provider pattern for server/client layout integration

key-files:
  created:
    - src/app/api/videos/complete/route.ts
    - src/hooks/useVideoStatusSubscription.ts
    - src/components/providers/VideoStatusProvider.tsx
    - supabase/migrations/008_enable_realtime.sql
  modified:
    - src/lib/n8n/transform.ts
    - src/app/api/listings/create/route.ts
    - src/app/(protected)/layout.tsx

key-decisions:
  - "Service role client bypasses RLS for n8n server-to-server callbacks"
  - "N8N_WEBHOOK_SECRET env var for callback authentication"
  - "VideoStatusProvider wraps protected layout children for realtime"

patterns-established:
  - "Server-to-server webhooks use service role client"
  - "Client hooks in server layouts via provider wrapper pattern"

issues-created: []

# Metrics
duration: 12min
completed: 2026-01-14
---

# Phase 03 Plan 07: Completion Webhook and Status Updates Summary

**POST /api/videos/complete endpoint with service role auth, n8n callback configuration, and Supabase Realtime subscription for toast notifications**

## Performance

- **Duration:** 12 min
- **Started:** 2026-01-14T10:00:00Z
- **Completed:** 2026-01-14T10:12:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Completion webhook endpoint validates n8n callbacks with shared secret
- n8n HTTP Request node updated to call our endpoint with videoId
- Realtime subscription shows toasts when video status changes to completed/failed
- Videos table enabled for Supabase Realtime

## Task Commits

Each task was committed atomically:

1. **Task 1: Create completion webhook API endpoint** - `a8e7480` (feat)
2. **Task 2: Add videoId to n8n webhook payload** - `592fffb` (feat)
3. **Task 3: Add realtime subscription and toast notifications** - `e8dbd86` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/app/api/videos/complete/route.ts` - POST endpoint for n8n completion callbacks
- `src/lib/supabase/service.ts` - Service role client (already existed)
- `src/lib/n8n/transform.ts` - Added videoId to N8nTourVideoPayload type
- `src/app/api/listings/create/route.ts` - Include video.id in n8n payload
- `src/hooks/useVideoStatusSubscription.ts` - Realtime subscription hook
- `src/components/providers/VideoStatusProvider.tsx` - Client wrapper for layout
- `src/app/(protected)/layout.tsx` - Integrated VideoStatusProvider
- `supabase/migrations/008_enable_realtime.sql` - Enable Realtime for videos table

## Decisions Made

- Used service role client for completion webhook to bypass RLS (server-to-server)
- N8N_WEBHOOK_SECRET Bearer token validates callback authenticity
- Wrapped protected layout children in VideoStatusProvider for realtime
- n8n env vars: N8N_APP_CALLBACK_URL for endpoint, N8N_WEBHOOK_SECRET for auth

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - Task 1 completion webhook was already created before this session (commit a8e7480).

## Next Phase Readiness

Phase 3 (n8n Integration) complete. All 7 plans finished:
- 03-01: Debug existing n8n workflow
- 03-02: Webhook trigger from Next.js
- 03-03: Image processing (Kie.ai resize)
- 03-04: Script integration (wizard scripts bypass GPT)
- 03-05: ElevenLabs narration with timing
- 03-06: json2video closing card (branded)
- 03-07: Completion webhook and status updates

Ready for Phase 4: Dashboard - video gallery with 9:16 cards, hover autoplay, realtime progress states.

---
*Phase: 03-n8n-integration*
*Completed: 2026-01-14*
