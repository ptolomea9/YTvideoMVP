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

### 2025-01-16: Fix json2video "shape" Element Error

**Problem**: json2video returned schema validation error:
```
"Object [movie/scenes[0]/elements[1]] does not match any of possible schemas: shape"
```

**Root Cause**: `"shape"` is not a valid json2video element type. Valid types are: `image`, `video`, `text`, `component`, `audio`, `voice`, `audiogram`, `subtitles`.

**n8n Workflow Fix** (workflow ID: `Qo2sirL0cDI2fVNQMJ5Eq`):

**`json2video - Edit video1`** node:
- Replaced invalid `type: "shape"` element with `type: "image"` using a white placeholder
- Changed from:
  ```json
  { "type": "shape", "shape": "rectangle", ... }
  ```
- Changed to:
  ```json
  { "type": "image", "src": "https://placehold.co/1080x1920/FFFFFF/FFFFFF.png", ... }
  ```
- The `placehold.co` service generates a solid white 1080x1920 PNG on the fly

**Verification**:
- No json2video schema error
- White overlay appears 6 seconds before video end
- End card text/headshot renders on top of white background
- Audio continues playing through the end

### 2025-01-16: Fix Captions, End Card, and Music Volume

**Problems**:
1. Captions (hormozi style) not appearing
2. End card text (agent_name, brand_name, phone, email) not showing - only headshot
3. Headshot still square, not circle
4. Music volume too loud

**Root Causes**: Invalid json2video properties based on API documentation:
- Subtitles: `style: "hormozi"` invalid, all font properties at wrong level
- Text elements: font properties at top level instead of inside `settings` object
- Headshot: `style: "circle"` and `object-fit: "cover"` are invalid properties

**n8n Workflow Fixes** (workflow ID: `Qo2sirL0cDI2fVNQMJ5Eq`):

1. **`json2video - Edit video1`** node - Subtitles element:
   - Moved all properties into `settings` object (required by json2video)
   - Changed `style` from `hormozi` to `boxed-word` (valid style that highlights current word)
   - Changed `stroke-color` to `outline-color`
   - Changed `highlight-color` to `word-color` (highlighted word)
   - Added `line-color` for non-highlighted text (#FFFFFF)
   - Correct structure:
   ```json
   {
     "type": "subtitles",
     "start": 0,
     "settings": {
       "style": "boxed-word",
       "position": "bottom-center",
       "y": 1300,
       "font-family": "Montserrat",
       "font-size": 90,
       "font-weight": "800",
       "line-color": "#FFFFFF",
       "word-color": "#FFDD00",
       "outline-color": "#000000",
       "outline-width": 4
     }
   }
   ```

2. **`json2video - Edit video1`** node - Text elements (agent_name, brand_name, phone, email):
   - Moved font properties into `settings` object
   - Changed `color` to `font-color`
   - Changed `font-size` from number (56) to string with units ("56px")
   - Correct structure:
   ```json
   {
     "type": "text",
     "text": "{{ $json.agent_name }}",
     "x": 0, "y": 880, "width": 1080,
     "fade-in": 0.4,
     "settings": {
       "font-family": "Roboto",
       "font-size": "56px",
       "font-weight": "700",
       "font-color": "#1A1A1A",
       "text-align": "center"
     }
   }
   ```

3. **`json2video - Edit video1`** node - Headshot image:
   - Removed invalid `style: "circle"` → use `mask: "circle"` instead
   - Removed invalid `object-fit: "cover"` → use `resize: "cover"` instead
   - Correct structure:
   ```json
   {
     "type": "image",
     "src": "{{ $json.headshot_url }}",
     "width": 300, "height": 300,
     "mask": "circle",
     "resize": "cover",
     "fade-in": 0.5
   }
   ```

4. **`Prepare body for jsontovideo to render video`** node - Music volume:
   - Reduced `MUSIC_HIGH`: `0.8` → `0.68` (15% reduction)
   - Reduced `MUSIC_LOW`: `0.15` → `0.13` (15% reduction)

**Valid json2video subtitle styles**: `classic`, `classic-progressive`, `classic-one-word`, `boxed-line`, `boxed-word`

**Verification**:
- [ ] Subtitles appear with word-by-word highlighting (yellow on white)
- [ ] End card shows circular headshot + all text (name, brand, phone, email)
- [ ] Music is 15% quieter
- [ ] No json2video API errors

### 2025-01-16: Fix End Card Layout - Headshot & Text Not Visible

**Problems**:
1. Headshot way too large, filling most of screen, off-center
2. End card text (agent_name, brand_name, phone, email) not visible
3. Only partial text "or Luxury Homes" showing at bottom

**Root Causes** (verified via json2video official docs):
1. **`resize: "cover"`** - Per docs: "width and height properties are IGNORED, element fills canvas"
2. **`mask: "circle"`** - Per docs: `mask` "accepts a PNG or video file URL", not string values
3. **Missing `position: "custom"`** - Per docs: x/y coordinates only work when `position: "custom"` is set

**n8n Workflow Fixes** (workflow ID: `Qo2sirL0cDI2fVNQMJ5Eq`):

**`json2video - Edit video1`** node:

1. **White background image**:
   - Added `position: "custom"` for x/y positioning to work

2. **Headshot image**:
   - REMOVED `resize: "cover"` (was causing width/height to be ignored!)
   - REMOVED `mask: "circle"` (invalid string value)
   - Added `position: "custom"` (required for x/y)
   - Changed y from 500 → 600 (better centering below headshot)

3. **All text elements (agent_name, brand_name, phone, email)**:
   - Added `position: "custom"` to each element
   - Adjusted y positions for proper spacing:
     - agent_name: y 880 → 950
     - brand_name: y 960 → 1030
     - phone: y 1100 → 1150
     - email: y 1160 → 1210

**Corrected element structure**:
```json
{
  "type": "image",
  "src": "{{ $json.headshot_url }}",
  "position": "custom",
  "start": "...",
  "x": 390,
  "y": 600,
  "width": 300,
  "height": 300,
  "fade-in": 0.5
}
```

```json
{
  "type": "text",
  "text": "{{ $json.agent_name }}",
  "position": "custom",
  "start": "...",
  "x": 0,
  "y": 950,
  "width": 1080,
  ...
}
```

**Key Changes Summary**:
| Element | Property | Old Value | New Value | Reason |
|---------|----------|-----------|-----------|--------|
| Headshot | resize | "cover" | REMOVED | Was ignoring width/height |
| Headshot | mask | "circle" | REMOVED | Invalid - needs PNG URL |
| Headshot | position | (missing) | "custom" | Required for x/y |
| Headshot | y | 500 | 600 | Better centering |
| White BG | position | (missing) | "custom" | Required for x/y |
| All Text | position | (missing) | "custom" | Required for x/y |

**Verification**:
- [ ] Headshot appears at 300x300 size, centered horizontally
- [ ] Agent name, brand, phone, email all visible on end card
- [ ] No json2video API errors
- [ ] End card layout properly spaced

### 2025-01-16: Natural Voice-to-Video Synchronization

**Problem**: Different ElevenLabs voices speak at different speeds (128-157 WPM = 23% variance). The previous aggressive word caps (150 max, 120 WPM) produced bland scripts lacking descriptive richness.

**Goal**: Allow rich, descriptive narration while handling voice speed variance gracefully.

**Strategy**: Rich scripts in frontend + tiered post-TTS adjustment in n8n.

**Frontend Changes** (`src/app/api/script/generate/route.ts`):
- `TTS_WORDS_PER_MINUTE`: 120 → 130 (balanced estimate)
- `MAX_TOTAL_WORDS`: 150 → 250 (allow richer scripts)
- Removed dynamic word budget calculation (n8n handles variance now)
- `max_tokens`: 800 → 1200 (support longer scripts)
- Updated GPT prompt to encourage richer descriptions (8-15 word sentences)
- Kept `temperature: 0.4` for consistency

**n8n Workflow Changes** (`prepare body for jsontovideo to set video` node):

Added tiered adjustment logic based on narration overrun:

| Overrun | Action | Result |
|---------|--------|--------|
| ≤0% | No change | Natural pacing |
| 1-8% | Speed up audio slightly | Imperceptible speed increase |
| 9-15% | Extend each image duration | Smooth video extension |
| >15% | Both: speed + extend | Rare edge case handled |

**Implementation Details**:
```javascript
// Calculate overrun
const totalNarrationDuration = audioClips.reduce((sum, clip) => sum + clip.duration, 0);
const availableTime = videoDuration - END_CARD_DURATION; // 6s for end card
const overrunPercent = (totalNarrationDuration - availableTime) / availableTime * 100;

// Apply tiered correction
if (overrunPercent <= 8) {
  audioSpeedMultiplier = 1 + (overrunPercent / 100);  // speed up audio
} else if (overrunPercent <= 15) {
  perImageExtension = overrun / imageCount;  // extend images
} else {
  // Both adjustments for large overruns
}

// Add speed property to audio elements when needed
if (audioSpeedMultiplier !== 1.0) {
  audioElement.speed = audioSpeedMultiplier;
}
```

**Console Logging**:
- `Narration: Xs, Available: Ys`
- `Overrun: Xs (Y%)`
- `SPEED: Audio sped up by X%` or `EXTEND: Each image extended by Xs`
- `Adjustment applied: none|speed|extend|both`

**Verification**:
- [ ] Script generation produces richer content (~200-250 words)
- [ ] Fast voice (157 WPM): narration fits, no adjustment
- [ ] Slow voice (128 WPM): appropriate adjustment applied
- [ ] Console shows overrun calculation and adjustment type
- [ ] Audio sounds natural (no perceptible speed change for ≤8%)
- [ ] Section-to-image pacing preserved (natural pauses between sections)

### 2025-01-16: Fix json2video API Rejection - Invalid Payload Field

**Problem**: Execution 8778 failed at `Get video status` node with error:
```
Error: Project ID must be a 16-character string. Received ID: '' (length: 0)
```

**Root Cause**: The `prepare body for jsontovideo to set video` node was adding an `_adjustmentInfo` object to the json2video API payload:

```javascript
const payload = {
  width: 1080,
  height: 1920,
  quality: 'high',
  resolution: 'custom',
  scenes: [...],
  _adjustmentInfo: { ... }  // ← Invalid field - not part of json2video schema
};
```

Json2video API rejected this payload due to the unexpected field, returning an error response without a `project` field. The `Get video status` node then failed because it couldn't access the project ID.

**n8n Workflow Fix** (workflow ID: `Qo2sirL0cDI2fVNQMJ5Eq`):

**`prepare body for jsontovideo to set video`** node:
- Removed `_adjustmentInfo` from the payload object
- Adjustment info was already being logged to console (no data loss)
- Verified no downstream nodes depend on `_adjustmentInfo`

**Before (broken)**:
```javascript
const payload = {
  width: 1080,
  height: 1920,
  scenes: [...],
  _adjustmentInfo: { applied, audioSpeedMultiplier, ... }
};
```

**After (fixed)**:
```javascript
// Payload for json2video API - no custom fields allowed
const payload = {
  width: 1080,
  height: 1920,
  scenes: [...]
};
// Adjustment info logged to console for debugging
```

**Verification**:
- [ ] `Call Jsontovideo to create task` returns valid project ID
- [ ] `Get video status` successfully polls status
- [ ] Console logs still show adjustment info for debugging
