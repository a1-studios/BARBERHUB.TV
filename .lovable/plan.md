
# Velvet Rope Landing — Dynamic Feature Tease

Replace the static "League Pulse" stat strip with a mobile-first, auto-rotating teaser stage that gives non-members an irresistible peek at what's inside the app. Keep the existing signature header, role pills, VIP code panel, and Sign-in footer untouched. Keep the brand: Deep Black (#0a0a0f), Neon Orange, Zion Cyan — no purple/pink gradients from the reference.

## What the user will see

A single iPhone-height frame (no scroll) with the existing chrome on top, then a **rotating "Inside the Hub" stage** that auto-cycles through 5 themed cards every ~4s with smooth fade/slide transitions. Each card is a real, live preview of an app feature with subtle 3D motion, pulsing live dots, and animated counters.

```text
┌──────────────────────────────────┐
│  Signature Header (existing)     │
│  Barber | Fan pills (existing)   │
│  VIP code panel (conditional)    │
├──────────────────────────────────┤
│                                  │
│   [ Rotating Teaser Stage ]      │
│                                  │
│   • dot • dot • dot • dot • dot  │
├──────────────────────────────────┤
│  Already a member? Sign in       │
└──────────────────────────────────┘
```

## The 5 rotating cards

Pulled from real Supabase data via the existing `get_public_league_stats` RPC + a couple light public reads, so numbers are alive but no auth is needed.

1. **Live Now** — top-left red pulse, a faux split-screen PK frame using two `LivePreviewTile` thumbnails (real `is_live` barbers from `barber_profiles` if available, fallback to curated avatars). Shows live battle count + viewer counter ticking. Tagline: *"X battles streaming right now."*

2. **Top Barbers Podium (3D)** — three avatar crests on a tilted podium with CSS 3D transform + slow rotateY hover. Country flags, BB earnings counter animating up. Tagline: *"This week's leaders."*

3. **Book the Best** — mock appointment card with calendar slots filling in real-time (animated check-ins), specialty pills, and "Near You" badge. Tagline: *"Book pros in 60 seconds."*

4. **Open Challenges** — stack of 2-3 challenge cards fanning out, with BB stake amounts (100 / 250 / 500), countdown timers, and a "Throw Down" pulse button. Tagline: *"Stake. Battle. Win BB."*

5. **Watch Feed Tease** — vertical-video phone frame with auto-playing muted clip thumbnails cycling, like/share counters animating. Tagline: *"Endless cuts, 24/7."*

Each card uses the existing brand palette — Neon Orange for barber/competitive accents, Zion Cyan for fan/social accents, no gradient soup.

## Motion & polish

- Framer Motion `AnimatePresence` with `mode="wait"`, fade + slight Y-slide between cards
- Auto-advance every 4s; pause on tap; tap-to-skip-forward
- 5 progress dots at the bottom; the active dot fills left-to-right as a 4s timer
- Subtle parallax: each card's hero element gets a gentle floating animation (`y: [0, -6, 0]` over 6s)
- Live red pulse dot on Live Now card
- Number counters use `motion` springy count-up (no library needed — small custom hook)
- Reduced-motion respects `prefers-reduced-motion`: rotation pauses, animations become fades

## Files

**New**
- `src/components/landing/InsideTheHubStage.tsx` — the rotating stage container, AnimatePresence, dots, autoplay logic
- `src/components/landing/teasers/LiveNowCard.tsx`
- `src/components/landing/teasers/TopBarbersCard.tsx`
- `src/components/landing/teasers/BookingCard.tsx`
- `src/components/landing/teasers/ChallengesCard.tsx`
- `src/components/landing/teasers/WatchFeedCard.tsx`
- `src/components/landing/teasers/useCountUp.ts` — tiny animated counter hook

**Edited**
- `src/components/landing/VelvetRopeLanding.tsx` — replace `<LeaguePulseStrip />` and the existing `<RotatingTeaserStage />` section with a single `<InsideTheHubStage />` filling the remaining viewport height (`flex-1 min-h-0`)

**Untouched**
- Signature header, role pills, VIP code panel, Sign-in footer, AuthModalV2
- `LeaguePulseStrip.tsx` and `RotatingTeaserStage.tsx` left in repo (unreferenced) in case you want to revert; can delete in a follow-up if you confirm

## Data sources (read-only, public)

- `supabase.rpc('get_public_league_stats')` — for Live Now battle/viewer counts and BB-in-play
- `barber_profiles` public view — top 3 barbers by recent BB / wins for the podium (already exposed via `public_user_profiles` view per security memory)
- Static curated avatars/clips as fallback if RPCs are slow, so the stage never shows empty

No new edge functions, no migrations, no schema changes — pure presentation layer.

## Mobile constraints honored

- Entire page still fits 100dvh with zero scroll on a 390×742 viewport (the user's current preview)
- Stage uses `flex-1 min-h-0` so it absorbs whatever vertical space remains after header/pills/code/footer
- All text uses `clamp()` or Tailwind responsive scales; no overflow risk
- Cards designed at 320px min-width baseline

## Out of scope (ask if you want them)

- Replacing the signature header (you said keep it as-is)
- Dragging/swiping between cards (autoplay only, with tap-to-advance)
- Real video playback in Watch Feed card (using thumbnail cycle to keep page lightweight)

Ready to build on approval.
