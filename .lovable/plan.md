

# Dynamic Sponsor Ads: Supabase Table + Logo Support + Admin Management

## Overview

Create a `sponsor_ads` Supabase table to replace the hardcoded sponsor placeholder content in the ArenaTicker. Build an admin management page for CRUD operations on sponsor ads (create, edit, toggle active/inactive, delete). Update the ArenaTicker to fetch sponsors from the database and display brand logos alongside the colorful animated text.

## Database

### New Table: `sponsor_ads`

```text
sponsor_ads
+-------------------+----------+------------------------------------------+
| Column            | Type     | Notes                                    |
+-------------------+----------+------------------------------------------+
| id                | uuid PK  | gen_random_uuid()                        |
| name              | text     | Sponsor brand name (e.g. "Wahl Pro")     |
| message           | text     | Ad message text                          |
| highlight_end     | integer  | Char index where bold portion ends       |
| logo_url          | text     | URL to logo image in Supabase storage    |
| link              | text     | Optional click-through URL               |
| is_active         | boolean  | Toggle ad on/off without deleting        |
| display_order     | integer  | Controls rotation order (lower = first)  |
| created_at        | timestamptz | Default now()                         |
| updated_at        | timestamptz | Default now()                         |
| created_by        | uuid     | Admin who created the ad                 |
+-------------------+----------+------------------------------------------+
```

### RLS Policies

- **SELECT**: Public read access for active ads (the ticker is visible to everyone)
- **INSERT/UPDATE/DELETE**: Only users with the `admin` role (checked via the existing `has_role()` function)

### Storage

A new `sponsor-logos` public storage bucket for brand logo images with:
- Public read access for all users
- Upload/delete restricted to admin role users

## Admin UI

### New Page: `/admin/sponsors`

A dedicated sponsor management page accessible from the admin dashboard, protected by AdminGuard. Contains:

**Sponsor list table** showing all ads (active and inactive) with columns:
- Logo thumbnail (small preview)
- Name
- Message (truncated)
- Status toggle (active/inactive switch)
- Display order
- Edit and Delete action buttons

**Create/Edit form** (in a dialog modal):
- Name input (required)
- Message input (required)
- Highlight end number input (how many leading characters are bold)
- Logo upload (image file picker that uploads to `sponsor-logos` bucket)
- Link URL input (optional)
- Display order number input
- Is active toggle switch

**Quick action** button added to the Admin Dashboard's Quick Actions card linking to `/admin/sponsors`.

### New Route

Add `/admin/sponsors` to `App.tsx` wrapped in `AuthGuard` + `AdminGuard`.

## ArenaTicker Changes

### Data Fetching

Replace the hardcoded `SPONSORS` array with a React Query hook that fetches active sponsors from the database:

```text
Query: sponsor_ads table
Filter: is_active = true
Order: display_order ascending
```

The query runs with a 60-second `staleTime` so the ticker doesn't refetch on every re-render but stays reasonably fresh.

### Fallback

If the database returns zero active sponsors, fall back to 4 hardcoded placeholder ads (the current ones) so the ticker never appears empty.

### Logo Display

Each sponsor slide gains a logo image displayed to the left of the text message:

```text
+================================================================+
|                                                                |
|   [LOGO]  "YOUR BRAND HERE -- Premium Slot"  [Sponsored]      |
|                                                                |
+================================================================+
```

- Logo rendered as an `<img>` element, sized `h-8 w-auto sm:h-10` with `object-contain`
- Rounded corners (`rounded-md`) with a subtle border (`border border-white/10`)
- If no logo_url is set, falls back to the Sparkles icon (current behavior)
- Logo fades in with the same scratch-off reveal animation as the text

### Interface Update

The `SponsorSlide` interface updates to:

```text
interface SponsorSlide {
  id: string;
  name: string;
  message: string;
  highlightEnd: number;
  logoUrl?: string;    // NEW: URL to logo image
  link?: string;
}
```

The `icon` field (LucideIcon) is removed since logos replace icons. The `DisplaySlide` union type updates accordingly.

## File Changes

| File | Change |
|------|--------|
| `supabase/migrations/` | New migration: create `sponsor_ads` table, RLS policies, `sponsor-logos` storage bucket |
| `src/components/factions/ArenaTicker.tsx` | Replace hardcoded sponsors with React Query fetch, add logo image rendering, remove LucideIcon dependency from sponsor slides |
| `src/components/admin/SponsorAdsManager.tsx` | **New file**: Full CRUD admin component with table view, create/edit modal, logo upload, toggle active |
| `src/pages/admin/SponsorAdsPage.tsx` | **New file**: Page wrapper for the sponsor ads manager |
| `src/pages/AdminDashboard.tsx` | Add "Manage Sponsors" quick action button |
| `src/App.tsx` | Add `/admin/sponsors` route with AdminGuard |

## Implementation Flow

```text
1. Database migration
   - Create sponsor_ads table
   - Create RLS policies
   - Create sponsor-logos storage bucket + policies

2. Admin management page
   - SponsorAdsManager component (CRUD + image upload)
   - SponsorAdsPage wrapper
   - Add route to App.tsx
   - Add quick action to AdminDashboard

3. ArenaTicker update
   - Add React Query hook to fetch active sponsors
   - Update rendering to show logo images
   - Keep fallback placeholders when no DB sponsors exist
```

No new npm dependencies. Uses existing Supabase client, React Query, shadcn/ui components, and the existing `sponsor-logos` public storage bucket pattern.

