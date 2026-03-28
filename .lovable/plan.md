
Goal: stop standalone barber videos from appearing in the home “VS” hero, and make them live only in /watch as single-player theater items that play until the video ends unless the user scrolls away.

What I audited
- Home page is still showing standalone videos in a versus layout because `Index.tsx` renders `DynamicBattleHero`, and `DynamicBattleHero.tsx` falls back to `featuredBarbers` when there is no real battle.
- That fallback uses `public_barber_profiles.featured_video_id` inside two side-by-side `BarberVideoSection` panels, so ordinary profile videos are being treated like battle content.
- The same fallback also auto-rotates every 8 seconds, which is the “continuous skipping” behavior you’re seeing.
- `/watch` is not pulling from the right source for these videos. `WatchFeed.tsx` currently loads standalone videos from `battle_submissions`, but the actual uploaded barber videos in your data are stored on `public_barber_profiles.featured_video_id`.
- Real battle rows currently have no paired battle video URLs in the DB, so the home hero is filling the gap with non-battle profile videos.

Implementation plan

1. Remove standalone profile videos from the home battle hero
- Update `DynamicBattleHero.tsx` so only actual battle media can render in the split/VS hero.
- If there is no real active/upcoming/voting battle with valid battle participants and battle media, show a neutral empty/CTA state instead of rotating featured profile videos.
- Remove the `featuredBarbers` fallback rotation for battle hero playback so home no longer auto-skips through profile videos.

2. Move standalone barber videos into `/watch`
- Update `WatchFeed.tsx` to fetch non-battle video items from `public_barber_profiles` / `public_barber_profiles.featured_video_id` instead of `battle_submissions`.
- Keep split-screen rendering reserved strictly for records from `battles` that have both `barber_1_video_url` and `barber_2_video_url`.
- Keep educator/platform items in the single-player theater lane as they are now.

3. Make single-player videos play for full duration
- Keep non-battle items in theater mode only.
- Ensure the active video plays until its natural `ended` event.
- Do not auto-advance based on timers or hero rotation.
- Scrolling remains the only way to skip to the next item; ended videos show replay instead of jumping.

4. Tighten battle-vs-non-battle rules
- Add a clear content mapping:
  - `battles` with both battle video URLs → versus mode
  - `featured_video_id` / standalone barber uploads → theater mode in `/watch`
  - no fallback from standalone videos into battle hero
- This prevents future regressions where profile media accidentally appears in battle surfaces.

Files to update
- `src/components/DynamicBattleHero.tsx`
- `src/pages/WatchFeed.tsx`
- likely `src/components/barber/BarberVideoSection.tsx` only if a small playback prop is needed for non-loop/full-duration behavior consistency

Technical notes
- Root cause of “still rendering in versus mode”: `DynamicBattleHero.tsx` uses `featuredBarbers` fallback and renders `featured_video_id` in the split hero.
- Root cause of “videos keep skipping”: the 8-second `featuredBarbers` rotation on home.
- Root cause of “content isn’t in watch”: `/watch` queries `battle_submissions`, while your actual uploaded standalone videos currently exist on `public_barber_profiles.featured_video_id`.

Expected result
- Home shows only real battle-oriented content.
- Standalone barber videos appear in `/watch`.
- Those videos play from start to finish unless the user manually scrolls past them.
- Split-screen/versus is used only for true battle media.
