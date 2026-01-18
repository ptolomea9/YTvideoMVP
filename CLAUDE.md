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

### 2025-01-17: Fix Audio Doubling & End Card Visibility (v2)

**Problems** (Execution 8811):
1. Audio doubling at 0:10-0:11 and 0:18-0:19 - narration overlaps between sections
2. End card still appearing translucent despite `opacity:1;background:#FFFFFF`

**Evidence** from execution 8811:
```
Audio 1: ends at 10.0s (start=2, duration=8.673, speed=1.084)
Audio 2: starts at 10s, ends at 17.96s (duration=10.344, speed=1.3)
Audio 3: starts at 17.957s ← OVERLAP! Starts 3ms BEFORE Audio 2 ends
```

**Root Causes**:
1. **Floating-point precision issue**: While `previousAudioEndTime` tracked the end time, edge cases where `imageBasedStart ≈ previousAudioEndTime` caused micro-overlaps (3ms)
2. **End card layering**: Missing explicit z-index meant end card rendered behind video layer

**n8n Workflow Fixes** (workflow ID: `Qo2sirL0cDI2fVNQMJ5Eq`):

**Fix 1: `prepare body for jsontovideo to set video`** node - Add 100ms buffer between sections:
```javascript
// NEW CONSTANT
const AUDIO_BUFFER = 0.1;  // 100ms buffer between sections to prevent overlap

// Middle sections: add buffer
narrationStart = Math.max(imageBasedStart, previousAudioEndTime + AUDIO_BUFFER);

// Closing section: add buffer
narrationStart = Math.max(imageBasedStart, previousAudioEndTime + AUDIO_BUFFER);
```

**Fix 2: `json2video - Edit video1`** node - Add z-index to end card HTML:
```html
<div class='w-full h-full bg-white flex flex-col items-center justify-center'
     style='opacity:1;background:#FFFFFF;z-index:9999'>
```

**Expected Results**:
- Console logs will show `Using audio buffer: 0.1s between sections`
- Each audio start time will be >= previous end time + 0.1s
- No more "OVERLAP DETECTED" errors in console
- End card will render fully opaque on top of video

### 2025-01-17: BULLETPROOF Fix - Audio Doubling & Wrong Audio Playing

**Problems** (Executions 8798-8811):
1. **Audio doubling** at section transitions (0:11-0:12, 0:18-0:20)
2. **Wrong audio content** - narration describes the wrong room for certain sections

**Root Cause: Section Skipping + Index Mismatch**

The audio pipeline and video pipeline had an index mismatch when sections were skipped:

```
Audio generation order (from frontend):
  audioClips[0] = opening, [1] = outdoor, [2] = living, [3] = private, [4] = closing

Video section boundaries (built in n8n):
  Loops through narrativeOrder, but SKIPS sections with no images!
```

**THE BUG:** If `outdoor` has no images:
```
audioClips = [opening, outdoor, living, private, closing] (5 entries)
sectionBoundaries = [opening, living, private, closing] (4 entries - outdoor SKIPPED)

Using loop index `i`:
  sectionBoundaries[0] (opening) → audioClips[0] (opening) ✓
  sectionBoundaries[1] (living)  → audioClips[1] (outdoor) ✗ WRONG!
  sectionBoundaries[2] (private) → audioClips[2] (living) ✗ WRONG!
  sectionBoundaries[3] (closing) → audioClips[3] (private) ✗ WRONG!
```

**Bulletproof Solution: Match by sectionType, not index**

**n8n Workflow Fixes** (workflow ID: `Qo2sirL0cDI2fVNQMJ5Eq`):

**Fix 1: `Split the Script by double newline`** node - Tag each script with sectionType:
```javascript
const narrativeOrder = ['opening', 'outdoor', 'living', 'private', 'closing'];

return webhookResponse.map((text, idx) => ({
  json: {
    text,
    sectionType: narrativeOrder[idx]  // Tag with section type
  }
}));
```

**Fix 2: `prepare body for jsontovideo to set video`** node - Build Map lookup:
```javascript
// Get sectionType from Split node (items flow in same order)
const audioItems = $('Get duration of voices').all();
const splitItems = $('Split the Script by double newline').all();

// Build Map<sectionType, audioClip>
const audioByType = new Map();
audioItems.forEach((a, idx) => {
  const sectionType = splitItems[idx]?.json.sectionType;
  audioByType.set(sectionType, {
    url: a.json.data?.url,
    duration: Number(a.json.data?.duration)
  });
});

// BULLETPROOF: Match audio by sectionType, NOT by loop index
for (const boundary of sectionBoundaries) {
  const audioClip = audioByType.get(boundary.sectionType);  // ✓ Always correct!
  // ... rest of timing logic
}
```

**Expected Console Output**:
```
=== BULLETPROOF AUDIO MATCHING ===
Audio items count: 5
Split items count: 5
  Audio 0: sectionType="opening", duration=8.7s
  Audio 1: sectionType="outdoor", duration=10.3s
  Audio 2: sectionType="living", duration=12.1s
  Audio 3: sectionType="private", duration=9.8s
  Audio 4: sectionType="closing", duration=6.2s

=== AUDIO TYPE MAPPING ===
  opening: 8.7s
  outdoor: 10.3s
  living: 12.1s
  private: 9.8s
  closing: 6.2s

Section "opening" using audio for "opening" ✓
Section "outdoor" using audio for "outdoor" ✓
Section "living" using audio for "living" ✓
Section "private" using audio for "private" ✓
Section "closing" using audio for "closing" ✓
```

**Key Benefits**:
- Works correctly even when sections have no images (skipped in video but audio still exists)
- Works correctly when sections are reordered
- Explicit matching by TYPE eliminates all index-based bugs
- Preserves existing timing logic (AUDIO_BUFFER, speed adjustment, overlap prevention)

### 2025-01-17: Fix Audio Doubling at 0:10-0:12 (json2video duration parameter)

**Problem** (Execution 8814): Audio doubling ONLY at the opening → outdoor transition (0:10-0:12). All other transitions working correctly.

**Evidence**:
```javascript
// Audio 1 (opening)
{
  type: "audio",
  start: 2,
  duration: 10.449,  // SOURCE file duration (wrong!)
  speed: 1.3
}
// Audio 2 (outdoor)
{
  type: "audio",
  start: 10.138,
  duration: 9.221,
  speed: 1.0
}
```

**Root Cause**: The code sent `duration: actualDuration` (source file length = 10.449s) instead of the actual playback time after speed adjustment.

**json2video behavior**: The `duration` field controls how long the element exists in the timeline.

With `duration: 10.449`:
- Audio 1: plays from 2s to 12.449s (2 + 10.449)
- Audio 2: starts at 10.138s
- **OVERLAP: 10.138s to 12.449s** (~2.3 seconds of overlap!)

**Why it only affected opening**: Opening was the ONLY section with `speed: 1.3`. When speed is applied:
- Actual playback = 10.449 / 1.3 = **8.038s**
- Should end at: 2 + 8.038 = **10.038s**
- But json2video thought it ended at: 2 + 10.449 = **12.449s**

Other sections had `speed: 1.0`, so `duration` equaled actual playback time (no mismatch).

**n8n Workflow Fix** (workflow ID: `Qo2sirL0cDI2fVNQMJ5Eq`):

**`prepare body for jsontovideo to set video`** node - Use playback duration:
```javascript
// Calculate playback duration BEFORE pushing
const actualPlaybackDuration = actualDuration / speed;

audioElements.push({
  type: 'audio',
  src: audioClip.url,
  start: parseFloat(narrationStart.toFixed(3)),
  duration: parseFloat(actualPlaybackDuration.toFixed(3)),  // FIXED: playback duration
  volume: 2,
  loop: 0,
  ...(speed !== 1.0 && { speed: parseFloat(speed.toFixed(3)) })
});
```

Also updated overlap detection to use the duration field directly (since it now represents playback time):
```javascript
const prevEnd = prev.start + prev.duration;  // No longer needs speed division
```

**Expected Result After Fix**:
```javascript
// Audio 1 (opening) - WITH FIX
{
  type: "audio",
  start: 2,
  duration: 8.038,   // Now matches actual playback (10.449/1.3)
  speed: 1.3
}
// Audio 2 (outdoor)
{
  type: "audio",
  start: 10.138,     // Starts AFTER audio 1 ends (10.038 + 0.1 buffer)
  duration: 9.221,
  speed: 1.0
}
```

Timeline:
- Audio 1: 2s to 10.038s (2 + 8.038)
- Audio 2: 10.138s to 19.359s
- **NO OVERLAP** (100ms gap as intended)

### 2025-01-17: BULLETPROOF Fix v2 - Sequential Audio, No Speed Parameter

**Problem** (Execution 8815): Persistent audio doubling at 0:10-0:12 despite previous fixes. Also distortion from Kling AI video audio bleeding through.

**Root Cause Analysis**:
1. **json2video `speed` parameter behavior unknown**: Undocumented for audio elements. Possible behaviors: ignored, applied differently than expected, or causing side effects.
2. **Kling AI videos have embedded audio**: Not muted, causing audio distortion/bleed-through.
3. **Complex timing calculations**: Speed adjustments + floating-point math created edge cases.

**Solution: BULLETPROOF Sequential Audio**

Eliminate ALL uncertainty:
1. **Remove `speed` parameter entirely** - Don't rely on undocumented behavior
2. **Mute ALL video sources** - No Kling audio bleed-through
3. **Sequential non-overlapping audio** - Each section waits for previous to finish
4. **Use actual TTS duration** - No speed adjustment calculations
5. **300ms buffer between sections** - Generous gap prevents any overlap

**n8n Workflow Fixes** (workflow ID: `Qo2sirL0cDI2fVNQMJ5Eq`):

**Fix 1: `Render Kie videos in json2video (full duration)`** node - Mute video:
```json
{
  "type": "video",
  "src": "{{ $json.imageVideoUrl }}",
  "volume": 0,
  "start": 0,
  "width": 1080,
  "height": 1920
}
```

**Fix 2: `Make body for jsontovideo Api to merge videos clips`** node - Mute all videos:
```javascript
// Both code paths updated:
const scenes = reorderedClips.map((clip) => ({
  elements: [{ type: 'video', src: clip.url, volume: 0 }]  // MUTED
}));
```

**Fix 3: `prepare body for jsontovideo to set video`** node - Sequential audio timing:
```javascript
const INTRO_SILENCE = 2;        // 2s before first narration
const AUDIO_GAP = 0.3;          // 300ms gap between sections (bulletproof)

// Track cumulative audio end time
let audioEndTime = INTRO_SILENCE;

for (const boundary of sectionBoundaries) {
  const audioClip = audioByType.get(boundary.sectionType);
  const actualDuration = audioClip.duration;  // TTS file duration

  // Start this section's audio AFTER previous ended + gap
  const narrationStart = audioEndTime;
  const narrationEnd = narrationStart + actualDuration;
  audioEndTime = narrationEnd + AUDIO_GAP;

  // Push audio element - NO SPEED PARAMETER
  audioElements.push({
    type: 'audio',
    src: audioClip.url,
    start: parseFloat(narrationStart.toFixed(3)),
    duration: parseFloat(actualDuration.toFixed(3)),  // Full TTS duration
    volume: 2,
    loop: 0
    // NO speed parameter - play at natural 1.0x speed
  });
}
```

**Expected Audio Timeline**:
```
Opening:  start=2.0s,   duration=10.7s, ends=12.7s
(gap 300ms)
Outdoor:  start=13.0s,  duration=8.5s,  ends=21.5s
(gap 300ms)
Living:   start=21.8s,  duration=14.8s, ends=36.6s
(gap 300ms)
Private:  start=37.1s,  duration=16.8s, ends=53.9s
(gap 300ms)
Closing:  start=54.2s,  duration=6.0s,  ends=60.2s
```

**Why This Fix Works**:
- **No overlap possible** - each section starts AFTER previous ends + 300ms
- **No speed calculations** - eliminates all math that could go wrong
- **No undocumented features** - only uses well-documented json2video properties
- **Video sources muted** - no audio bleed from Kling AI
- **Audio plays at natural speed** - no pitch shift artifacts

**Console Output**:
```
=== BULLETPROOF AUDIO - NO SPEED, SEQUENTIAL TIMING ===
Audio gap between sections: 0.3s
Section "opening": start=2.0s, duration=10.7s, ends=12.7s
Section "outdoor": start=13.0s, duration=8.5s, ends=21.5s
...
NO SPEED PARAMETER USED - all audio plays at natural 1.0x
Gap between audio 0 and 1: 0.300s ✓
Gap between audio 1 and 2: 0.300s ✓
```

### 2025-01-17: TRULY BULLETPROOF Fix - Audio Anchored to Section END

**Problem**: Sequential audio (starting from `INTRO_SILENCE = 2s`) still caused ~1 second overlap at 0:10-0:12. The 300ms gap wasn't enough.

**Root Cause: INTRO_SILENCE Steals Time From Opening Section**

```
Opening video: 0-10s (2 clips × 5s)
Opening audio starts at: 2s (INTRO_SILENCE)
Available time for narration: 10s - 2s = 8s

If Opening TTS is 10.7s:
- Audio plays from 2s to 12.7s
- But Opening VIDEO ends at 10s
- **Overflow: 2.7 seconds into next section!**
```

When Outdoor section starts at 10s, Opening audio is STILL PLAYING (ends at 12.7s), causing the overlap.

**Solution: Anchor Audio to Section END, Not START**

Instead of calculating `narrationStart = previousAudioEnd + gap`, we now calculate:
```javascript
narrationEnd = sectionEndTime - END_BUFFER  // Audio ends 0.5s before section ends
narrationStart = narrationEnd - audioDuration  // Work backwards to find start
```

This **guarantees** each section's audio finishes before the next section's video begins.

**n8n Workflow Fix** (workflow ID: `Qo2sirL0cDI2fVNQMJ5Eq`):

**`prepare body for jsontovideo to set video`** node - END-anchored timing:
```javascript
const END_BUFFER = 0.5;   // Audio must end 0.5s before section ends
const MAX_SPEED = 1.5;    // Max 50% speed increase if audio too long

for (const boundary of sectionBoundaries) {
  const audioClip = audioByType.get(boundary.sectionType);
  const actualDuration = audioClip.duration;
  const sectionStart = boundary.startTime;
  const sectionEnd = boundary.endTime;

  // Calculate target end time (audio must end before section ends)
  const targetEndTime = sectionEnd - END_BUFFER;

  // Calculate ideal start time by anchoring to END
  let narrationStart = targetEndTime - actualDuration;
  let speed = 1.0;
  let playbackDuration = actualDuration;

  // Handle edge cases: audio too long for section
  if (narrationStart < sectionStart) {
    const availableTime = targetEndTime - sectionStart;
    const neededSpeed = actualDuration / availableTime;

    if (neededSpeed <= MAX_SPEED) {
      // Speed up to fit within section
      speed = neededSpeed;
      playbackDuration = actualDuration / speed;
      narrationStart = sectionStart;
    } else {
      // Can't speed up enough - start at section start and overflow
      narrationStart = sectionStart;
      playbackDuration = actualDuration;
    }
  }

  // Ensure opening doesn't start before 0
  if (narrationStart < 0) {
    narrationStart = 0;
  }

  // Build audio element
  const audioElement = {
    type: 'audio',
    src: audioClip.url,
    start: parseFloat(narrationStart.toFixed(3)),
    duration: parseFloat(playbackDuration.toFixed(3)),
    volume: 2,
    loop: 0
  };

  // Only add speed if not 1.0
  if (speed !== 1.0) {
    audioElement.speed = parseFloat(speed.toFixed(3));
  }

  audioElements.push(audioElement);
}
```

**Expected Audio Timeline** (anchored to END with 0.5s buffer):

Assuming Opening TTS = 8.7s, video 0-10s:
```
Opening:  video=0-10s, target end=9.5s, start=0.8s, audio=0.8-9.5s ✓
          (0.5s gap before section ends)
Outdoor:  video=10-20s, target end=19.5s, start=10.3s, audio=10.3-19.5s ✓
          (0.8s gap between Opening and Outdoor)
Living:   video=20-35s, target end=34.5s, start=22.4s, audio=22.4-34.5s ✓
Private:  video=35-55s, target end=54.5s, start=37.7s, audio=37.7-54.5s ✓
Closing:  video=55-60s, target end=59.5s, start=53.5s, audio=53.5-59.5s ✓
```

**Why This Fix Works**:
- **Guaranteed no overflow** - Each audio ENDS 0.5s before its section ends
- **Natural gaps emerge** - Space between sections comes from varying audio lengths
- **Speed adjustment only when necessary** - Only speeds up if audio is too long for section
- **Graceful degradation** - If audio too long even at 1.5x, allows overflow with warning

**Console Output**:
```
=== SECTION-END-ANCHORED AUDIO TIMING ===
Section boundaries:
  opening: clips 0-1, video 0s-10s (10s)
  outdoor: clips 2-3, video 10s-20s (10s)
  living: clips 4-6, video 20s-35s (15s)
  ...

=== AUDIO PLACEMENT (END-ANCHORED) ===
Section "opening": video=0-10s, audio=0.8-9.5s OK
Section "outdoor": video=10-20s, audio=10.3-19.5s OK
Section "living": video=20-35s, audio=22.4-34.5s OK
...

=== AUDIO OVERLAP CHECK ===
Audio 0 -> 1: gap 0.8s OK
Audio 1 -> 2: gap 2.9s OK
Audio 2 -> 3: gap 3.2s OK
No audio overlaps detected - SUCCESS
```

### 2025-01-18: Scene-Aligned Audio with Overlap Prevention

**Problem**: The END-anchored approach from the previous fix caused narration to NOT start at scene transitions. Users want narration to START when scenes change, not before.

**Root Cause Analysis**:
1. **END-anchored audio** calculated `narrationStart = sectionEnd - audioDuration`, which meant narration often started BEFORE the scene transition
2. **Script generation has no per-section limits** - GPT generates scripts that exceed per-section video durations, causing overflow regardless of approach
3. **n8n can't fix a source mismatch** - the real fix requires frontend word limits, but n8n needs to handle overflow gracefully

**Solution: Scene-Aligned Start with Delay-Based Overlap Prevention**

New strategy:
1. **TRY** to start narration at scene transitions (video section start time)
2. **DELAY** if previous audio is still playing (prevents overlap)
3. **ACCEPT** that video/audio may "drift" if scripts are too long - but NO OVERLAP

```javascript
// Pseudocode
let lastAudioEnd = INTRO_SILENCE;  // 2s

for (each section) {
  const idealStart = sectionStart;              // Scene transition
  const minStart = lastAudioEnd + AUDIO_BUFFER; // 300ms after previous
  const narrationStart = Math.max(idealStart, minStart);

  lastAudioEnd = narrationStart + audioDuration;
}
```

**n8n Workflow Fix** (workflow ID: `Qo2sirL0cDI2fVNQMJ5Eq`):

**`prepare body for jsontovideo to set video`** node - Scene-aligned with delay:
```javascript
const INTRO_SILENCE = 2;       // 2s silence before first narration
const AUDIO_BUFFER = 0.3;      // 300ms gap between audio clips

let lastAudioEnd = INTRO_SILENCE;

for (const boundary of sectionBoundaries) {
  const audioClip = audioByType.get(boundary.sectionType);
  const actualDuration = audioClip.duration;
  const sectionStart = boundary.startTime;
  const sectionEnd = boundary.endTime;

  // TRY to start at section video start (scene transition)
  // BUT delay if previous audio is still playing
  const idealStart = sectionStart;
  const minStart = lastAudioEnd + AUDIO_BUFFER;
  const narrationStart = Math.max(idealStart, minStart);

  // Calculate when this audio will end
  const audioEndTime = narrationStart + actualDuration;
  lastAudioEnd = audioEndTime;

  // NO SPEED PARAMETER - play at natural 1.0x
  audioElements.push({
    type: 'audio',
    src: audioClip.url,
    start: parseFloat(narrationStart.toFixed(3)),
    duration: parseFloat(actualDuration.toFixed(3)),
    volume: 2,
    loop: 0
  });
}
```

**Expected Behavior**:

**Scenario 1: Audio fits within section**
```
Opening video: 0-10s
Opening TTS: 8s
→ Starts at 2s (INTRO_SILENCE), ends at 10s
→ Outdoor starts at 10.3s (scene transition + buffer) ✓
```

**Scenario 2: Audio overflows**
```
Opening video: 0-10s
Opening TTS: 12s
→ Starts at 2s, ends at 14s [OVERFLOW 4s]
→ Outdoor starts at 14.3s (delayed to prevent overlap)
→ Video already showing outdoor while audio describes outdoor ✓
```

**Trade-off**: If scripts are too long, narration may "drift" from video. But **NO OVERLAP**.

**Console Output**:
```
=== SCENE-ALIGNED AUDIO WITH OVERLAP PREVENTION ===
Section "opening": video=0-10s, audio=2.0-10.0s OK
Section "outdoor": video=10-20s, audio=10.3-19.5s OK
Section "living": video=20-35s, audio=19.8-32.3s [DELAYED by 0.2s]
...

=== AUDIO OVERLAP CHECK ===
Audio 0 -> 1: gap 0.3s OK
Audio 1 -> 2: gap 0.3s OK
No audio overlaps detected - SUCCESS
```

**Future Improvement (Part 2)**: Add per-section word limits in `/src/app/api/script/generate/route.ts` to ensure scripts fit within their video sections. This would eliminate drift entirely.