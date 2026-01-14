# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-13)

**Core value:** Effortless for non-technical agents. The entire flow—from photo upload to cinematic video—must feel magical and require zero technical expertise.
**Current focus:** Phase 3 — n8n Integration

## Current Position

Phase: 3 of 6 (n8n Integration)
Plan: 0 of 7 in current phase
Status: Ready to start
Last activity: 2026-01-13 — Completed Phase 2 (Create Wizard)

Progress: ██████████████████████░░░░░░░░ 45%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 13 min
- Total execution time: 2.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 3/3 ✓ | 18 min | 6 min |
| 2. Create Wizard | 6/6 ✓ | 102 min | 17 min |

**Recent Trend:**
- Last 5 plans: 4m, 12m, 8m, 12m, 24m
- Trend: Stable

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

### Deferred Issues

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-13
Stopped at: Completed 02-05-PLAN.md (Voice/Music/MLS options)
Next up: Phase 3 - n8n Integration (03-01: Debug existing n8n workflow)
Resume file: None
