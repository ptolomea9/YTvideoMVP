# Summary: 03-03 Image Processing (Kie.ai Resize)

## Clarification

The target workflow is **Youtube Video** (ID: `hjG60LIO86i5vxX3`), not Tour Video. Tour Video and Video Listing Main were reference workflows to help understand the integration patterns.

## What Was Built

Updated the Next.js integration to target the Youtube Video n8n workflow with correct payload format.

## Key Changes

### 1. n8n Client Updates (`src/lib/n8n/client.ts`)

Added `triggerYoutubeVideo()` function that:
- Targets the Youtube Video workflow webhook path
- **Wraps payload in an array** as required: `[payload]` → `body[0]`
- Follows same error handling patterns as `triggerTourVideo()`

### 2. Payload Field Name Fixes (`src/lib/n8n/transform.ts`)

Updated field names to match Youtube Video workflow expectations:
- `bedRoomCount` → `bedroomCount`
- `bathRoomCount` → `bathroomCount`

### 3. API Route Switch (`src/app/api/listings/create/route.ts`)

- Changed from `triggerTourVideo` to `triggerYoutubeVideo`
- Changed webhook URL from `tourVideo` to `youtubeVideo`

## Youtube Video Workflow Analysis

### Kie.ai Resize Node (Already Implemented)

The workflow has "Create task on kie to optimize images" node:

```json
{
  "model": "google/nano-banana-edit",
  "input": {
    "image_urls": ["{{ $json.imageurl }}"],
    "prompt": "Take the provided image of any size and convert it to vertical 9:16 aspect ratio (1080×1920)...",
    "output_format": "png",
    "image_size": "9:16"
  }
}
```

### Complete Pipeline (Already Built in n8n)

```
Webhook → Separate images
    ↓
Kie.ai resize (nano-banana-edit, 1080×1920)
    ↓
Poll status → Check success
    ↓
GPT-4o script generation from images
    ↓
ElevenLabs TTS → S3 upload
    ↓
Kling 2.6 image-to-video motion
    ↓
json2video renders (multiple passes)
    ↓
Final video with captions + music
    ↓
Email notification
```

## Payload Format

**What we send (wrapped in array):**
```typescript
[{
  images: [{ imageurl: "..." }],
  email: "user@example.com",
  voiceId: "...",
  music: "https://...",
  bedroomCount: "3",  // camelCase
  bathroomCount: "2", // camelCase
  // ... other fields
}]
```

**What workflow receives:**
```javascript
$('Webhook').first().json.body[0].images
$('Webhook').first().json.body[0].email
$('Webhook').first().json.body[0].bedroomCount
```

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/n8n/client.ts` | Added `triggerYoutubeVideo()` |
| `src/lib/n8n/transform.ts` | Fixed field names |
| `src/lib/n8n/index.ts` | Exported new function |
| `src/app/api/listings/create/route.ts` | Switched to Youtube Video |

## Workflow Details

- **Workflow ID**: `hjG60LIO86i5vxX3`
- **Webhook Path**: `f8982d9e-51cb-462b-a319-8d6e98a92f6d`
- **Base URL**: `https://edgeaimedia.app.n8n.cloud`

## Next Steps

The Youtube Video workflow is already complete with all steps:
- 03-03: Kie.ai resize ✓ (verified existing)
- 03-04: Kling 2.6 motion ✓ (verified existing)
- 03-05: ElevenLabs TTS ✓ (verified existing)
- 03-06: json2video render ✓ (verified existing)

Remaining work focuses on:
- 03-07: Completion webhook callback to update video status
