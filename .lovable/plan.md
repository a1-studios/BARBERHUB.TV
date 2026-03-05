

## System Sync & Implementation Plan

### Schema Sync Confirmed

The latest Supabase schema has been verified. Key confirmations:
- `m4m_fund_ledger` table exists (id, amount_bb, source_type, reference_id, created_at)
- `process_battle_donation` RPC exists as a SECURITY DEFINER function implementing the 80/15/5 split with row-level locking
- **No IVS columns** exist on the `battles` table yet (ivs_playback_url, ivs_stream_key, ivs_channel_arn need to be added)
- `sponsor_ads` table lacks `product_image_url`, `starts_at`, `ends_at` columns

---

### Task 1: Economy Guardrail — Wire UI to RPC

**Problem:** `DonationModal.tsx` currently calls the `process-bb-donation` Edge Function (which does a flat 100% transfer). The secure `process_battle_donation` RPC already handles the 80/15/5 split server-side.

**Changes:**
- **`src/components/DonationModal.tsx`** — For battle-context donations, call `supabase.rpc('process_battle_donation', { p_battle_id, p_donor_id, p_barber_id, p_amount_bb, p_message })` instead of invoking the edge function. For direct creator tips (non-battle), keep the existing `process-bb-donation` EF (those are 100% to barber, no split).
- Add an optional `battleId` and `barberId` prop to `DonationModal` so it knows which path to take.

---

### Task 2: AWS IVS Pivot — Remove YouTube, Add HLS Video Player

**Problem:** `BattleTheater.tsx` imports `YouTubeStreamPlayer`. `VideoSubmissionModal.tsx` uses `youtubeHelpers.ts`. These must be replaced.

**Changes:**

**DB Migration** — Add IVS columns to `battles`:
```sql
ALTER TABLE public.battles
  ADD COLUMN IF NOT EXISTS ivs_stream_key TEXT,
  ADD COLUMN IF NOT EXISTS ivs_playback_url TEXT,
  ADD COLUMN IF NOT EXISTS ivs_channel_arn TEXT;
```

**Delete files:**
- `src/components/battles/YouTubeStreamPlayer.tsx`
- `src/utils/youtubeHelpers.ts`

**New file: `src/components/battles/HLSVideoPlayer.tsx`**
- A simple component wrapping a `<video>` tag
- Accepts `src` (HLS playback URL), `isLive`, `poster` props
- Ready for `amazon-ivs-player` integration later (comment placeholder)

**Update `src/pages/BattleTheater.tsx`:**
- Replace `YouTubeStreamPlayer` import with `HLSVideoPlayer`
- Use `battle.ivs_playback_url` or `battle.barber_1_video_url` / `battle.barber_2_video_url` as source

**Update `src/components/battles/VideoSubmissionModal.tsx`:**
- Remove YouTube URL validation and `youtubeHelpers` import
- Replace with a generic video URL input (Twilio VOD or HLS URL)
- Remove YouTube-specific instructions card

**Update `src/components/VideoPlayer.tsx`:**
- Remove `youtubeVideoId` prop and all YouTube embed logic

**Update any other files** referencing `YouTubeStreamPlayer` or `youtubeHelpers` (search confirms: `FullscreenBattleVideoModal`, `SubmissionPreview`, `LiveBarberStreams`).

**Barber "Go Live" UI in `src/components/barber/BarberDashboard.tsx`:**
- Add a "Go Live" card that displays `ivs_stream_key` and `ivs_playback_url` from the active battle
- Include a "Request Stream Key" button (placeholder — will call AWS backend when connected)
- Show stream key in a copyable input field

---

### Task 3: Camera Calibration Studio

**New file: `src/pages/CameraStudio.tsx`**
- Full-screen local camera preview using `navigator.mediaDevices.getUserMedia`
- Device selectors (camera/mic dropdowns via `enumerateDevices`)
- Audio level meter using Web Audio API `AnalyserNode` rendered to a canvas or progress bar
- Lighting/framing guide overlay (rule-of-thirds grid, brightness indicator)
- "Back to Dashboard" button

**Update `src/App.tsx`:**
- Add route `/studio` wrapped in `AuthGuard` + `BarberGuard`

**Update `src/components/QuickActionsMenu.tsx`:**
- Add "Camera Studio" action (barberOnly, path: `/studio`, Camera icon)

**Update `src/components/barber/BarberDashboard.tsx`:**
- Add "Camera Studio" link button in the Live Streaming section

---

### Task 4: Sponsor Marketplace Consolidation

**DB Migration** — Enhance `sponsor_ads`:
```sql
ALTER TABLE public.sponsor_ads
  ADD COLUMN IF NOT EXISTS product_image_url TEXT,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
```

**Update `src/components/admin/SponsorAdsManager.tsx`:**
- Add `product_image_url` upload field (same pattern as logo upload)
- Add `starts_at` / `ends_at` date inputs for scheduling

**Update `src/hooks/useSponsorAds.tsx`:**
- Add `product_image_url`, `starts_at`, `ends_at` to `SponsorAd` interface
- When `activeOnly`, also filter by date range: `starts_at <= now AND (ends_at IS NULL OR ends_at >= now)`

**Update `src/components/creator/SponsorDealBoard.tsx`:**
- Cross-reference: fetch gigs where `sponsor_id` matches `created_by` of active sponsor ads
- Show a "Sponsored" badge on gigs from sponsors with active ads

---

### Summary of Files Changed

| Change | Files |
|--------|-------|
| Economy RPC wiring | `DonationModal.tsx` |
| YouTube removal | Delete 2 files, update ~6 components |
| HLS player | New `HLSVideoPlayer.tsx` |
| IVS columns | DB migration |
| Go Live UI | `BarberDashboard.tsx` |
| Camera Studio | New `CameraStudio.tsx`, `App.tsx`, `QuickActionsMenu.tsx` |
| Sponsor enhancement | DB migration, `SponsorAdsManager.tsx`, `useSponsorAds.tsx`, `SponsorDealBoard.tsx` |

No CSS, Tailwind config, or branding changes.

