

## Add Sponsor Board Control Panel to Sovereign HQ

### Overview
Create a new `SponsorControlPanel` component embedded directly in the Sovereign HQ page. This gives the Sovereign full god-mode control over the sponsor ads system — add/remove/edit ads, upload media (logos, footage), toggle active status, reorder, and monitor all sponsor activity — without navigating away from the command center.

### Changes

#### 1. New component: `src/components/sovereign/SponsorControlPanel.tsx`
- A self-contained panel styled to match the existing Sovereign HQ dark theme (bg-[#1a1a2e], border-gray-800, etc.)
- Fetches all sponsor ads using `useSponsorAds(false)` (shows active + inactive)
- Features:
  - **Stats header**: Total sponsors, active count, inactive count
  - **Sponsor table**: Logo preview, name, message, order, active toggle, edit/delete buttons
  - **Add Sponsor button**: Opens inline dialog with full form (name, message, highlight chars, logo upload, link, display order, active toggle)
  - **Edit**: Same dialog pre-filled with existing data
  - **Delete**: With confirmation alert dialog
  - **Logo/media upload**: Uses existing `sponsor-logos` storage bucket, supports image + video file uploads
  - **Bulk toggle**: Kill-switch style button to deactivate all sponsors at once
  - **Override indicator**: Shows "SOVEREIGN OVERRIDE" badge on any action taken
- All CRUD operations go directly to `sponsor_ads` table via Supabase client (same pattern as existing `SponsorAdsManager`)

#### 2. Update `src/pages/SovereignHQ.tsx`
- Import and add `SponsorControlPanel` as a new section between the control panels grid and the audit log
- Pass `onRefresh={refresh}` prop for consistency

### Technical notes
- Reuses the existing `sponsor_ads` table, `useSponsorAds` hook, and `sponsor-logos` storage bucket — no database changes needed
- Follows the same `(supabase.from("sponsor_ads" as any) as any)` pattern used in the existing `SponsorAdsManager` for type safety workaround
- The panel mirrors `SponsorAdsManager` functionality but is embedded in the Sovereign HQ dark theme with added bulk controls and monitoring stats

