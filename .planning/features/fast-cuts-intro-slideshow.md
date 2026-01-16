# Feature: Fast-Cuts Intro Slideshow

## Status: PLANNED (not yet implemented)

## Overview

Add a 5-second intro slideshow with ramping hard cuts that plays before the main Kling AI video. The opening narration plays during this slideshow, creating an immediate hook.

**Key Requirements:**
- Fixed 5-second duration
- Ramping timing: 1.5s first, 1.0s second, then blitz
- Ends on image[0] (seamless transition to Kling video)
- Music starts at video start
- Opening narration plays during slideshow
- Skip slideshow if render fails (graceful fallback)

---

## Part 1: Frontend - Cap Opening Script

### File: `src/app/api/script/generate/route.ts`

Add hard cap for opening section to fit within 5 seconds (~12 words at 150 WPM):

```javascript
// Add constant near line 160
const OPENING_MAX_WORDS = 12; // Hard cap for slideshow compatibility

// Modify calculateSectionWordBudgets() around line 176
function calculateSectionWordBudgets(sectionGroups) {
  return SECTION_CONFIG.map((config) => {
    if (config.type === 'opening') {
      // Opening has hard cap for slideshow sync
      return {
        type: config.type,
        title: config.title,
        imageCount: sectionGroups.get(config.type)?.length || 0,
        clipSeconds: 5,
        targetWords: OPENING_MAX_WORDS // Hard cap
      };
    }
    // ... existing logic for other sections
  });
}
```

Also update GPT prompt (around line 480) to enforce:
```
CRITICAL: Opening section MAXIMUM 12 words. Must hook viewers immediately.
```

---

## Part 2: n8n Workflow - Slideshow Generation

### New Nodes to Add

Add these nodes after "Get duration of voices" and before "prepare body for jsontovideo to set video":

#### Node 1: "Prepare Slideshow Payload" (Code)

```javascript
// Calculate ramping timings for slideshow
function calculateSlideshowTimings(imageCount) {
  const TOTAL = 5.0;
  const FIRST = 1.5;
  const SECOND = 1.0;
  const blitzTime = TOTAL - FIRST - SECOND; // 2.5s

  const sequence = [];
  let currentTime = 0;

  // First image (hero) - 1.5s
  sequence.push({ index: 0, duration: FIRST, start: currentTime });
  currentTime += FIRST;

  if (imageCount >= 2) {
    // Second image - 1.0s
    sequence.push({ index: 1, duration: SECOND, start: currentTime });
    currentTime += SECOND;

    if (imageCount > 2) {
      // Blitz: images 2..N-1, then back to image[0]
      const blitzCount = imageCount - 2 + 1; // +1 for final image[0]
      const blitzDur = Math.max(blitzTime / blitzCount, 0.15);

      for (let i = 2; i < imageCount; i++) {
        sequence.push({ index: i, duration: blitzDur, start: currentTime });
        currentTime += blitzDur;
      }
      // End on image[0]
      sequence.push({ index: 0, duration: blitzDur, start: currentTime });
    } else {
      // Only 2 images - show image[0] again
      sequence.push({ index: 0, duration: blitzTime, start: currentTime });
    }
  }

  // Normalize to exactly 5 seconds
  const total = sequence.reduce((sum, s) => sum + s.duration, 0);
  const scale = TOTAL / total;
  let t = 0;
  return sequence.map(s => {
    const result = { index: s.index, duration: +(s.duration * scale).toFixed(3), start: +t.toFixed(3) };
    t += result.duration;
    return result;
  });
}

// Get data
const webhookData = $('Webhook').first().json.body;
const data = Array.isArray(webhookData) ? webhookData[0] : webhookData;
const images = data.images || [];
const musicUrl = data.music;

// Get opening audio (first TTS result, sectionIndex 0)
const audioItems = $('Get duration of voices').all();
const openingAudio = audioItems.find(a => {
  // Find opening section audio
  const sectionMapping = data.sectionImageMapping || [];
  const openingSection = sectionMapping.find(s => s.sectionType === 'opening');
  return openingSection && a.json.data;
});

if (!openingAudio || images.length === 0) {
  return [{ json: { skipSlideshow: true, reason: 'NO_DATA' } }];
}

const openingUrl = openingAudio.json.data.url;
const openingDuration = Number(openingAudio.json.data.duration) || 0;
const timings = calculateSlideshowTimings(images.length);

// Build json2video payload
const imageElements = timings.map(t => ({
  type: 'image',
  src: images[t.index].imageurl,
  start: t.start,
  duration: t.duration,
  width: 1080,
  height: 1920
}));

const payload = {
  resolution: 'custom',
  width: 1080,
  height: 1920,
  quality: 'high',
  scenes: [{
    duration: 5.0,
    elements: [
      { type: 'shape', shape: 'rect', width: 1080, height: 1920, color: '#000000' },
      ...imageElements
    ]
  }]
};

console.log('Slideshow timings:', JSON.stringify(timings));
console.log('Image count:', images.length);

return [{ json: { payload, skipSlideshow: false, openingUrl, openingDuration } }];
```

#### Node 2: "Render Slideshow" (HTTP Request)
- Method: POST
- URL: `https://api.json2video.com/v2/movies`
- Headers: `x-api-key: {{$credentials.json2videoApi.apiKey}}`
- Body: `{{ $json.payload }}`
- On Error: Continue (don't fail workflow)

#### Node 3: "Wait 10 sec (slideshow)" (Wait)
- Wait: 10 seconds

#### Node 4: "Get Slideshow Status" (HTTP Request)
- Method: GET
- URL: `https://api.json2video.com/v2/movies/{{ $('Render Slideshow').item.json.project }}`
- On Error: Continue

#### Node 5: "Check Slideshow Ready" (If)
- Condition: `{{ $json.movie.status === 'done' }}`
- True: Continue to merge
- False: Loop back to wait (or skip after 3 attempts)

#### Node 6: "Slideshow Failed Handler" (Set)
- Set: `skipSlideshow = true`

---

## Part 3: Merge Slideshow with Main Video

### Modify: "Make body for jsontovideo Api to merge videos clips"

```javascript
// Check if slideshow succeeded
const slideshowResult = $('Get Slideshow Status').first()?.json;
const hasSlideshow = slideshowResult?.movie?.status === 'done' && slideshowResult?.movie?.url;

// Get Kling video URLs
const items = $input.all();
const videoUrls = items.map(item => item.json.movie.url);

let scenes = [];

if (hasSlideshow) {
  // Prepend slideshow
  console.log('Prepending 5s slideshow to main video');
  scenes.push({
    comment: 'Intro slideshow',
    elements: [{ type: 'video', src: slideshowResult.movie.url }]
  });
}

// Add all Kling clips
videoUrls.forEach((url, i) => {
  scenes.push({
    elements: [{ type: 'video', src: url }]
  });
});

const payload = {
  resolution: 'custom',
  width: 1080,
  height: 1920,
  quality: 'high',
  scenes
};

return [{ json: { payload, hasSlideshow } }];
```

---

## Part 4: Adjust Narration Timing

### Modify: "prepare body for jsontovideo to set video"

```javascript
// At the top, check if slideshow was used
const mergeResult = $('Make body for jsontovideo Api to merge videos clips').first()?.json;
const hasSlideshow = mergeResult?.hasSlideshow || false;
const SLIDESHOW_DURATION = hasSlideshow ? 5.0 : 0;

// ... existing code ...

let currentTime = 0.5; // Start narration 0.5s into video

// 1. OPENING - plays during slideshow (or at start if no slideshow)
if (openingSection) {
  const openingClip = audioClips[openingSection.sectionIndex];
  if (openingClip) {
    console.log(`Opening narration: start=0.5s (during ${hasSlideshow ? 'slideshow' : 'first clip'})`);
    timeline.push({
      type: 'audio',
      src: openingClip.url,
      start: 0.5, // Always starts at 0.5s
      duration: openingClip.duration,
      loop: 0,
      volume: 2
    });
    currentTime = 0.5 + openingClip.duration;
  }
}

// 2. MIDDLE SECTIONS - offset by slideshow duration
for (const sectionData of middleSections) {
  const firstImageIndex = sectionData.imageIndices.length > 0
    ? Math.min(...sectionData.imageIndices)
    : 0;

  // Account for slideshow offset: image timing starts AFTER slideshow
  const imageStartTime = SLIDESHOW_DURATION + (firstImageIndex * CLIP_DURATION);

  const startTime = Math.max(imageStartTime, currentTime);
  // ... rest unchanged
}
```

**Key insight:** The slideshow is just images (no audio). Opening narration plays at 0.5s in the final composition, which overlays the slideshow visually. Music is added in the final step and gets ducked during all narration.

---

## Part 5: Adjust Music Ducking

### Modify: "get video metadata to add music"

```javascript
// Account for slideshow duration in music timing
const hasSlideshow = $('Make body for jsontovideo Api to merge videos clips').first()?.json?.hasSlideshow;
const SLIDESHOW_OFFSET = hasSlideshow ? 5.0 : 0;

// When building starts/durations arrays, add offset
const starts = timeline.map(t => t.start + SLIDESHOW_OFFSET);
```

---

## Verification

1. **Console logs should show:**
   - `Slideshow timings: [{"index":0,"duration":1.5,"start":0}, ...]`
   - `Prepending 5s slideshow to main video`
   - `Opening narration: start=0.5s (during slideshow)`

2. **Video output:**
   - First 5 seconds: Fast-cut slideshow with opening narration
   - Seamless transition to Kling video starting with same image
   - No duplicate opening narration

3. **Fallback test:**
   - If json2video fails for slideshow, main video renders normally
   - Console shows: `Slideshow skipped - using main video only`

---

## Files to Modify

| File | Change |
|------|--------|
| `src/app/api/script/generate/route.ts` | Add OPENING_MAX_WORDS = 12, update GPT prompt |
| `Shawheen Youtube Video.json` | Add 5 new nodes for slideshow generation |
| `Shawheen Youtube Video.json` | Modify merge, narration, and music nodes |

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Only 5 images | Slideshow: 1.5s, 1.0s, 0.83s×3 ending on image[0] |
| 15 images | Blitz cuts ~0.18s each |
| Slideshow render fails | Skip slideshow, use current flow |
| Opening narration > 5s | Audio continues into main video (OK) |
| Opening narration < 5s | Brief visual-only period before next section |

---

## Implementation Order

1. **First:** Test current fix (opening at 2s) - may not need slideshow
2. **If needed:** Implement frontend opening word cap (Part 1)
3. **Then:** Add n8n slideshow nodes (Part 2)
4. **Then:** Modify merge logic (Part 3)
5. **Then:** Adjust narration timing (Part 4)
6. **Finally:** Adjust music ducking (Part 5)
