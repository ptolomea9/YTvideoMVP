# Phase 03-07: Completion Webhook and Status Updates - Context

**Gathered:** 2026-01-14
**Status:** Ready for planning

<vision>
## How This Should Work

When a video finishes generating in n8n, the app should know immediately and notify the user. The flow is:

1. n8n completes video generation and calls back to Next.js
2. Database updates with video URL and thumbnail
3. User gets a toast notification ("Your video is ready!")
4. Dashboard nav shows a badge indicating new video
5. User clicks through to see their completed video

The experience should feel responsive — not like they're waiting and wondering. When it's done, they know.

</vision>

<essential>
## What Must Be Nailed

- **Reliability** — Video URL and status must always update correctly. No lost videos. The database is the source of truth.
- **Realtime awareness** — User gets notified via toast + dashboard badge when video completes
- **Clear error feedback** — When external APIs fail (Kling, ElevenLabs, json2video), show which step failed so user knows if worth retrying

</essential>

<boundaries>
## What's Out of Scope

- Progress percentage updates — No mid-generation progress tracking. Just pending → complete/failed
- Retry/regenerate UI — No user-facing retry buttons yet in this plan
- Lost webhook handling — Focus on happy path and API failures, not webhook delivery failures
- Partial failure recovery — If video renders but thumbnail fails, treat as full failure for now

</boundaries>

<specifics>
## Specific Ideas

- n8n callback sends: video URL + thumbnail URL
- Toast notification for both success AND failure cases
- Failure toast shows specific error (e.g., "Voice generation failed" not just "Video failed")
- Dashboard badge clears when user views their new video

</specifics>

<notes>
## Additional Context

This is the final plan in Phase 3 (n8n Integration). It closes the loop on the video generation pipeline — the user submits via the wizard, n8n processes everything, and this plan handles getting the result back to the user.

Reliability was emphasized as the top priority over notification speed. The core value is that videos never get lost in the pipeline.

</notes>

---

*Phase: 03-n8n-integration*
*Context gathered: 2026-01-14*
