# Summary: 03-02 Webhook Trigger from Next.js

## What Was Built

Connected the wizard submission flow to trigger the n8n Tour Video workflow, including beat-synced image timing using snare hits.

## Key Features Delivered

### Webhook Trigger Integration

Updated `/api/listings/create` to:
1. Fetch music track metadata (including beat data) if a track is selected
2. Transform wizard data with beat-synced `imageTiming` array
3. Call `triggerTourVideo()` to POST to n8n webhook
4. Update video status from "pending" to "processing" on success
5. Store execution ID for tracking

### Beat-Synced Image Timing

n8n payload now includes:
- `musicSnareHits[]` - snare hit timestamps for transitions
- `musicBassHits[]` - bass hit timestamps
- `musicBeats[]` - all beats (legacy)
- `musicBpm` - beats per minute
- `imageTiming[]` - pre-calculated image timings aligned to snare hits

### Music API Enhancements

Updated `/api/music`:
- Now returns beat data (`bpm`, `beats`, `bassHits`, `snareHits`)

Added `/api/music/[id]`:
- Fetch single track with full beat metadata
- Used by submission API to get track details

## Files Created/Modified

### New Files
- `src/app/api/music/[id]/route.ts` - Single track fetch endpoint
- `.planning/phases/03-n8n-integration/03-02-SUMMARY.md` - This summary

### Modified Files
- `src/app/api/listings/create/route.ts` - Added webhook trigger
- `src/app/api/music/route.ts` - Added beat data to response
- `src/lib/n8n/index.ts` - Export MusicTrackMeta type

## Flow Summary

```
User submits wizard
    ↓
POST /api/listings/create
    ↓
Create listing record
    ↓
Fetch music track (if selected) ← includes bass_hits, snare_hits, bpm
    ↓
Transform to n8n payload ← calculates imageTiming from snare hits
    ↓
Create video record (status: pending)
    ↓
POST to n8n webhook (tour-video)
    ↓
Update video status → processing
    ↓
Return response with execution ID
```

## Webhook Details

- Base URL: `https://edgeaimedia.app.n8n.cloud`
- Production: `/webhook/tour-video`
- Test (dev): `/webhook-test/tour-video`

## Next Steps

03-03 will focus on the Kie.ai image resize step within the n8n workflow.
