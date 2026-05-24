## Root cause: RLS blocks the landing page

You're right to be frustrated — the data **is in the DB**, but the landing page is visited as an **anonymous (logged-out) user**, and the RLS policies say:

| Table | SELECT policy | Anon can read? |
|---|---|---|
| `battles` | `auth.uid() IS NOT NULL` | ❌ **No** — that's why Live PK shows "Warming up / Warming up" |
| `battle_submissions` | `auth.uid() IS NOT NULL` | ❌ **No** — that's why Watch strip has 0 clips |
| `appointments` | Owner-only | ❌ No (expected; we don't need this for anon) |
| `barber_profiles` | Public policy `true` for anon | ✅ Yes |
| `public_user_profiles` (view) | Inherits — readable | ✅ Yes |
| `products` (active) | Public | ✅ Yes |

So Live + Watch are dark for everyone who isn't signed in, which is the entire purpose of the landing page. That's not a code bug, it's a server-side gate.

## Fix: one SECURITY DEFINER RPC for the landing teasers

I'll add **one** Postgres function `get_landing_teasers()` that runs with elevated privileges and returns only the **public, non-sensitive slice** needed by the landing page:

```jsonc
{
  "live_battle": {
    "id", "title", "viewers", "status",
    "barber1": { "user_id", "display_name", "avatar_url", "country_code", "is_live" },
    "barber2": { /* same shape, may be null */ }
  },
  "featured_clips": [
    { "id", "title", "thumbnail_url", "author" }   // resolves cloudflare_stream_uid → videodelivery thumb
  ],
  "league_stats": { /* mirrors get_public_league_stats */ }
}
```

Why an RPC instead of opening RLS:
- `battles` and `battle_submissions` legitimately need authenticated-only access for full rows (organizer ids, scoring fields, voting metadata). Loosening their RLS would leak more than we want.
- The RPC is a hand-picked projection — only the columns the teaser cards render. No vote counts, no organizer ids, no economy data.
- One round-trip instead of 4. Faster landing.

The function:
- `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`
- Picks the most relevant battle: `status='live'` and both barber ids set, ordered by `barber1_is_streaming OR barber2_is_streaming DESC, created_at DESC`
- Resolves `barber_profiles.id → user_id → public_user_profiles` inside the SQL
- Limits clips to 8 with a non-null thumbnail (or a `cloudflare_stream_uid` we URL-build client-side)
- `GRANT EXECUTE ... TO anon, authenticated`

## Client changes

`src/components/landing/teasers/useLandingData.ts`:
- Replace `useLiveBattle`, `useFeaturedClips`, `useLeagueStats` with **one** `useLandingTeasers()` calling the new RPC.
- Keep `useTopBarbers`, `useFeaturedProducts`, `useOpenChallenges`, `useFeaturedBarberDetail` — those tables are already anon-readable.
- Resolve `cloudflare_stream_uid` → `https://videodelivery.net/{uid}/thumbnails/thumbnail.jpg?time=2s` in the hook (RPC returns the uid; URL building stays client-side so we don't bake a domain into Postgres).

## Also fixing while I'm here
- The "React detected a change in the order of Hooks" warning in `InsideTheHubStage` (the `slides` array length now changes between renders when `featuredDetail` flips from undefined → loaded; I'll stabilize it).
- `TopBarbersCard` has a hard-coded `Kairo / Soren / Rafa` fallback — remove it, show real barbers only.

## Files
- **New migration**: create `get_landing_teasers()` RPC + GRANT
- Edit `src/components/landing/teasers/useLandingData.ts` (single RPC for live + clips + stats)
- Edit `src/components/landing/teasers/TopBarbersCard.tsx` (drop Kairo/Soren/Rafa fallback)
- Edit `src/components/landing/InsideTheHubStage.tsx` (stable slides array)

## Out of scope
- No RLS changes to `battles`, `battle_submissions`, or `appointments` — they stay locked down.
- No new tables, no fake seed data.
- No edge function — pure Postgres RPC is enough.

After this, the Live PK card will show **El-bory vs cj** (your real live battle) on the public landing without any sign-in, and any future submission with a Cloudflare Stream UID will populate the Watch strip automatically.
