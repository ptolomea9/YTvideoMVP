# Edge AI Luxury Video Suite

## What This Is

A high-end SaaS platform that transforms static real estate photos into cinematic, narrated walkthrough tours. Luxury real estate agents upload property photos, and the system generates professional 9:16 vertical videos with AI-generated motion, voiceover narration, and background music—delivering both branded (social media) and unbranded (MLS-compliant) versions.

## Core Value

**Effortless for non-technical agents.** The entire flow—from photo upload to cinematic video—must feel magical and require zero technical expertise. If an agent struggles with any step, we've failed.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Database & Auth**
- [ ] Supabase schema: profiles, listings, videos, credits tables
- [ ] Row-level security policies (agent isolation, agency team access)
- [ ] Supabase Auth integration with Next.js

**Create Wizard (/create)**
- [ ] Step 1 - Data: Address, price, property specs input + Neighborhood POI fetch
- [ ] Step 2 - Upload: Drag-and-drop images with GPT-4o Vision smart sorting (Exterior → Entry → Living → Bed → Bath → Yard)
- [ ] Step 3 - Script (HITL): 5 editable text areas with AI-generated script parts (MVP-critical)
- [ ] Step 4 - Style: Voice selection, music toggle, MLS dual-output toggle

**n8n Integration**
- [ ] Debug and complete partially-working n8n workflow
- [ ] Webhook trigger from Next.js → n8n
- [ ] Image polish (resize to 1080x1920 via Kie.ai)
- [ ] Kling AI 2.6 cinematic motion generation with callback
- [ ] ElevenLabs TTS narration with timing calculation
- [ ] json2video dual-render (branded + unbranded)
- [ ] Completion webhook back to Next.js

**Dashboard (/dashboard)**
- [ ] Cinematic gallery with 9:16 video cards
- [ ] Auto-play on hover
- [ ] Realtime progress state during generation
- [ ] Download Media Kit (branded + unbranded)

**Payments**
- [ ] Stripe subscription integration (Starter/Pro/Agency tiers)
- [ ] Credit-based usage tracking
- [ ] Overage charging ($15/video)

**Settings (/settings)**
- [ ] Subscription management
- [ ] Credit balance display
- [ ] Agency branding (logo/headshot upload)

### Out of Scope

- Real-time video editing/trimming — complexity doesn't match MVP value
- Custom avatar integration — save for V2
- CRM integrations (Lofty, Chime) — wait for customer demand
- Team invitation flow — agency dashboard deferred past MVP
- Multi-language translation — Pro tier feature, post-MVP

## Context

**Tech Stack (Locked)**
- Frontend: Next.js 15 (App Router), Tailwind CSS, shadcn/ui
- Backend/Database: Supabase (Auth, Postgres, Realtime)
- Payments: Stripe (Subscription + Credits)
- Automation: n8n (orchestrating Kling 2.6, ElevenLabs, json2video)
- Infrastructure: Vercel (hosting), AWS S3 (media storage)

**Existing Assets**
- n8n workflow (Youtube Video.json) — partially working, needs debugging/completion
- Reference workflows (Tour Video, Video Listing Main Workflow) — patterns to follow

**Design Direction**
- Dark Mode 2.0: Deep Charcoal (#0F0F0F)
- Typography: Bodoni Moda (serif headings), Inter (functional text)
- Micro-interactions: Framer Motion architectural animations (scanning line during analysis)
- 9:16 vertical video format throughout

**Pricing Tiers**
- Starter ($197/mo): 10 credits
- Pro ($297/mo): 25 credits + HITL editor + translation
- Agency ($497/mo): 50 credits + team dashboard
- Overages: $15 per additional video

## Constraints

- **Tech stack**: Must use specified stack (Next.js 15, Supabase, Stripe, n8n, Vercel, S3) — already committed
- **Video format**: 9:16 vertical (1080x1920) — optimized for social media and mobile
- **n8n dependency**: Workflow orchestration relies on existing n8n instance being available
- **API costs**: Kling, ElevenLabs, json2video all have per-use costs — credit system must gate usage

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| HITL script editing is MVP-critical | Core value is ease of use; users need control over their narrative | — Pending |
| Start fresh on Next.js (not using existing partial) | Existing code is for different project | — Pending |
| Supabase + /create wizard first | Foundation before n8n integration | — Pending |
| Dual-output (branded/unbranded) required | MLS compliance is table stakes for agents | — Pending |

---
*Last updated: 2026-01-13 after initialization*
