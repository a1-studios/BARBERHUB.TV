

## Reshape Creator Hub: Educator-First + Universal Feed Architecture

### What We're Building

The Creator Hub transforms from a dashboard-heavy page into an **educator-first media upload station** with a compact stats popup, a "Promote to Feed" toggle, and the foundation for a universal feed system. The page becomes the barber's content creation command center — native iOS feel, everything fits on one screen.

### Database Changes

**1. Add columns to `creator_content` table:**
- `promote_to_feed` BOOLEAN DEFAULT false — barber controls whether content appears in global feed
- `content_category` TEXT — 'masterclass', 'tutorial', 'tip', 'course'
- `boost_amount_bb` INTEGER DEFAULT 0 — BB spent to boost visibility
- `is_published` BOOLEAN DEFAULT false — gates on subscription tier

**2. Create `feed_items` table:**
```
id UUID PK
content_id UUID NOT NULL
content_type ENUM ('battle', 'course_teaser', 'sponsor_ad', 'update')
source_table TEXT — origin table name for joins
creator_id UUID REFERENCES profiles(user_id)
is_locked BOOLEAN DEFAULT false
rank_score FLOAT DEFAULT 0
promote_boost INTEGER DEFAULT 0
created_at TIMESTAMPTZ DEFAULT now()
```
With RLS: everyone can SELECT, only system/creator can INSERT/UPDATE own rows.

**3. Create DB function `build_universal_feed()`:**
A function that unions battle_submissions, creator_content (where promote_to_feed=true), and sponsor_ads into a ranked feed with the 50/30/10/10 ratio logic.

### UI Changes

**`src/pages/CreatorHub.tsx` — Full Rewrite:**
- Remove: BarberProfileHeader, BackButton, featured creator section, appointments section, the 3-column grid layout
- New layout: Compact single-screen, mobile-native (pt-16, no container margins)
- Structure:
  1. **Header bar** — "CREATOR HUB" title + small gear icon for stats popup
  2. **Media Upload Zone** — Large upload area (video/image) with title, category selector (Masterclass, Tutorial, Tip), description
  3. **"Promote to Feed" toggle** — Switch that controls whether content goes to the global feed
  4. **"Boost with BB" option** — Small input to spend BB on feed visibility
  5. **Publish button** — If barber has no active subscription tier, tapping "Publish" opens the UpgradePrompt drawer. If subscribed, publishes directly
  6. **Deal Board** — Kept below the upload section
  7. **Bottom Nav** — Existing BottomNavBar

**`src/components/creator/CreatorStatsDrawer.tsx` — New Component:**
A bottom sheet (Drawer) that consolidates all the old dashboard content into a popup:
- Content count, Views, Likes, Shares (the 4 stat cards)
- Earning history (recent transactions from EarningSystem)
- Recent achievements (milestones)
- Referral program summary with code + share button
- Triggered by tapping the gear/stats icon in the header

**`src/components/creator/EducatorUpload.tsx` — New Component:**
The main upload interface replacing CreatorDashboard:
- Video + image upload to Supabase Storage (`videos` bucket for video, `creations` for images)
- Content type selector: Masterclass | Tutorial | Quick Tip
- Title + description fields
- "Promote to Feed" toggle switch
- "Boost" BB input (optional)
- Publish button with tier-gate logic:
  - If no subscription → opens UpgradePrompt with reason='premium_feature' and title='Publish to the Global Feed — upgrade to Educator tier'
  - If subscribed → inserts into `creator_content` with status='published' and creates a `feed_items` row if promote_to_feed is on

**`src/components/creator/CreatorDashboard.tsx` — Delete** (absorbed into CreatorStatsDrawer)

**`src/components/creator/EarningSystem.tsx` — Keep** but import into CreatorStatsDrawer instead of page

**`src/components/creator/ReferralProgram.tsx` — Keep** but import into CreatorStatsDrawer instead of page

### Feed Integration (WatchFeed)

**`src/pages/WatchFeed.tsx` — Modify:**
- Add a query to `feed_items` joined with source tables
- Interleave using the ratio: 50% battles, 30% educator teasers, 10% social updates, 10% sponsor ads
- Educator teasers show as 30s clips (using `media_url` from `creator_content`) with the barber's TierRing avatar

### Binary Role Logic
- Only barbers can access Creator Hub (already enforced via `isBarber` check)
- Only fans/sponsors can sponsor (SponsorDealBoard posts are created by sponsor role — existing logic)
- Barbers use existing "Promote" system (sponsor_ads table pattern) to boost content with BB

### Changes Summary

| File | Action |
|------|--------|
| `src/pages/CreatorHub.tsx` | **Rewrite** — Educator-first layout, compact mobile-native |
| `src/components/creator/EducatorUpload.tsx` | **Create** — Video/image upload with promote toggle + publish gate |
| `src/components/creator/CreatorStatsDrawer.tsx` | **Create** — Bottom sheet consolidating stats, earnings, referrals |
| `src/components/creator/CreatorDashboard.tsx` | **Delete** — Absorbed into stats drawer |
| `src/pages/WatchFeed.tsx` | **Modify** — Add educator content to feed mix |
| DB Migration | `feed_items` table + `creator_content` columns + `build_universal_feed` function |

