
# Real Backend Data + Working Sign-In

Two issues to fix on the Velvet Rope landing:

1. **Sign-In is blocked by VIP gate** — existing users shouldn't see the code prompt
2. **Teaser cards use mocked data** — switch to live Supabase reads (we have plenty of real data already)

## 1. Unblock sign-in for existing users

`AuthModalV2` always starts at `step: 'gate'`, which forces the VIP-code prompt before identity. In `mode === 'signin'` we skip the gate entirely and jump to `identity` — existing users just need email + 6-digit OTP.

**Edit:** `src/components/auth/AuthModalV2.tsx`
- Initial step on open: `mode === 'signin' ? 'identity' : 'gate'`
- Reset effect mirrors the same logic
- "Edit email" / back buttons in sign-in flow go back to `identity`, not `gate`
- Description for `identity` step in sign-in mode reads "Enter your email — we'll send a 6-digit code."

That's the entire sign-in fix. The Supabase OTP send/verify path (`signInWithOtp` + `verifyOtp`) already works with `shouldCreateUser: false` for sign-in mode, so no other changes.

## 2. Wire teaser cards to real Supabase data

Real data confirmed live in DB:
- `get_public_league_stats()` RPC → live_battles=3, active_battles=6, barbers_total=9, fans_total=28, countries=10, bb_in_circulation=105
- `battles` table → vote counts, live viewers, `barber1_is_streaming` / `barber2_is_streaming`, titles
- `open_challenges` table → `challenger_username`, `stake_amount`, `expires_at`, `status='open'`
- `public_user_profiles` view → real `display_name`, `avatar_url`, `country_code`, `user_type` (avatars are already in public Supabase storage)
- `battle_submissions` → `thumbnail_url`, `media_url`, `stream_thumbnail_url` for the watch feed (when present)

### New shared hook

**Create:** `src/components/landing/teasers/useLandingData.ts`
- React Query hook(s) that fetch:
  - `get_public_league_stats()` (already used)
  - `battles` filtered to `status IN ('live','active')` or streaming flags true, joined with two `public_user_profiles` lookups for both barbers — limit 1 most-recent (drives Live Now card)
  - `public_user_profiles` where `user_type='barber'` with avatar_url not null, ordered by created_at desc, limit 6 (drives Top Barbers podium — DB has no BB-leaderboard yet, so we rank by activity proxy: barbers with avatars + country come first; we display country flag + display_name, not faux BB amounts unless `bb_in_circulation` is split per-barber, which it isn't)
  - `open_challenges` where `status='open'` ordered by `created_at desc`, limit 3 (drives Challenges card)
  - `battle_submissions` where `thumbnail_url is not null` ordered by `created_at desc`, limit 5 (drives Watch Feed card; falls back to gradient tiles if empty)
- All queries `staleTime: 60s`, `refetchInterval: 90s`. Public-only data — no auth required.
- Graceful fallbacks: if a query returns empty, the card shows a curated "Inside the Hub" filler instead of breaking. No card disappears.

### Card rewrites

Each card receives data via props from `InsideTheHubStage`, which calls the hook once and passes slices down. No card calls Supabase directly.

**`LiveNowCard`** — already takes `liveBattles` + `viewers`. Add a `battle` prop with `{ title, barber1: { name, flag, avatar }, barber2: { name, flag, avatar } }` derived from the most-recent live battle. Renders avatars (or country flag fallback) instead of the static ✂️ emoji. Title shown as a marquee strip at the bottom. Falls back to current Marco/Diego mock if no live battle.

**`TopBarbersCard`** — accepts `barbers: Array<{ name, flag, avatar_url }>` (top 3). Uses real avatars in the crests (with country-flag fallback for nulls). Removes the fabricated BB amounts since the DB doesn't expose per-barber BB; replaces them with the real `country_code` flag + `display_name`. Sub-label switches from "X BB" to "🇺🇸 USA" style.

**`BookingCard`** — accepts `featuredBarber: { name, avatar, country_code }` (random from real top barbers). Slot times stay illustrative (we have no public-slot endpoint and surfacing real client appointments would leak data) — but the barber identity is real, with their actual avatar and flag.

**`ChallengesCard`** — accepts `challenges: Array<{ from, flag, stake, ttl }>` from `open_challenges`. `ttl` computed live from `expires_at - now()`. Stake from `stake_amount`. `from` from `challenger_username`. Falls back to current curated stack if zero open challenges.

**`WatchFeedCard`** — accepts `clips: Array<{ thumbnail_url, title, author }>`. Uses real `battle_submissions` thumbnails when available. Falls back to current gradient + emoji tiles when none. Auto-cycles every 1.8s as today.

### Stage edits

**Edit:** `src/components/landing/InsideTheHubStage.tsx`
- Replace inline `useQuery` with `useLandingData()` from the new hook
- Pass each card its data slice
- Keep autoplay/dots/swipe behavior unchanged

## Files

**Create**
- `src/components/landing/teasers/useLandingData.ts`

**Edit**
- `src/components/auth/AuthModalV2.tsx` — sign-in skips gate
- `src/components/landing/InsideTheHubStage.tsx` — use new hook, pass props
- `src/components/landing/teasers/LiveNowCard.tsx` — accept real battle
- `src/components/landing/teasers/TopBarbersCard.tsx` — accept real top barbers
- `src/components/landing/teasers/BookingCard.tsx` — accept real featured barber
- `src/components/landing/teasers/ChallengesCard.tsx` — accept real open challenges
- `src/components/landing/teasers/WatchFeedCard.tsx` — accept real clips

**No DB changes.** All reads use existing public RPC + tables already covered by RLS policies that allow anon read on `public_user_profiles`, `battles`, `open_challenges`, `battle_submissions`.

## Out of scope

- Building a real "top barbers by BB earned" leaderboard (DB tracks `bb_in_circulation` only as a global total — would need a new RPC)
- Showing real available booking slots for non-authenticated visitors (leaks PII)
- Replacing the OTP login with social OAuth on this screen

Ready to build on approval.
