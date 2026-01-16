# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start Next.js development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run seed:music   # Seed music database (tsx scripts/seed-music.ts)
```

## Architecture Overview

This is **EdgeAI Luxury Video Suite** - a Next.js 16 application that generates real estate tour videos using a multi-step wizard flow orchestrated through n8n workflows.

### Core Flow

```
4-Step Wizard UI → transformWizardToN8n() → n8n Webhook → Video Pipeline
                                                              ↓
Dashboard ← Supabase Realtime ← /api/videos/complete callback ←
```

### Key Integrations

- **Supabase**: Auth, database, file storage, realtime subscriptions
- **OpenAI GPT-4o Vision**: Image analysis and room type classification
- **ElevenLabs**: Text-to-speech narration
- **n8n**: Video generation orchestration (external workflow at `N8N_WEBHOOK_URL`)
- **Kie.ai**: Image enhancement

### Wizard Steps

```
Step 0 (DATA)   → Property info + agent branding (name, phone, headshot, logo)
Step 1 (UPLOAD) → Images (5-15) with room type classification via GPT-4o
Step 2 (SCRIPT) → 5 narrative sections (opening, living, private, outdoor, closing)
Step 3 (STYLE)  → Voice selection + music settings with beat detection
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/wizard/wizard-context.tsx` | Central state machine (useReducer with 20+ actions) |
| `src/lib/n8n/transform.ts` | Transforms wizard state to n8n webhook payload |
| `src/middleware.ts` | Route protection, session refresh |
| `src/types/video.ts` | Video status types and interfaces |
| `src/lib/openai.ts` | GPT-4o image analysis |
| `src/hooks/useVideoStatusSubscription.ts` | Realtime video status via Supabase |

## Route Structure

- `/` - Landing page
- `/(auth)/login, /signup` - Public auth routes
- `/(protected)/dashboard` - Video gallery with realtime status
- `/(protected)/create` - 4-step video creation wizard
- `/api/*` - 16+ API routes for images, audio, videos, voices, music

## Video Status Progression

```
pending → processing → sorting_images → generating_motion → generating_audio → rendering → completed
```

## n8n Payload Structure

The `transformWizardToN8n()` function creates a payload with:
- Beat-synced image timings (prefers snare hits from music analysis)
- Section-to-image mapping for narration alignment
- Estimated durations based on 150 WPM TTS assumption
- Agent branding data for closing card

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
KIE_API_KEY=
N8N_WEBHOOK_URL=
```

## External Dependencies

- **n8n workflow** (`Shawheen Youtube Video.json`): Handles video rendering pipeline with Kling AI for image-to-video, json2video for composition
- **ffmpeg-service/**: Separate microservice for video clip extension (ping-pong looping)

## Conventions

- Path alias: `@/*` → `src/*`
- UI components built on Radix UI primitives in `src/components/ui/`
- Strict TypeScript with Zod for runtime validation
- React Context + useReducer for state (no Redux)

## Session Log

### 2025-01-15: Video Timing & Narration Fixes

**Problem**: Video timing mismatch - 11 images × 5 seconds = 55s video, but narration was ~124 seconds, causing dark screen for ~1 minute.

**n8n Workflow Fixes** (workflow ID: `Qo2sirL0cDI2fVNQMJ5Eq`):
- Fixed Kie API URL: `/api/v1/task/create` → `/api/v1/jobs/createTask`
- Fixed json2video subtitle format (removed invalid `settings` object)
- Fixed end card variable mappings: `headshot_url`, `agent_name`, `brand_name`, `phone`, `email`
- Added subtitle element with `classic-progressive` style
- Improved end card layout: larger headshot (300px), better positioning

**Script Generation Fixes** (`src/app/api/script/generate/route.ts`):
- Added `MAX_TOTAL_WORDS = 100` hard cap (~40 seconds narration)
- Changed `TTS_WORDS_PER_MINUTE` from 120 → 150
- Made GPT prompt stricter: 5-8 word sentences, no filler phrases
- Reduced `max_tokens` to 500, `temperature` to 0.3

### 2025-01-16: TTS Timing & Music Ducking Fixes

**Problem**: Music ducking at wrong times - `starts` array (from timeline, sorted by image index) didn't match `durations` array (from raw TTS output, in frontend order). Also, section sorting was breaking narrative flow.

**n8n Workflow Fixes** (workflow ID: `Qo2sirL0cDI2fVNQMJ5Eq`):

1. **`prepare body for jsontovideo to set video`** node:
   - Removed `sectionsWithAudio.sort()` that reordered sections by first image index
   - Now respects frontend narrative order: `opening → outdoor → living → private → closing`
   - Added `duration` property to each timeline audio element for downstream sync

2. **`get video metadata to add music`** node:
   - Changed `durations` source from raw TTS output to timeline elements
   - Now both `starts` and `durations` come from same array, ensuring index alignment
   - Music ducking now correctly quiets during narration segments

**Verification**: Check console logs for "Section order (frontend)" and matching `Starts`/`Durations` arrays.

### 2025-01-16: Narration Starts 25 Seconds Late Fix

**Problem**: Opening narration ("Welcome to Beverly Hills...") started at 25 seconds instead of at 2 seconds. Two root causes:

1. **Frontend**: Opening section only matched "exterior" room type - if first images were tagged "outdoor", opening got a later image (index 5+)
2. **n8n**: Narration start time was calculated from image indices, so opening with image index 5 would start at 5×5=25s

**Frontend Fix** (`src/lib/n8n/transform.ts`):
- `mapImagesToSections()` now always assigns first 2 images to opening section
- This ensures opening describes what the viewer sees first, regardless of room type classification

**n8n Workflow Fix** (`prepare body for jsontovideo to set video` node):
- Opening narration always starts at 2s (INTRO_SILENCE)
- Middle sections (outdoor, living, private) sorted by first image index
- Closing section always placed at video end
- Console logs now show: `Strategy: Opening first, middle sorted by image index, closing last`

**Expected behavior after fix**:
| Section | Start Time | Notes |
|---------|------------|-------|
| opening | 2s | Always first, describes first images |
| outdoor/living/private | ~sorted by image | After opening ends |
| closing | near video end | Always last |

**Verification**: Console should show `Section "opening": start=2s`

### 2025-01-16: Closing Narration & Music Cut-off at End Card Fix

**Problem**: Closing narration and music cut off at ~56 seconds in a 60-second video, leaving 4 seconds of silence before the video ends.

**Root Cause**: The final edit created TWO separate scenes:
1. Main video scene: `duration = movie.duration - 6` (cut last 6 seconds of audio)
2. End card scene: `duration = 6` (separate scene with no audio from main video)

The last 6 seconds of narration/music got cut because they were in the portion replaced by the silent end card scene.

**n8n Workflow Fixes** (workflow ID: `Qo2sirL0cDI2fVNQMJ5Eq`):

1. **`Format variables for final editing1`** node:
   - Changed `video_duration` from `$json.movie.duration - 6` → `$json.movie.duration`
   - Video now uses full duration (no longer subtracting 6 seconds)

2. **`json2video - Edit video1`** node:
   - Replaced two-scene structure with single-scene overlay approach
   - Video plays at full duration with continuous audio
   - White rectangle overlay fades in 6 seconds before end
   - Agent branding (headshot, name, brand, phone, email) appear as overlays
   - Fixed text elements: font properties now at top level (not nested in `settings`)
   - Fixed font-size: now number (`64`) instead of string (`"64px"`)

3. **`prepare body for jsontovideo to set video`** node:
   - Added `END_CARD_DURATION = 6` constant
   - Changed closing timing from `videoDuration - closingClip.duration - 1` to `videoDuration - closingClip.duration - END_CARD_DURATION`
   - Closing narration now finishes right when end card overlay appears

**Expected behavior after fix**:
- Video plays full duration with continuous audio (narration + music)
- At 6 seconds before end, white overlay fades in over the video
- Agent branding appears on the overlay (headshot, name, brand, contact)
- Closing narration finishes right as the overlay appears
- Music continues during end card and fades out naturally at video end

**Verification**:
- No audio cut-off - music and narration play to the end
- End card overlay appears smoothly 6 seconds before video ends
- Closing narration finishes as the white overlay fades in
- Agent name, brand, phone, and email all appear on end card
