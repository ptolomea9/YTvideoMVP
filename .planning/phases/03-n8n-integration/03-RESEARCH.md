# Phase 3: n8n Integration - Research

**Researched:** 2026-01-14
**Domain:** json2video API + n8n completion webhooks + email notifications
**Confidence:** HIGH

<research_summary>
## Summary

Researched the remaining Phase 3 work: json2video closing card composition, completion webhooks, and notification system. The standard approach uses json2video's scene-based composition to add a final closing card scene with text/image overlays, json2video's native webhook callbacks to notify completion, and Resend + React Email for celebratory email notifications.

Key finding: json2video supports webhook destinations in the `exports` array, eliminating the need for polling. The webhook payload includes video URL, dimensions, duration, and custom `client-data` for correlation. The closing card is best implemented as a final scene in the movie object with positioned text and image elements.

**Primary recommendation:** Add closing card as final scene in json2video composition, use json2video webhook callback to Next.js API route, update video status in Supabase, use Supabase Realtime for instant toast notifications, send email via Resend with React Email template.

**Important:** Target workflow is `Qo2sirL0cDI2fVNQMJ5Eq` (Shawheen Youtube Video), not the original Youtube Video workflow.

**03-07 Addition:** For realtime in-app notifications (toast + badge), use Supabase Realtime `postgres_changes` subscription. When webhook updates video status, the frontend receives the change instantly via websocket — no polling needed.
</research_summary>

<standard_stack>
## Standard Stack

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| json2video API | v2 | Video composition/rendering | Already integrated in n8n workflow |
| n8n | Latest | Workflow automation | Already hosting the video pipeline |
| Supabase | Latest | Database + storage | Already used for auth/data |

### Supporting (To Add for Completion)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| resend | 4.x | Email delivery API | Sending completion notifications |
| @react-email/components | 0.0.x | Email templates | Building celebration email |
| sonner | 1.x | Toast notifications | In-app completion/error toasts |
| @supabase/realtime-js | (bundled) | Realtime subscriptions | Instant status updates without polling |

### Already Established
- ElevenLabs for TTS (integrated)
- Kie.ai for image processing (integrated)
- Kling for image-to-video motion (integrated)
- AWS S3 for asset storage (integrated)

**Installation:**
```bash
npm install resend @react-email/components sonner
# Note: Supabase Realtime is bundled with @supabase/supabase-js
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: json2video Closing Card Scene
**What:** Add a final scene to the movie object with agent branding elements
**When to use:** End of every video for agent contact info

**Structure:**
```javascript
{
  "resolution": "instagram-story",  // 9:16 vertical
  "scenes": [
    // ... existing video scenes ...
    {
      "background-color": "#1a1a1a",  // Dark luxury background
      "duration": 5,
      "elements": [
        // Agent name (mandatory)
        {
          "type": "text",
          "text": "{{agentName}}",
          "settings": {
            "font-family": "Bodoni Moda",
            "font-size": "48px",
            "font-weight": "700",
            "font-color": "#FFFFFF",
            "text-align": "center",
            "vertical-position": "center",
            "horizontal-position": "center"
          },
          "y": 600
        },
        // CTA text (agent-chosen)
        {
          "type": "text",
          "text": "{{ctaText}}",
          "settings": {
            "font-family": "Inter",
            "font-size": "32px",
            "font-color": "#D4AF37",  // Gold accent
            "text-align": "center"
          },
          "y": 700
        },
        // Contact info (mandatory)
        {
          "type": "text",
          "text": "{{phone}} | {{email}}",
          "settings": {
            "font-family": "Inter",
            "font-size": "24px",
            "font-color": "#CCCCCC"
          },
          "y": 800
        },
        // Logo (optional - conditional render)
        {
          "type": "image",
          "src": "{{logoUrl}}",
          "condition": "{{hasLogo}}",
          "width": 150,
          "height": -1,
          "position": "top-center",
          "y": 400,
          "fade-in": 0.5
        },
        // Headshot (optional - conditional render)
        {
          "type": "image",
          "src": "{{headshotUrl}}",
          "condition": "{{hasHeadshot}}",
          "width": 200,
          "height": 200,
          "position": "center-center",
          "y": 300,
          "fade-in": 0.5
        }
      ]
    }
  ]
}
```

### Pattern 2: json2video Webhook Callback
**What:** Configure webhook destination to receive completion notification
**When to use:** Instead of polling for render status

**Configuration in movie object:**
```javascript
{
  "resolution": "instagram-story",
  "scenes": [...],
  "exports": [
    {
      "destinations": [
        {
          "type": "webhook",
          "endpoint": "https://your-app.com/api/webhooks/video-complete",
          "content-type": "json"
        }
      ]
    }
  ],
  "client-data": {
    "videoId": "{{videoId}}",
    "userId": "{{userId}}",
    "listingId": "{{listingId}}"
  }
}
```

**Webhook payload received:**
```json
{
  "width": "1080",
  "height": "1920",
  "duration": "65.5",
  "size": "15234567",
  "url": "https://assets.json2video.com/...",
  "project": "abc123",
  "id": "movie-id",
  "client-data": {
    "videoId": "uuid",
    "userId": "uuid",
    "listingId": "uuid"
  }
}
```

### Pattern 3: Next.js Webhook Handler
**What:** API route to receive json2video completion callbacks
**When to use:** Processing video completion

**Location:** `src/app/api/webhooks/video-complete/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  // Verify shared secret
  const headersList = await headers();
  const secret = headersList.get('x-webhook-secret');
  if (secret !== process.env.VIDEO_WEBHOOK_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();
  const { videoId, userId } = payload['client-data'];

  const supabase = await createClient();

  // Update video status
  await supabase
    .from('videos')
    .update({
      status: 'complete',
      video_url: payload.url,
      duration: parseFloat(payload.duration),
      completed_at: new Date().toISOString()
    })
    .eq('id', videoId);

  // Send celebration email
  await sendCompletionEmail(userId, videoId, payload.url);

  return Response.json({ success: true });
}
```

### Pattern 4: Celebration Email with React Email
**What:** Beautiful completion notification
**When to use:** When video finishes rendering

```tsx
// emails/video-complete.tsx
import { Html, Head, Body, Container, Img, Text, Button, Section } from '@react-email/components';

export function VideoCompleteEmail({
  agentName,
  thumbnailUrl,
  dashboardUrl
}: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
        <Container>
          <Text style={{ fontSize: '32px', textAlign: 'center' }}>
            🎬 Your Video is Ready!
          </Text>
          <Section style={{ textAlign: 'center' }}>
            <Img src={thumbnailUrl} width={300} style={{ borderRadius: '8px' }} />
          </Section>
          <Text style={{ textAlign: 'center' }}>
            Hi {agentName}, your listing video has finished rendering and looks amazing!
          </Text>
          <Section style={{ textAlign: 'center' }}>
            <Button
              href={dashboardUrl}
              style={{
                backgroundColor: '#D4AF37',
                color: '#000000',
                padding: '16px 32px',
                borderRadius: '8px'
              }}
            >
              View & Download Your Video
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

### Pattern 5: Supabase Realtime for Instant Toast Notifications (03-07)
**What:** Subscribe to video status changes for realtime in-app notifications
**When to use:** User has app open, video completes in background

**Client-side subscription hook:**
```typescript
// hooks/useVideoNotifications.ts
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function useVideoNotifications(userId: string) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('video-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'videos',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const { new: video, old: oldVideo } = payload;

          // Only notify on status transitions
          if (oldVideo.status === 'pending' && video.status === 'complete') {
            toast.success('Your video is ready!', {
              description: 'Click to view and download',
              action: {
                label: 'View',
                onClick: () => window.location.href = '/dashboard'
              }
            });
          } else if (oldVideo.status === 'pending' && video.status === 'failed') {
            toast.error('Video generation failed', {
              description: video.error_message || 'Please try again',
              duration: 10000
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
```

**Supabase Realtime setup required:**
```sql
-- Enable realtime for videos table (run once in Supabase dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE videos;
```

### Pattern 6: Dashboard Badge for Unviewed Videos (03-07)
**What:** Track which videos user hasn't seen yet, show badge on nav
**When to use:** User has new completed videos they haven't viewed

**Database column:**
```sql
-- Add to videos table
ALTER TABLE videos ADD COLUMN viewed_at TIMESTAMPTZ;
```

**Badge logic:**
```typescript
// Unviewed count query
const { count } = await supabase
  .from('videos')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('status', 'complete')
  .is('viewed_at', null);

// Mark as viewed when user visits dashboard
await supabase
  .from('videos')
  .update({ viewed_at: new Date().toISOString() })
  .eq('user_id', userId)
  .is('viewed_at', null);
```

### Pattern 7: n8n Error Workflow for Specific Error Messages (03-07)
**What:** Capture which node failed and send specific error to Next.js
**When to use:** External API (Kling, ElevenLabs, json2video) fails

**n8n Error Workflow structure:**
1. Error Trigger node receives: `execution.lastNodeExecuted`, `error.message`
2. Map node name to user-friendly message
3. HTTP Request to Next.js error webhook

**Error mapping in n8n Code node:**
```javascript
const lastNode = $input.first().json.execution.lastNodeExecuted;
const errorMessage = $input.first().json.error.message;

const friendlyErrors = {
  'ElevenLabs API': 'Voice generation failed',
  'Kling API': 'Video motion generation failed',
  'json2video': 'Final video rendering failed',
  'Kie.ai': 'Image processing failed'
};

// Find matching error
let userMessage = 'Video generation failed';
for (const [key, msg] of Object.entries(friendlyErrors)) {
  if (lastNode.includes(key)) {
    userMessage = msg;
    break;
  }
}

return {
  videoId: $input.first().json.client_data?.videoId,
  status: 'failed',
  error_message: userMessage,
  technical_error: errorMessage.substring(0, 500) // Truncate for storage
};
```

**Next.js error webhook handler:**
```typescript
// app/api/webhooks/video-error/route.ts
export async function POST(request: Request) {
  const payload = await request.json();

  await supabase
    .from('videos')
    .update({
      status: 'failed',
      error_message: payload.error_message,
      technical_error: payload.technical_error,
      failed_at: new Date().toISOString()
    })
    .eq('id', payload.videoId);

  return Response.json({ success: true });
}
```

### Anti-Patterns to Avoid
- **Polling for video status:** Use json2video webhooks + Supabase Realtime instead - more efficient and truly real-time
- **Hardcoding webhook URLs in n8n:** Use environment variables or dashboard connections
- **Sending email before storage backup:** Ensure video is copied to Supabase storage before notifying user
- **Generic error messages:** Always pass specific error from n8n so user knows which step failed
- **Blocking on realtime connection:** Gracefully degrade if websocket fails - user can still refresh
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Video composition | Custom FFmpeg | json2video scenes | Scenes composited in parallel, handles encoding |
| Text overlays | ImageMagick/FFmpeg | json2video text element | Font rendering, animations, positioning solved |
| Webhook security | Custom signature | Shared secret header | Simple, effective, standard pattern |
| Email templates | Raw HTML strings | React Email | Type-safe, component-based, preview tools |
| Email delivery | nodemailer/SMTP | Resend | Better deliverability, simpler API |
| Video polling | setInterval loops | json2video webhook | Real-time, no wasted API calls |
| Realtime updates | WebSocket server | Supabase Realtime | Managed infrastructure, RLS-aware |
| Toast notifications | Custom toast impl | sonner | Accessible, styled, animation-ready |
| Error categorization | Switch statements | Error workflow + mapping | Centralized in n8n, single source |

**Key insight:** json2video's scene-based composition handles all the complexity of video rendering. The closing card is just another scene with text/image elements - no need for FFmpeg or custom video processing.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Webhook URL Not Publicly Accessible
**What goes wrong:** json2video webhook calls fail silently
**Why it happens:** Development URLs (localhost) can't receive callbacks
**How to avoid:** Use ngrok for local dev, production URL for deployed app
**Warning signs:** Videos render but status never updates

### Pitfall 2: Missing client-data Correlation
**What goes wrong:** Can't identify which video completed
**Why it happens:** Forgot to include videoId in client-data
**How to avoid:** Always pass videoId, userId, listingId in client-data
**Warning signs:** Webhook received but can't update correct record

### Pitfall 3: Large Video File Storage Timeout
**What goes wrong:** Supabase upload times out for large videos
**Why it happens:** Videos can be 50-100MB, standard upload has limits
**How to avoid:** Use TUS resumable upload for files >6MB, or keep json2video URL as primary
**Warning signs:** Storage errors, partial uploads

### Pitfall 4: Email Image Not Loading
**What goes wrong:** Thumbnail doesn't display in email
**Why it happens:** Email clients block external images, or URL expired
**How to avoid:** Use public CDN URL, consider base64 embedding for critical images
**Warning signs:** Broken image icon in email preview

### Pitfall 5: Closing Card Element Ordering
**What goes wrong:** Logo covers text, elements misaligned
**Why it happens:** z-index and element order in array determine layering
**How to avoid:** Background elements first, text last in elements array
**Warning signs:** Visual overlap in rendered video

### Pitfall 6: Supabase Realtime Not Enabled (03-07)
**What goes wrong:** Subscriptions connect but never receive events
**Why it happens:** Table not added to `supabase_realtime` publication
**How to avoid:** Run `ALTER PUBLICATION supabase_realtime ADD TABLE videos;` in SQL editor
**Warning signs:** Channel connects (SUBSCRIBED) but no payloads received

### Pitfall 7: Realtime Channel Memory Leaks (03-07)
**What goes wrong:** Multiple subscriptions accumulate, duplicate notifications
**Why it happens:** Missing cleanup in useEffect return, or non-unique channel names
**How to avoid:** Always `removeChannel()` on cleanup, use unique channel names
**Warning signs:** Toasts appearing multiple times, memory growth

### Pitfall 8: Error Workflow Missing videoId (03-07)
**What goes wrong:** Error caught but can't update correct video record
**Why it happens:** `client_data` not available in error trigger by default
**How to avoid:** Store videoId in workflow-level variable early, reference in error workflow
**Warning signs:** Errors logged but video stuck in "pending" forever
</common_pitfalls>

<code_examples>
## Code Examples

### json2video Scene with Conditional Elements
```javascript
// Source: json2video.com/docs/v2/api-reference/json-syntax/scene
{
  "background-color": "#1a1a1a",
  "duration": 5,
  "elements": [
    {
      "type": "image",
      "src": "{{logoUrl}}",
      "condition": "{{logoUrl}} !== ''",  // Only render if provided
      "width": 150,
      "height": -1,  // Maintain aspect ratio
      "position": "custom",
      "x": 465,  // Centered for 1080 width
      "y": 200,
      "fade-in": 0.5
    },
    {
      "type": "text",
      "text": "{{agentName}}",
      "settings": {
        "font-family": "Bodoni Moda",
        "font-size": "56px",
        "font-weight": "700",
        "font-color": "#FFFFFF",
        "text-align": "center",
        "vertical-position": "center"
      }
    }
  ]
}
```

### Webhook Destination Configuration
```javascript
// Source: json2video.com/docs/v2/api-reference/exports/webhooks
{
  "exports": [
    {
      "destinations": [
        {
          "type": "webhook",
          "endpoint": "https://app.example.com/api/webhooks/video-complete",
          "content-type": "json"
        }
      ]
    }
  ],
  "client-data": {
    "videoId": "video-uuid-here",
    "userId": "user-uuid-here",
    "source": "wizard"
  }
}
```

### Supabase Video Status Update
```typescript
// Update video record on completion
const { error } = await supabase
  .from('videos')
  .update({
    status: 'complete',
    video_url: webhookPayload.url,
    json2video_url: webhookPayload.url,  // Backup reference
    duration: parseFloat(webhookPayload.duration),
    file_size: parseInt(webhookPayload.size),
    completed_at: new Date().toISOString()
  })
  .eq('id', webhookPayload['client-data'].videoId);
```

### Send Email with Resend
```typescript
import { Resend } from 'resend';
import { VideoCompleteEmail } from '@/emails/video-complete';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Edge AI Video <videos@yourdomain.com>',
  to: userEmail,
  subject: '🎬 Your Listing Video is Ready!',
  react: VideoCompleteEmail({
    agentName: user.name,
    thumbnailUrl: heroImageUrl,
    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
  })
});
```
</code_examples>

<workflow_context>
## n8n Workflow Context

**Target Workflow:** `Qo2sirL0cDI2fVNQMJ5Eq` (Shawheen Youtube Video)

**Current State:** 51 nodes, handles full pipeline from webhook to video output

**Key Nodes for Remaining Work:**

| Node | Purpose | Modification Needed |
|------|---------|---------------------|
| `prepare body for jsontovideo to set video` | Composes video with narration | Add closing card scene |
| `Prepare body for jsontovideo to render video` | Adds music | May need webhook export config |
| `Output final video` | Sets final output variables | Ensure all data for callback |
| `🎉 Send video URL` | Gmail notification | Update to use Resend or keep |
| `HTTP Request` (after output) | Callback to app | Configure with video data |

**Data Flow for Closing Card:**
```
Webhook payload (agent info) → Separate image data → ...
→ prepare body for jsontovideo to set video (ADD closing card scene here)
→ ... → Output final video
```

**Agent Data Needed from Webhook:**
- `agentName` (mandatory)
- `agentPhone` (mandatory)
- `agentEmail` (mandatory)
- `agentSocials` (mandatory - object with handles)
- `agentCta` (mandatory - chosen CTA text)
- `logoUrl` (optional)
- `headshotUrl` (optional)

**Note:** Workflow currently goes Webhook → GPT script generation → ElevenLabs. The wizard script bypass added in 03-04 to "Youtube Video" workflow may need to be replicated here if not already present.
</workflow_context>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for video status | json2video webhooks | Available since v2 | Real-time notifications, no wasted API calls |
| nodemailer SMTP | Resend API | 2023+ | Better deliverability, simpler setup |
| HTML string emails | React Email | 2023+ | Type-safe, component-based templates |

**New patterns:**
- **json2video client-data:** Pass custom metadata that returns in webhook - enables correlation without database lookups
- **React Email 5.0:** Latest version supports more components and better preview tooling

**Deprecated:**
- **json2video v1 API:** Use v2 for webhook support and better scene composition
</sota_updates>

<open_questions>
## Open Questions

1. **Wizard script bypass in Shawheen workflow?**
   - What we know: 03-04 added "Check for wizard script" + "Use wizard script?" nodes to "Youtube Video" workflow
   - What's unclear: Whether Shawheen Youtube Video workflow has this bypass
   - Recommendation: Check and add if missing before 03-06

2. **Supabase storage for video backup**
   - What we know: Context says "Primary: Our storage, Backup: json2video URL"
   - What's unclear: Whether to download and re-upload to Supabase, or just store both URLs
   - Recommendation: Store both URLs, download to Supabase Storage async (don't block completion)

3. **Beat-sync timing in render**
   - What we know: 03-05 added `imageTransitionTimes[]` calculation
   - What's unclear: Whether json2video can use these for crossfade timing
   - Recommendation: Pass through but may be Phase 4 polish
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- [json2video Text Element](https://json2video.com/docs/v2/api-reference/json-syntax/element/text) - Text overlay properties
- [json2video Movie Structure](https://json2video.com/docs/v2/api-reference/json-syntax/movie) - Scene composition
- [json2video Webhooks](https://json2video.com/docs/v2/api-reference/exports/webhooks) - Callback configuration
- [json2video n8n Integration](https://json2video.com/docs/v2/no-code-integrations/n8n) - n8n setup
- [Supabase Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs) - Official realtime guide
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) - Subscription patterns
- [n8n Error Handling](https://docs.n8n.io/flow-logic/error-handling/) - Error workflow setup

### Secondary (MEDIUM confidence)
- [Supabase Storage Upload](https://supabase.com/docs/reference/javascript/storage-from-upload) - File upload patterns
- [Resend + React Email](https://react.email/docs/integrations/resend) - Email integration
- [n8n Webhook Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) - Callback patterns
- [Supabase Realtime in Next.js 15](https://dev.to/lra8dev/building-real-time-magic-supabase-subscriptions-in-nextjs-15-2kmp) - Implementation patterns

### Tertiary (LOW confidence - needs validation)
- None - all findings verified
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: json2video API v2, Supabase Realtime
- Ecosystem: n8n, Supabase Storage, Resend, React Email, sonner
- Patterns: Scene composition, webhook callbacks, email notifications, realtime subscriptions, error workflows
- Pitfalls: URL accessibility, correlation, storage limits, realtime setup, error mapping

**Confidence breakdown:**
- Standard stack: HIGH - already integrated, just extending
- Architecture: HIGH - from official json2video docs
- Pitfalls: HIGH - common issues documented in forums
- Code examples: HIGH - from official documentation

**Research date:** 2026-01-14
**Valid until:** 2026-02-14 (30 days - APIs stable)
</metadata>

---

*Phase: 03-n8n-integration*
*Research completed: 2026-01-14*
*Ready for planning: yes*
