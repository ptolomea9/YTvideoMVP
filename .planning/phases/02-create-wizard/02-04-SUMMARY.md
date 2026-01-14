---
phase: 02-create-wizard
plan: 04
subsystem: ui
tags: [gpt-4, openai, script-generation, hitl, wizard, narration]

# Dependency graph
requires:
  - phase: 02-02
    provides: PropertyData with address, features (POIs)
  - phase: 02-03
    provides: WizardImage with label, features, roomType
provides:
  - 5-section script editor (Opening, Living, Private, Outdoor, Closing)
  - /api/script/generate endpoint for cohesive narration
  - Section-based regeneration
  - Agent contact fields for video closing
affects: [03-n8n-integration, video-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns: [section-based-script, gpt-4-narration, debounced-autosave]

key-files:
  created:
    - src/app/api/script/generate/route.ts
    - src/components/wizard/steps/script-step.tsx
  modified:
    - src/lib/wizard/types.ts
    - src/lib/wizard/wizard-context.tsx
    - src/app/(protected)/create/page.tsx
    - src/components/wizard/steps/property-data-step.tsx

key-decisions:
  - "Section-based script (5 sections) instead of per-image scripts"
  - "GPT-4o generates cohesive narrative referencing image labels/features"
  - "Debounced autosave (500ms) for textarea edits"
  - "Agent phone/social optional fields feed into closing CTA"

patterns-established:
  - "Section-based script grouping by roomType"
  - "Thumbnail strip preview in script sections"
  - "Word count color indicators (green/amber/red)"

issues-created: []

# Metrics
duration: 12min
completed: 2026-01-13
---

# Phase 2 Plan 4: Script HITL Editor Summary

**5-section script editor with GPT-4o cohesive narration, agent contact fields, and section-based regeneration**

## Performance

- **Duration:** 12 min
- **Started:** 2026-01-13T22:10:00Z
- **Completed:** 2026-01-13T22:22:00Z
- **Tasks:** 4 (3 auto + 1 checkpoint)
- **Files modified:** 6

## Accomplishments

- Section-based ScriptSection type with 5 tour sections (opening, living, private, outdoor, closing)
- POST /api/script/generate endpoint grouping images by roomType
- GPT-4o generates cohesive narrative referencing specific image labels and features
- Collapsible section editors with thumbnail strips, word counts, and duration estimates
- Per-section regeneration without affecting other sections
- Agent contact fields (phone, social) in Step 1 for video closing CTA
- Wizard integration with auto-generation on step entry

## Task Commits

Each task was committed atomically:

1. **Task 1: Types and script generation API** - `9267835` (feat)
2. **Task 2: Section-based script editor component** - `33fd338` (feat)
3. **Task 3: Integrate script step into wizard flow** - `2c36c20` (feat)
4. **Enhancement: Agent contact fields for closing CTA** - `84b30c2` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/lib/wizard/types.ts` - Added ScriptSectionType, updated ScriptSection interface, added agentPhone/agentSocial
- `src/lib/wizard/wizard-context.tsx` - Updated REMOVE_IMAGE to handle section-based imageIds
- `src/app/api/script/generate/route.ts` - GPT-4o script generation with section grouping
- `src/components/wizard/steps/script-step.tsx` - 5-section editor with thumbnails, word counts, regeneration
- `src/app/(protected)/create/page.tsx` - Replaced placeholder with ScriptStep, added validation
- `src/components/wizard/steps/property-data-step.tsx` - Added Agent Contact section (phone, social)

## Decisions Made

- **Section-based approach:** 5 sections instead of per-image scripts for cohesive narrative flow
- **Image grouping by roomType:** exterior→opening, entry/living/kitchen/dining→living, master/bedroom/bath→private, outdoor→outdoor
- **Word count targets:** ~40-60 words per section for ~15s narration each, total ~60-90s video
- **Agent contact in closing:** Phone and social handle reference in closing script, sets up contact card visual

## Deviations from Plan

### Enhancements Added

**1. [During Checkpoint] Agent contact fields for video closing**
- **Found during:** User feedback at checkpoint verification
- **Issue:** No way to capture agent phone/social for video CTA
- **Fix:** Added agentPhone and agentSocial to PropertyData and Step 1 form
- **Impact:** Closing script now references agent contact, prepares for black screen contact card

---

**Total deviations:** 1 enhancement (user-requested during checkpoint)
**Impact on plan:** Added valuable feature for video closing CTA without scope creep

## Issues Encountered

None - all tasks completed successfully.

## Next Phase Readiness

- Script step fully functional with 5-section editing
- Agent contact captured for video rendering (black screen with CTA)
- Ready for 02-05: Step 4 - Voice/music/MLS style options

**Note:** The actual black screen with agent info will be implemented in video rendering (Phase 3 n8n integration or json2video template). Data capture is complete.

---
*Phase: 02-create-wizard*
*Completed: 2026-01-13*
