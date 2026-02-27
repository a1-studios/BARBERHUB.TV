

## Fan Profile Redesign: Full-Page Hero + Sponsor Board Access

### What We're Building
1. **Fan Profile Header** — a new `FanProfileHeader` component mirroring the barber header style: country flag emoji, avatar, display name, BB wallet inline, stats (votes cast, voting power), and edit button
2. **Reorder Profile.tsx** — for fans, show the new header at the top (replacing the separate Personal Info card + BB Wallet), with transaction history below
3. **"Become Official Sponsor" button** — a small minimalistic icon/badge in the fan header that opens a modal to purchase sponsor board time with BB
4. **Sponsor board purchase flow** — a new `SponsorBoardPurchaseModal` component where fans pick a duration (e.g., 1 day = 50 BB, 3 days = 120 BB, 7 days = 250 BB), pay with BB, and get auto-inserted into the `sponsor_ads` table with their profile info

### Changes

#### 1. New component `FanProfileHeader.tsx`
- Similar structure to `BarberProfileHeader` — Card with gradient overlay, country flag background
- Shows: avatar, display_name, country flag, "Fan" role badge, SubCategoryBadge (if official_sponsor)
- Inline BB wallet display (top-right, same as barber header) with Add Funds button
- Stats row: Votes Cast, Voting Power
- Small "Become Sponsor" icon button (Award icon, gold accent) — only shows if user is NOT already an official_sponsor
- Edit Profile button that toggles inline editing of display_name, username, bio
- Country shown but locked (same locked badge pattern)

#### 2. New component `SponsorBoardPurchaseModal.tsx`
- Dialog with 3 tier options: 1-day, 3-day, 7-day sponsor board slots priced in BB
- Each option shows: duration, BB cost, what they get (logo on sponsor ticker, "Official Sponsor" sub-category badge)
- On purchase: deducts BB via edge function, inserts into `sponsor_ads` with `highlight_end` set to now + duration, sets user's `sub_category` to `official_sponsor`
- Minimalist dark theme with neon orange/zion blue accents

#### 3. New edge function `purchase-sponsor-slot`
- Accepts `user_id`, `duration_days`, `bb_cost`, `name`, `message`, `logo_url`, `link`
- Validates BB balance, deducts BB, creates `barber_bucks_transactions` record
- Inserts into `sponsor_ads` with calculated `highlight_end`
- Updates `profiles.sub_category` to `official_sponsor`
- Returns success

#### 4. Update `Profile.tsx` — fan layout
- Remove the separate Personal Info Card and BB Wallet Widget for fans
- Replace with `FanProfileHeader` at the top (same position as barber header)
- Keep TransactionHistory below
- Full-page feel: remove max-w-4xl constraint, use edge-to-edge on mobile

### Technical Details
- `FanProfileHeader` reuses `RotatingBBCoin`, `SubCategoryBadge`, `RoleBadge` components
- Country flag uses same `getCountryFlag()` helper as barber header
- The sponsor purchase modal is triggered from a small Award icon in the header
- Edge function uses service role for cross-table updates (profiles + sponsor_ads + transactions)
- No new DB tables needed — reuses `sponsor_ads` and `profiles.sub_category`

