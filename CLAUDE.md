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
