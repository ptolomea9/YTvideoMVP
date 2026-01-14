# Phase 3: n8n Integration - Context

**Gathered:** 2026-01-14
**Status:** Ready for planning (remaining work: 03-06, 03-07)

<vision>
## How This Should Work

Agents create a video in the wizard, hit generate, and then... magic happens. A polished, branded video shows up in their dashboard and inbox. They don't need to think about the pipeline — it just works.

The video is 9:16 vertical, optimized for YouTube Shorts, Instagram Reels, TikTok. Clean property footage throughout with smooth transitions timed to the music, narration guiding viewers through the listing, then a punchy 5-second closing card with the agent's branding and CTA.

When it's ready, they get an email that makes them excited to share it — preview thumbnail, celebration, link to dashboard. The video lives in our storage (with json2video as backup) so we control the experience.

</vision>

<essential>
## What Must Be Nailed

- **Reliability** — Videos complete successfully, status updates accurately reflect progress, no orphaned jobs. Auto-retry once before marking failed.
- **Quality** — The final video looks polished. Branding placement, timing, overall production feel. This is what agents show to clients.
- **Branded output** — Full agent branding on closing card: name, phone, email, social handles (mandatory). Logo and headshot (optional). Agent-chosen CTA text.

Speed is secondary. "I don't care how long it takes as long as it looks great when it arrives and doesn't fail in production."

</essential>

<boundaries>
## What's Out of Scope

- **Unbranded/MLS-compliant videos** — Deferred. Social media agents want their branding ON the video. Add later only if users actually request it.
- **Progress UI details** — Accurate status updates yes, but fancy progress bars/percentages are Phase 4 dashboard work
- **Error recovery UI** — Handle failures gracefully in backend, but user-facing retry/refund flows come later
- **Video analytics** — View counts, engagement metrics are future features

Keep Phase 3 focused on the pipeline working. Polish is Phase 4+.

</boundaries>

<specifics>
## Specific Ideas

**Video specs:**
- 9:16 vertical (social-first)
- 45-90 seconds duration (content determines length within range)
- 5-second closing card with agent branding

**Branding on closing card:**
- Mandatory: name, phone, email, social handles
- Optional: logo, headshot
- CTA: Agent chooses text in wizard (e.g., "Schedule a Tour", "Contact Me Today")

**Thumbnail:**
- User marks hero image in upload step (needs to be added to wizard)
- Hero image becomes video thumbnail

**Status flow:**
- Simple stages: Pending → Processing → Complete/Failed
- Auto-retry once on failure before marking failed

**Notification:**
- Dashboard notification + email
- Email: Preview thumbnail, celebration/excitement, link to dashboard

**Storage:**
- Primary: Our storage (S3/Supabase)
- Backup: Keep json2video URL as fallback

**Webhook security:**
- Shared secret header (builder's choice for simplicity + security)

**Music:**
- Royalty-free from Upbeat — no attribution required

</specifics>

<notes>
## Additional Context

User explicitly questioned whether dual-render (branded + unbranded) was worth the complexity and wait time. Decision: branded-only for now. "Is the juice worth the squeeze?" — No, for social media use case, agents want their branding visible.

The beat-sync timing architecture from 03-05 enables punchy transitions that match social media pacing. The 5-second closing card fits this aesthetic — no draggy outros.

New wizard work needed: Hero image selection in upload step. This is small scope creep but necessary for thumbnail generation.

</notes>

---

*Phase: 03-n8n-integration*
*Context gathered: 2026-01-14*
