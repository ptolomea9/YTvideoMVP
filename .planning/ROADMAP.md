# Roadmap: Edge AI Luxury Video Suite

## Overview

Transform static real estate photos into cinematic narrated tours. We start with database foundation and auth, build the wizard flow agents use to create videos, integrate the n8n automation pipeline, add the dashboard for viewing/downloading, wire up Stripe payments, and finish with settings. Each phase delivers a complete, verifiable capability.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation** - Next.js 15 + Supabase schema, auth, and RLS ✓
- [x] **Phase 2: Create Wizard** - Four-step /create flow for video generation ✓
- [ ] **Phase 3: n8n Integration** - Debug workflow and video generation pipeline
- [ ] **Phase 4: Dashboard** - Video gallery with progress and downloads
- [ ] **Phase 5: Payments** - Stripe subscriptions and credit system
- [ ] **Phase 6: Settings** - Subscription management and branding

## Phase Details

### Phase 1: Foundation
**Goal**: Working Next.js 15 app with Supabase auth and database schema (profiles, listings, videos, credits) with row-level security
**Depends on**: Nothing (first phase)
**Research**: Likely (new integrations)
**Research topics**: Next.js 15 App Router auth patterns, Supabase RLS best practices, schema design for multi-tenant SaaS
**Plans**: TBD

Plans:
- [x] 01-01: Next.js 15 project setup with Tailwind + shadcn/ui ✓
- [x] 01-02: Supabase schema and RLS policies ✓
- [x] 01-03: Auth flow (login, signup, session management) ✓

### Phase 2: Create Wizard
**Goal**: Complete /create wizard with Data, Upload (GPT-4o Vision sorting), Script HITL editor, and Style selection
**Depends on**: Phase 1
**Research**: Likely (external API)
**Research topics**: GPT-4o Vision API for image classification, drag-drop upload patterns, multi-step form state management
**Plans**: TBD

Plans:
- [x] 02-01: Wizard shell and step navigation ✓
- [x] 02-02: Step 1 - Property data input + neighborhood POI ✓
- [x] 02-03: Step 2 - Image upload with GPT-4o Vision sorting ✓
- [x] 02-03.1: Step 2 enhancement - Per-image enhancement presets via Kie.ai (INSERTED) ✓
- [x] 02-04: Step 3 - Script HITL editor (5 editable sections) ✓
- [x] 02-05: Step 4 - Voice/music/MLS options with ElevenLabs ✓

### Phase 3: n8n Integration
**Goal**: Working video generation pipeline: webhook trigger → Kie.ai resize → Kling 2.6 motion → ElevenLabs TTS → json2video render → completion callback
**Depends on**: Phase 2
**Research**: Likely (external APIs)
**Research topics**: n8n webhook patterns, Kling AI 2.6 API documentation, ElevenLabs timing/sync, json2video template system
**Plans**: TBD

Plans:
- [x] 03-01: Debug existing n8n workflow ✓
- [x] 03-02: Webhook trigger from Next.js ✓
- [x] 03-03: Image processing (Kie.ai resize to 1080x1920) ✓
- [x] 03-04: Script integration (wizard scripts bypass GPT) ✓
- [x] 03-05: ElevenLabs narration with timing ✓
- [ ] 03-06: json2video dual-render (branded + unbranded)
- [ ] 03-07: Completion webhook and status updates

### Phase 4: Dashboard
**Goal**: Cinematic gallery showing 9:16 video cards with hover autoplay, realtime generation progress, and media kit download
**Depends on**: Phase 3
**Research**: Unlikely (internal UI patterns)
**Plans**: TBD

Plans:
- [ ] 04-01: Video gallery layout with 9:16 cards
- [ ] 04-02: Hover autoplay and video player
- [ ] 04-03: Realtime progress states during generation
- [ ] 04-04: Media kit download (branded + unbranded)

### Phase 5: Payments
**Goal**: Stripe integration with Starter/Pro/Agency tiers, credit tracking, and $15 overage charging
**Depends on**: Phase 4
**Research**: Likely (external API)
**Research topics**: Stripe subscription + metered billing, credit-based usage patterns, webhook handling for subscription events
**Plans**: TBD

Plans:
- [ ] 05-01: Stripe setup and subscription tiers
- [ ] 05-02: Credit tracking and deduction
- [ ] 05-03: Overage billing and payment handling

### Phase 6: Settings
**Goal**: Settings page with subscription management, credit balance, and agency branding (logo/headshot upload)
**Depends on**: Phase 5
**Research**: Unlikely (internal patterns)
**Plans**: TBD

Plans:
- [ ] 06-01: Subscription management UI
- [ ] 06-02: Credit balance display
- [ ] 06-03: Agency branding uploads (S3)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | ✓ Complete | 2026-01-13 |
| 2. Create Wizard | 6/6 | ✓ Complete | 2026-01-13 |
| 3. n8n Integration | 5/7 | In progress | - |
| 4. Dashboard | 0/4 | Not started | - |
| 5. Payments | 0/3 | Not started | - |
| 6. Settings | 0/3 | Not started | - |
