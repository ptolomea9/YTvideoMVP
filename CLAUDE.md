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

### Historical Context (Jan 15-16, 2025)

Multiple iterations resolved these core issues:

1. **Video/Narration Timing**: Fixed mismatch where 55s video had 124s narration. Capped scripts at 250 words, adjusted WPM estimates.

2. **json2video API Quirks**: Learned correct property names (`font-color` in `settings`, `position: "custom"` for x/y, `mask` requires PNG URL not string). Replaced 6-element end card with single HTML element using Tailwind CSS.

3. **Narration-Image Sync**: Images were assigned by room type (scattered indices) making sync impossible. Solution: reorder clips by section before merging so each section's clips are contiguous.

4. **Async Clip Order**: Videos finish processing in random order (race condition). Solution: track `originalIndex` via json2video's `client-data` field, sort before reordering.

### 2025-01-17: Fix Audio Doubling, Negative Speed & End Card Visibility

**Problems** (Execution 8798):
1. Audio doubling - narration overlaps at 0:11-0:20
2. Negative speed - audio 4 has `speed: -13.218`
3. End card translucent - barely visible white card

**Root Causes**:
1. **Audio Index Mismatch**: Code used `audioClips[boundary.sectionIndex]` but after clip reordering, `sectionIndex` (frontend order) doesn't match the TTS audio order.
2. **Negative Speed**: When closing section starts at 70s but `mustEndBy = 58s`, `availableTime = -12s`, causing negative speed.
3. **End Card Layout**: `pt-[400px]` pushed content down, missing `justify-center`.

**n8n Workflow Fixes** (workflow ID: `Qo2sirL0cDI2fVNQMJ5Eq`):

1. **`prepare body for jsontovideo to set video`** node - Audio index fix:
   ```javascript
   // BEFORE: audioClips[boundary.sectionIndex]  // WRONG
   // AFTER: Use loop index
   for (let i = 0; i < sectionBoundaries.length; i++) {
     const audioClip = audioClips[i];
   ```

2. **Negative speed guard**:
   ```javascript
   if (availableTime <= 0) {
     availableTime = actualDuration;
     narrationStart = Math.max(INTRO_SILENCE, mustEndBy - actualDuration);
   }
   ```

3. **End card HTML**: Changed `pt-[400px]` → `justify-center`

### 2025-01-17: Fix Audio Overlap - Speed-Adjusted Playback Duration

**Problem** (Execution 8805): Audio clips overlapping at 0:12-0:14.

**Evidence**:
```
Audio 1: start=2s, duration=11.886s, speed=1.3
Audio 2: start=10s, duration=5.851s, speed=1.17
```

**Root Cause**: Code didn't account for speed-adjusted playback duration:
- Audio 1 actual end = 2 + (11.886 / 1.3) = **11.14s**
- Audio 2 starts at **10s** → OVERLAP

**n8n Workflow Fix** (workflow ID: `Qo2sirL0cDI2fVNQMJ5Eq`):

**`prepare body for jsontovideo to set video`** node:

1. **Track actual end time**:
   ```javascript
   let previousAudioEndTime = 0;
   const actualPlaybackDuration = actualDuration / speed;
   const endsAt = narrationStart + actualPlaybackDuration;
   previousAudioEndTime = endsAt;
   ```

2. **Overlap prevention**:
   ```javascript
   narrationStart = Math.max(imageBasedStart, previousAudioEndTime);
   ```

3. **Built-in overlap detection**:
   ```javascript
   for (let i = 1; i < audioElements.length; i++) {
     const prevEnd = prev.start + (prev.duration / (prev.speed || 1));
     if (curr.start < prevEnd) {
       console.error(`OVERLAP DETECTED`);
     }
   }
   ```

**Expected Console Output**:
```
Section "opening": start=2.0s, TTS=11.9s (speed: 1.30x), ends=11.1s
Section "outdoor": start=11.1s, TTS=5.9s, ends=17.0s [DELAYED - prev audio still playing]
```

**Current State**: Video generation working with:
- Contiguous clip reordering by section
- Speed-adjusted overlap prevention
- HTML end card with Tailwind CSS (circular headshot, agent info)
- Boxed-word subtitles with yellow highlight

### 2025-01-17: Fix Nano-Banana Image Mirroring

**Problem**: The `google/nano-banana-edit` model was mirroring/flipping images to extend them to 9:16 aspect ratio. This created an uncanny visual effect (room reflected upside-down) that caused strange artifacts when animated with Kling AI.

**Solution**: Updated the prompt in `Create task on kie to optimize images` node to explicitly:
1. Prohibit mirroring, flipping, or reflection
2. Use solid color extension (sample dominant color from edges)
3. For interiors: ceiling/wall color at top, floor color at bottom

**n8n Workflow Fix** (workflow ID: `Qo2sirL0cDI2fVNQMJ5Eq`):

**`Create task on kie to optimize images`** node - New prompt:
```
Convert this image to 9:16 vertical aspect ratio (1080x1920). CRITICAL RULES:
1) DO NOT mirror, flip, or reflect any part of the image.
2) DO NOT duplicate or repeat any content.
3) Keep the original image perfectly intact and centered.
4) For extension areas: sample the dominant color from the nearest edge
   (top edge color for top extension, bottom edge color for bottom extension)
   and fill with that solid color or a subtle gradient.
5) For interior room photos: extend top with ceiling/wall color, extend bottom with floor color.
6) The result should look like the original photo with clean solid-color letterbox bars,
   NOT a mirrored reflection.
Output high-definition PNG.
```

**Expected Result**: Images extended with clean solid-color bars (letterbox style) instead of mirrored reflections. Better for Kling AI animation since there's no duplicate/reflected content to cause motion artifacts.

### 2025-01-17: Frontend Property Data Persistence

**Feature**: Added localStorage persistence for property data in Step 0 (DATA) wizard step.

**Changes** (`src/components/wizard/steps/property-data-step.tsx`):
- Save property data to localStorage on form submit
- Load saved property data on mount (if wizard state is empty)
- Fields persisted: address, city, state, zip, propertyType, beds, baths, sqft, lot, price, description, POIs

**Benefit**: Users can quickly create new videos with the same property but different photos without re-entering all property details.
