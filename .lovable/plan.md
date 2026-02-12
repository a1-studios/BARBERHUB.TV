

## Refine Challenge Mode + Creator Hub Revenue Enhancement

### Overview

This plan adds three focused features while preserving the existing minimalist dark/orange/cyan design language:

1. A simplified Challenge icon button (replacing the verbose form)
2. A Sponsor Deal Board in the Creator Hub for revenue generation
3. Minor Creator Hub layout refinements for the new gig economy section

All existing components, routes, and functionality remain intact.

---

### 1. Simplify Challenge Mode Button

**Current state:** The `OpenChallengeQueue` component renders a full-page section with a large header, description text, and the `IssueChallenge` form always visible in a 3-column grid alongside `ChallengeFeed`.

**Change:** Replace the verbose layout with a minimalist approach:

- Add a single icon button (Flame icon) in the Portal page's barber section that expands the challenge form in a sheet/drawer when tapped
- The `IssueChallenge` and `ChallengeFeed` components remain completely unchanged internally
- Only the wrapper `OpenChallengeQueue` component gets restructured to be compact

**File: `src/components/battles/OpenChallengeQueue.tsx`**
- Replace the large section layout with a compact card containing:
  - A row with the Flame icon, "Personal Challenges" label, active challenge count badge, and a "Issue Challenge" icon button (Plus icon)
  - Clicking the button opens a Sheet (bottom drawer on mobile) containing the existing `IssueChallenge` form
  - Below the header row, show the `ChallengeFeed` in a more compact grid
- This reduces vertical footprint by ~60% while keeping all functionality

---

### 2. Sponsor Deal Board (Creator Hub Revenue)

**New component: `src/components/creator/SponsorDealBoard.tsx`**

A "Gig Board" section within the Creator Hub that displays sponsor opportunities for verified barbers to earn revenue. This creates a marketplace where sponsors post gigs and barbers can apply.

Design:
- Section header: Briefcase icon + "DEAL BOARD" in the established orange/white split text style
- Grid of gig cards, each showing:
  - Sponsor logo/name
  - Gig title and brief description
  - Budget (in BB)
  - Location tag
  - "5% to Minutes for Men" badge (mandatory donation)
  - "Apply" button (orange primary)
- Empty state with a Sparkles icon and "No gigs available yet" message
- Data source: New `sponsor_gigs` table (reads only -- creation is admin/sponsor-side)

**Database: `sponsor_gigs` table**
- `id` (UUID, PK)
- `sponsor_id` (UUID, FK to profiles)
- `title` (text)
- `description` (text)
- `budget_bb` (integer)
- `location` (text, nullable)
- `charity_percent` (integer, default 5)
- `slots` (integer, default 1)
- `applications_count` (integer, default 0)
- `status` (text: 'open', 'filled', 'closed')
- `is_active` (boolean, default true)
- `created_at`, `updated_at`
- RLS: All authenticated users can SELECT active gigs; only the sponsor who created it can UPDATE/DELETE

**New component: `src/components/creator/GigApplicationModal.tsx`**
- Simple dialog: shows gig details, a short message textarea, and "Submit Application" button
- Inserts into a `gig_applications` table (barber_id, gig_id, message, status)

**Database: `gig_applications` table**
- `id`, `gig_id` (FK), `barber_id` (FK to profiles user_id), `message` (text), `status` (text: 'pending', 'accepted', 'rejected'), `created_at`
- RLS: Barbers can INSERT their own applications and SELECT their own; sponsors can SELECT applications for their gigs

---

### 3. Creator Hub Layout Update

**File: `src/pages/CreatorHub.tsx`**

Add the SponsorDealBoard as a new section between the BarberProfileHeader and the existing CreatorDashboard/EarningSystem grid:

```
[BarberProfileHeader]        -- existing, unchanged
[SponsorDealBoard]           -- NEW: full-width gig board
[CreatorDashboard + Earning] -- existing 2/3 + 1/3 grid
[ReferralProgram]            -- existing sidebar
```

Single import addition and one JSX block inserted. No existing components modified.

---

### Summary of All Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/components/battles/OpenChallengeQueue.tsx` | Edit | Compact layout with icon button + Sheet drawer for IssueChallenge |
| `src/components/creator/SponsorDealBoard.tsx` | Create | Gig board displaying sponsor opportunities |
| `src/components/creator/GigApplicationModal.tsx` | Create | Application dialog for barbers to apply to gigs |
| `src/pages/CreatorHub.tsx` | Edit | Add SponsorDealBoard section |
| Database migration | Create | `sponsor_gigs` and `gig_applications` tables with RLS |

### What Is NOT Changing

- Header component -- stays fixed with BB wallet
- DynamicBattleHero -- 50/50 split preserved
- IssueChallenge form internals -- untouched
- ChallengeFeed internals -- untouched  
- ImmersiveFactionBanners -- untouched
- ArenaTicker sponsor rotation -- untouched
- All routing in App.tsx -- untouched
- Color scheme (deep black, neon orange, cyan blue) -- strictly maintained
- All existing battle flow logic -- untouched

