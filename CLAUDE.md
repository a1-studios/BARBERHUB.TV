# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (port 8080)
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint
npm run preview      # Preview production build locally
```

Pre-hooks auto-run `bunx tsx scripts/generate-sitemap.ts` before both `dev` and `build`.

There is no test framework configured.

## Architecture Overview

**BARBERHUB.TV** is a global barber competition platform — a Vite + React 18 SPA with Supabase as the backend and Cloudflare for video delivery.

### Core Stack

- **Frontend**: React 18 + TypeScript + Vite 5 (SWC), path alias `@/` → `./src/`
- **Styling**: Tailwind CSS 3 + shadcn-ui (Radix UI) — components in `src/components/ui/`
- **Routing**: React Router v6 (all routes defined in `src/App.tsx`)
- **State**: Zustand stores (`src/stores/`) + React Query (`@tanstack/react-query`)
- **Auth**: Supabase Auth via `useAuth` hook; JWT tokens, OAuth (Google/GitHub)
- **Database**: Supabase (PostgreSQL 15) — project `msuepyfssovvkjzpfjzu`
- **Video**: Cloudflare Stream (delivery) + Cloudflare R2 (storage), LiveKit for live broadcast
- **Real-time**: Supabase Realtime WebSockets
- **PWA**: Vite PWA plugin (injectManifest mode), custom service worker at `src/sw.ts`

### Source Layout

```
src/
├── App.tsx              # Root router with all routes + auth guards
├── pages/               # One file per route (~30 pages)
├── components/          # Feature-based subdirectories (40+)
│   └── ui/              # shadcn-ui primitives
├── hooks/               # ~35 custom hooks (auth, battles, real-time)
├── stores/              # Zustand global state
├── lib/                 # PWA helpers, analytics (Meta Pixel, Google Ads)
├── utils/               # Audio, haptics, device fingerprinting
├── integrations/        # Supabase client setup
├── config/              # Feature flags, category constants, SEO titles
└── data/                # Static datasets

supabase/
├── migrations/          # 83 DB migrations (source of truth for schema)
├── functions/           # 60+ Deno Edge Functions (serverless)
└── config.toml          # Local dev config (ports: db=54322, auth=54324)
```

### Routing & Auth Guards

All routes live in `src/App.tsx`. Public routes are accessible without login. Protected routes use guards:

| Guard | Requirement |
|---|---|
| `AuthGuard` | Logged-in user |
| `BarberGuard` | Active barber profile |
| `AdminGuard` | Admin role |
| `SovereignGuard` | Sovereign (super-admin) role |

A global `IS_COMING_SOON` flag in `src/config/` swaps the root `/` route to a launch page.

### Supabase Edge Functions

Located in `supabase/functions/`, each function is a Deno TypeScript module. Key functions:
- `analyze-haircut` — AI video analysis
- `auto-close-voting` — Scheduled vote closure
- `book-appointment` — Booking workflow
- `award-signup-bonus` — Onboarding rewards
- `check-gate-eligibility` — Battle entry validation

Functions with `verify_jwt: false` in `supabase/config.toml` are publicly callable (webhooks, scheduled jobs).

### Video Pipeline

1. Upload: client → Cloudflare R2 (`battles-submissions` bucket)
2. Processing: Cloudflare Stream (transcoding)
3. Delivery: `https://media.barberhub.tv` CDN

The `scripts/backfill-cloudflare-stream.ts` script reconciles R2 uploads with Stream records.

### Economy & Features

- **Barber Bucks**: In-app currency (components in `src/components/economy/`)
- **Battles**: Head-to-head video battles with live voting theater
- **Tournaments**: Bracket-style competitions
- **Rankings**: Global and country-level leaderboards
- **Booking**: Appointment scheduling for barbers
- **Live Broadcast**: LiveKit-powered streaming (`/broadcast-studio`, `/broadcast/:channelId`)

### Environment Variables

All client-side vars are prefixed `VITE_`. Key ones:

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
VITE_MAPBOX_TOKEN
VITE_GOOGLE_MAPS_API_KEY
VITE_GOOGLE_CLIENT_ID
VITE_CLOUDFLARE_KEY       # R2 bucket URL
```

### TypeScript Config Notes

`tsconfig.json` has loose settings (`noImplicitAny: false`, `strictNullChecks: false`). Do not tighten these without coordinating across the full codebase — many existing patterns rely on the current settings.
