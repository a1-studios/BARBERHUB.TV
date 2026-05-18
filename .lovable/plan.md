## Goal

Finish the SEO booking funnel started in `BookBarberLanding.tsx`, add proper analytics tracking, and move `DEV_MODE` from a hardcoded flag to a Sovereign-HQ-controlled kill switch (defaulting OFF in production).

---

## 1. SEO Engine Completion

### 1a. City copy enrichment (`src/data/seoCities.ts`)
Extend each city record with editorial fields used by the landing page:
- `tagline` (one-line hook), `intro` (2–3 sentence paragraph), `neighborhoods: string[]` (4–6 popular areas), `avgPriceUsd`, `popularServiceSlugs: string[]`.
Backfill the existing 25 cities with realistic copy (e.g. NYC neighborhoods: Williamsburg, SoHo, Harlem, LES, Astoria).

### 1b. New shared components (`src/components/seo/`)
- **`SeoFAQ.tsx`** — accessible accordion with structured `Q/A` props; renders both visible UI and emits the JSON-LD already produced in the page. Move the inline FAQ markup from `BookBarberLanding` into it.
- **`CityCopyBlock.tsx`** — long-form section using the new `intro`, `neighborhoods` list, and "average price" stat. Replaces the thin "Why book online" cards on city/service pages (kept on the national hub).
- **`InternalLinkGrid.tsx`** — two grids: "Other cities" (sibling cities, alphabetical, 12 max) and "Other services in {city}" (when on a service page). Improves crawl depth & internal PageRank distribution. Replaces the bare anchor lists currently at the bottom of `BookBarberLanding`.
- **`BreadcrumbsNav.tsx`** — visible breadcrumb trail matching the existing JSON-LD `BreadcrumbList`.

`BookBarberLanding.tsx` is refactored to compose these (no behavior loss; tags, canonical, helmet untouched).

### 1c. Analytics & tracking
- **`src/lib/seoAnalytics.ts`** — thin wrapper exposing `trackSeoEvent(name, props)` that fans out to: `gtag` (if `window.gtag` present), `fbq` (Meta Pixel — already gated), and a Supabase insert into a new `seo_events` table for first-party attribution.
- Instrument:
  - `seo_landing_view` on mount (city, service, path)
  - `seo_cta_click` on "Find Barbers" / "Browse Map"
  - `seo_internal_link_click` on city/service grid clicks
  - `seo_faq_open` on FAQ expand
- Reuse existing `useGoogleAdsPageView` / `useMetaPixelPageView` hooks for pageview firing; only add custom events here.

### 1d. Database (one migration)
```sql
create table public.seo_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  path text,
  city_slug text,
  service_slug text,
  referrer text,
  user_id uuid,
  session_id text,
  props jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
alter table public.seo_events enable row level security;
create policy "anyone can insert seo events"
  on public.seo_events for insert to anon, authenticated with check (true);
create policy "sovereign can read seo events"
  on public.seo_events for select to authenticated
  using (public.has_role(auth.uid(), 'sovereign'));
create index seo_events_created_idx on public.seo_events(created_at desc);
create index seo_events_path_idx on public.seo_events(path);
```

---

## 2. DEV_MODE → Sovereign Kill Switch

Currently `src/config/features.ts` exports `export const DEV_MODE = true;` as a hardcoded constant. We will:

### 2a. Default off + runtime override
- Change `DEV_MODE` constant to `false` (production safe).
- Add `src/hooks/useDevMode.tsx` — reads `platform_state.dev_mode` via the same pattern as `useTiersEnabled` (TanStack Query + Realtime subscription, default `'false'`).
- Add helper `getDevModeSync()` for non-React call sites by listening to the same query cache.

### 2b. Migrate call sites
Files using `DEV_MODE` (already located):
- `src/hooks/useSubscriptionLimits.tsx`
- `src/pages/CreateBattle.tsx`
- `src/components/battles/AcceptChallengeModal.tsx`
- `src/components/battles/ChallengeFeed.tsx`

Each is updated to call `const { devMode } = useDevMode();` (or sync helper) instead of the constant. Behavior identical when flag is true; default false means production behaves as if DEV is off.

### 2c. Sovereign HQ control
- Extend `KillSwitchPanel.tsx` with a **"Developer Mode"** card (same visual pattern as Tier System / Quick Play). Confirms with typed `DISABLE` / `ENABLE`.
- Extend `supabase/functions/sovereign-system-control/index.ts` with two actions: `dev_mode_enable`, `dev_mode_disable` (upserts `platform_state` key `dev_mode`, writes audit log entry).
- Extend `KillSwitchPanelProps.platformState` type with `dev_mode?: { value: string }`.

---

## 3. Build safety guardrails

- All new files are additive; existing exports preserved.
- `react-helmet` already in deps (used by current landing page) — no new packages needed.
- New components are tree-shakeable and only imported by `BookBarberLanding.tsx` and (eventually) the future analytics dashboard.
- Sitemap generator untouched.
- After implementation: run typecheck via build, view preview, fire test event to confirm `seo_events` insert.

---

## Files to touch

**Create**
- `src/components/seo/SeoFAQ.tsx`
- `src/components/seo/CityCopyBlock.tsx`
- `src/components/seo/InternalLinkGrid.tsx`
- `src/components/seo/BreadcrumbsNav.tsx`
- `src/lib/seoAnalytics.ts`
- `src/hooks/useDevMode.tsx`
- `supabase/migrations/<ts>_seo_events_and_dev_mode.sql`

**Edit**
- `src/data/seoCities.ts` (enrich)
- `src/pages/seo/BookBarberLanding.tsx` (compose new components + tracking)
- `src/config/features.ts` (`DEV_MODE = false`)
- `src/hooks/useSubscriptionLimits.tsx`
- `src/pages/CreateBattle.tsx`
- `src/components/battles/AcceptChallengeModal.tsx`
- `src/components/battles/ChallengeFeed.tsx`
- `src/components/sovereign/KillSwitchPanel.tsx` (Dev Mode card)
- `supabase/functions/sovereign-system-control/index.ts` (dev_mode actions)

---

## Out of scope (ask if wanted)
- Sovereign HQ analytics dashboard reading `seo_events` (charts / top cities). Can be a follow-up.
- Server-side rendering for crawlers that don't run JS (would require migrating off pure Vite SPA).
- Programmatic neighborhood landing pages (`/book-barber/:city/:neighborhood`) — bigger scope.
