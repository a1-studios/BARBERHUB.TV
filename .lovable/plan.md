## Why the teasers don't feel "real"

I audited the DB. Real rows we have today:
- **9 barbers** in `public_user_profiles` (5 with avatars), each linked to `barber_profiles` with `specialty`, `rating`, `years_experience`, `location`, `is_live`
- **6 active/upcoming battles** in `battles` ✅ (already wired)
- **3 active products** in `products` (Razor, Snapback, Cape) with real images + BB prices — **never queried**
- **5 historical appointments** in `appointments` — none future, none open
- **0 rows** in `battle_submissions` and **0 live `stream_sessions`** — that's why the Watch strip is all emoji

So the gap is real, not architectural. Plan to close it:

### 1. Sphere — show all 9 real barbers
`useTopBarbers` currently does `.not('avatar_url','is',null)` which drops 4 of 9 barbers. Remove that filter, lower `PIN_COUNT` from 14 to match what's actually returned (cap at `Math.max(barbers.length, 8)`), and use `barber_profiles.country_code` + `is_live` as a green ring on pins that are live right now.

### 2. Booking card — pull real barber, real specialties, real availability
Stop hardcoding `Andre "The Blade"` and the `9:00 / 10:30 / 12:00` grid.
- Featured barber = `useTopBarbers()[0]` joined to `barber_profiles` for `specialty`, `rating`, `years_experience`, `shop_city`, `is_live`
- Replace fake slot grid with **real signal**: query `appointments WHERE barber_user_id=… AND scheduled_at>=today` to compute "next 3 open windows" against a 9–17 working day; if zero, show "Next available: tomorrow 9:00" derived locally and a real "**X cuts booked this month**" count from `appointments` for that barber
- Specialty pills come from `barber_profiles.specialty` (string, comma-split)

### 3. New Gear teaser slide — pulled from `products`
Add `GearCard.tsx` as a new slide between `book` and `challenges`. Queries `products WHERE is_active=true ORDER BY display_order LIMIT 4`. Shows real `image_url`, `name`, `price_bb` with a "Tap to shop in BB" CTA. New hook `useFeaturedProducts()` in `useLandingData.ts`.

### 4. Watch feed strip — only render if real
- Extend `useFeaturedClips` to also query `stream_sessions WHERE recording_url IS NOT NULL` and `barber_profiles.featured_video_id` / `youtube_channel_id` for thumbnails
- For `battle_submissions.cloudflare_stream_uid`, build CF Stream thumbnail URL `https://videodelivery.net/{uid}/thumbnails/thumbnail.jpg`
- If after all that we still have 0 real clips, **hide the strip entirely** instead of rendering 6 emoji boxes. Honest empty state > fake content.

### 5. Live PK card — already real, leave alone
Already resolves `barber_profiles.id → public_user_profiles`. No change.

### Files
- Edit `src/components/landing/teasers/useLandingData.ts` (drop avatar filter; add `useFeaturedProducts`; add appointments lookup; CF Stream thumb resolution)
- Edit `BarberGlobeCard.tsx` (dynamic pin count, live ring)
- Rewrite `BookingCard.tsx` (real barber + real availability; remove hardcoded arrays)
- Create `src/components/landing/teasers/GearCard.tsx`
- Edit `InsideTheHubStage.tsx` (insert gear slide)
- Edit `WatchFeedStrip.tsx` (hide when empty; CF thumbs)

### Out of scope (call out, don't build)
- No DB writes, no new tables, no edge functions
- Won't seed fake clips/appointments — if they're empty, the UI shows that honestly
- No Cloudflare account changes; only resolves thumbnail URLs from existing `cloudflare_stream_uid` values

### Open question
Booking availability: do you want me to **derive** "next free slot" from a fixed 9–17 working day minus existing appointments (cheap, no schema change), or wait until you have a real `barber_availability` table? I'll go with the derived approach unless you say otherwise.
