---
phase: 03-n8n-integration
plan: 04
subsystem: n8n-workflow
tags: [n8n, elevenlabs, tts, script, webhook, routing]

# Dependency graph
requires:
  - phase: 03-02
    provides: Webhook trigger with webhookResponse payload
  - phase: 02-04
    provides: HITL script editor with 5 sections
provides:
  - Conditional script routing in n8n workflow
  - Wizard script bypass for GPT generation
  - Backwards-compatible fallback to GPT flow
affects: [03-05, 03-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional routing with IF node for script source detection"
    - "Webhook data access via $('Webhook').first().json.body[0]"

key-files:
  created: []
  modified:
    - "n8n Youtube Video workflow (hjG60LIO86i5vxX3)"

key-decisions:
  - "Route based on source='wizard' flag rather than array length alone"
  - "Preserve images data passthrough for GPT fallback path"

patterns-established:
  - "Wizard-provided data bypasses AI generation when present"

issues-created: []

# Metrics
duration: 12min
completed: 2026-01-14
---

# Phase 03 Plan 04: Script Integration Summary

**Conditional script routing added to n8n workflow - wizard-provided scripts bypass GPT generation, preserving HITL edits**

## Performance

- **Duration:** 12 min
- **Started:** 2026-01-14T00:00:00Z
- **Completed:** 2026-01-14T00:12:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 1 (n8n workflow via MCP)

## Accomplishments

- Added "Check for wizard script" Code node that validates webhookResponse array
- Added "Use wizard script?" IF node for conditional routing
- Wizard path: webhookResponse → direct to ElevenLabs TTS (skip GPT)
- Fallback path: no webhookResponse → GPT generation → TTS (original flow preserved)
- Backwards compatible with payloads lacking webhookResponse

## Workflow Changes

**New nodes added to Youtube Video workflow:**
1. **Check for wizard script** (Code node at position 33040, 14528)
   - Checks `$('Webhook').first().json.body[0].webhookResponse`
   - Validates: array, 5+ items, each 50+ chars
   - Returns items with `source: 'wizard'` or `useGptFlow: true`

2. **Use wizard script?** (IF node at position 33130, 14528)
   - Condition: `$json.source === "wizard"`
   - TRUE → Convert text to speech (skip GPT)
   - FALSE → Prepare Body for GPT (original flow)

**Connection flow:**
```
Make Optimized Images Array
       ↓
Check for wizard script
       ↓
Use wizard script?
   ↓ TRUE          ↓ FALSE
Convert TTS    Prepare GPT → OpenAI → Split → Convert TTS
```

## Decisions Made

- Used `source` flag check rather than just array detection for clearer routing semantics
- Preserved original GPT flow entirely for backwards compatibility
- Validated min 50 chars per section to ensure TTS quality

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - n8n MCP tools worked correctly for all node and connection operations.

## Next Phase Readiness

- Script routing complete, wizard-provided scripts now used for TTS
- Ready for 03-05-PLAN.md (ElevenLabs narration with timing)
- Note: Pre-existing workflow issues (Gmail node, polling cycles) unrelated to this work

---
*Phase: 03-n8n-integration*
*Completed: 2026-01-14*
