# Summary: 03-01 Debug Existing n8n Workflow

## What Was Built

Analyzed existing n8n workflows and created the foundation for webhook integration. Established payload transformation utilities, database schema for tracking, and client structure for triggering workflows.

## Key Features Delivered

### n8n Workflow Analysis

Documented three existing workflows:
- **Video Listing Main** (F5GcRy7CqjkWgMSm) - Full narrated tour with HeyGen avatar
- **Tour Video** (5WetGoorzy8r2nNQ) - Simpler tour with Kling 2.6 motion
- **Youtube Video** (hjG60LIO86i5vxX3) - Full tour with GPT script generation

Selected **Tour Video** as MVP target for its simpler pipeline.

### Payload Transform Utility

Created `src/lib/n8n/transform.ts`:
- Maps wizard state to n8n webhook payload format
- Handles field name differences (bedrooms → bedRoomCount, etc.)
- Extracts enhanced image URLs when available
- Formats script sections as webhookResponse array

### Music Library

Created `src/lib/n8n/music.ts`:
- Default music tracks for video background
- Track selection by mood (luxury, calm, modern, upbeat)
- getDefaultMusicUrl() for workflow fallback

### n8n Webhook Client

Created `src/lib/n8n/client.ts`:
- Workflow constants and identifiers
- buildWebhookUrl() for production/test endpoints
- triggerTourVideo() skeleton (trigger logic in 03-02)
- Health check utility

### Database Schema

Added migration `004_add_n8n_fields.sql`:
- `n8n_payload` JSONB - Store transformed payload for debugging
- `n8n_webhook_url` TEXT - Track which endpoint was used
- `mls_dual_output` BOOLEAN - Dual render flag

### Submission API Integration

Updated `/api/listings/create`:
- Transforms wizard data before storing
- Stores n8n payload in videos table
- Records webhook URL for tracking
- Returns webhook URL in response

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 174d1db | feat | n8n payload transformer and music library |
| bf83780 | chore | Add n8n integration database fields |
| 8b315d2 | feat | n8n webhook client structure |
| 2396575 | feat | Integrate n8n payload into submission API |

## Files Created

### New Files
- `src/lib/n8n/transform.ts` - Payload transformation utility
- `src/lib/n8n/music.ts` - Default music library
- `src/lib/n8n/client.ts` - Webhook client structure
- `src/lib/n8n/index.ts` - Module exports
- `supabase/migrations/004_add_n8n_fields.sql` - Database migration
- `.planning/phases/03-n8n-integration/03-01-PLAN.md` - Execution plan

### Modified Files
- `src/app/api/listings/create/route.ts` - Added n8n payload storage
- `.env.example` - Added N8N_WEBHOOK_URL

## Gap Analysis Completed

| Field | Workflow Expects | Wizard Provides | Resolution |
|-------|------------------|-----------------|------------|
| images | `images[].imageurl` | `images[].url` | Mapped in transform |
| bedrooms | `bedRoomCount` | `bedrooms` | Mapped in transform |
| bathrooms | `bathRoomCount` | `bathrooms` | Mapped in transform |
| size | `size` | `squareFeet` | Mapped in transform |
| selling points | `mainSellingPoints` | `features` | Mapped in transform |
| social | `social_handles` | `agentSocial` | Mapped in transform |
| music | `music` (URL) | `musicEnabled` (bool) | Default music URL |
| email | `email` | Not collected | From auth context |
| title | `title` | Not collected | Generated from address |

## Technical Notes

### n8n Webhook Configuration

Production webhook base: `https://edgeaimedia.app.n8n.cloud`

Webhook URL pattern:
- Production: `/webhook/{path}`
- Test: `/webhook-test/{path}`

### Tour Video Workflow Selection

Selected for MVP because:
1. Simpler pipeline (no HeyGen avatar)
2. Uses Kie.ai + Kling 2.6 + json2video (target stack)
3. Generates captions from property data

### Next Steps

03-02 will implement the actual webhook trigger, changing video status from "pending" to "processing" and capturing the n8n execution ID.
