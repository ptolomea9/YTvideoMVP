# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-13)

**Core value:** Effortless for non-technical agents. The entire flow—from photo upload to cinematic video—must feel magical and require zero technical expertise.
**Current focus:** Phase 5 — Payments

## Current Position

Phase: 4 of 6 (Dashboard) ✓ Complete
Plan: 4 of 4 in current phase
Status: Phase complete
Last activity: 2026-01-14 — Completed 04-04 (Media kit download)

Progress: ███████████████████████░░░░░░░ 77%

## Performance Metrics

**Velocity:**
- Total plans completed: 20
- Average duration: 10 min
- Total execution time: 3.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 3/3 ✓ | 18 min | 6 min |
| 2. Create Wizard | 6/6 ✓ | 102 min | 17 min |
| 3. n8n Integration | 7/7 ✓ | 57 min | 8 min |
| 4. Dashboard | 4/4 ✓ | 19 min | 5 min |

**Recent Trend:**
- Last 5 plans: 12m, 3m, 7m, 7m, 2m
- Trend: Fast (UI components)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Used oklch color space for luxury theme tokens (better perceptual uniformity)
- Bodoni Moda (serif) for headings, Inter for body text
- Dark mode only - no light mode toggle
- Separate browser/server Supabase clients using @supabase/ssr pattern
- Credits table as append-only ledger (no UPDATE/DELETE)
- Videos table has no DELETE policy (audit trail)
- useReducer for wizard state (predictable transitions)
- Serializable wizard state only (URLs not File objects)
- react-hook-form with Zod for form validation
- forwardRef + useImperativeHandle for parent validation control
- GPT-4o Vision for image analysis with hybrid labels (AI suggests, user edits)
- Images have editable label + editable features/description for script generation
- Section-based script (5 sections) instead of per-image scripts for cohesive narrative
- Agent phone/social optional fields feed into closing section CTA
- Per-image enhancement presets (Golden Hour, HDR, Vivid, Sunset Sky) via Kie.ai with progressive disclosure UI
- Hybrid preview: CSS filters for instant feedback, API call only on "Apply"
- Sunset Sky as premium option (AI-only, no CSS preview possible)
- Enhancement URL caching to avoid regeneration when switching presets
- Before/after comparison slider for applied enhancements
- ElevenLabs voice integration with 4 sources: My Voices, Record, Upload, Library
- In-browser audio recording via MediaRecorder API
- Instant Voice Clone for user recordings/uploads
- Images stored in listings.images JSONB column
- Videos created with status='pending' until n8n processes
- Selected Tour Video workflow for MVP (simpler than main workflow, no HeyGen avatar)
- n8n payload stored in videos table for debugging webhook triggers
- Default music URL provided even when music disabled (workflow handles muting)
- Bass/snare beat separation via Python/librosa for accurate video transitions
- Snare hits preferred for image transitions (punchy feel), bass hits available for future use
- Beat data stored in music_tracks table: bass_hits[], snare_hits[], beats[], bpm
- **Youtube Video workflow** (hjG60LIO86i5vxX3) is target, Tour Video/Listing Video were references
- Youtube Video expects array-wrapped payload: `[payload]` → `body[0]`
- **Beat-sync in lulls only**: Snare-hit transitions happen during gaps between narration sections (not during voice). 4 lulls = 4 beat-synced section transitions. Within sections, soft crossfades between images.
- **Images map to script sections**: GPT-4o room labels determine which images play during which narration section (exterior→hook, entry→first impression, living/kitchen→interior, bed/bath→features, yard→closing)
- **Wizard validation minimums**: Min 5 images (one per section), min 50 chars per script section (for proper TTS timing). Fallback logic reuses images when sections lack matching room types.
- **Script routing in n8n**: Wizard-provided scripts (webhookResponse) bypass GPT generation and route directly to ElevenLabs TTS. Payloads without webhookResponse fall back to GPT flow.
- **imageTransitionTimes calculation**: First snare hit per narration gap selected as transition point. Avoids clustered transitions - one punchy beat per lull.
- **Closing card approach**: 5-second branded scene appended in same Code node (not separate node), renders in single json2video call with main video. Template captions apply only to Scene 1.
- **Completion webhook**: Service role client for n8n callbacks bypasses RLS. N8N_WEBHOOK_SECRET Bearer token validates authenticity.
- **Realtime notifications**: VideoStatusProvider wraps protected layout children; useVideoStatusSubscription hook shows toasts on status changes.
- **Media kit download**: Direct browser download (no server proxy) since video URLs are publicly accessible. API validates ownership via RLS before returning URLs. Filenames sanitized from listing address.

### Deferred Issues

None currently.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-14
Stopped at: Completed Phase 4 (Dashboard) - All 4 plans done
Next up: Phase 5 (Payments) - Stripe subscriptions and credit system
Resume file: None
