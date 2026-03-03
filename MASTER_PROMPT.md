# BARBER-HUB — Master Replication Prompt

> A comprehensive specification to fully replicate the BARBER-HUB application from scratch. This document covers every system, page, component, database table, edge function, design token, and behavioral detail.

---

## Table of Contents

1. [App Identity & Vision](#1-app-identity--vision)
2. [Technology Stack](#2-technology-stack)
3. [Design System](#3-design-system)
4. [Authentication & Onboarding](#4-authentication--onboarding)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [Database Schema](#6-database-schema)
7. [Page-by-Page Breakdown](#7-page-by-page-breakdown)
8. [Core Systems](#8-core-systems)
9. [Edge Functions](#9-edge-functions)
10. [Component Library](#10-component-library)
11. [Feature Flags & Configuration](#11-feature-flags--configuration)
12. [Third-Party Integrations](#12-third-party-integrations)
13. [Security & RLS](#13-security--rls)
14. [Deployment & Environment](#14-deployment--environment)

---

## 1. App Identity & Vision

**Name:** BARBER-HUB  
**Tagline:** "Where Barbers Become Legends"  
**Concept:** A global competitive platform for barbers — think "FIFA World Cup meets barbering." Barbers represent their countries, compete in head-to-head video battles, earn virtual currency ("Barber Bucks" / BB), climb leaderboards, and build professional profiles. Fans vote, follow, donate, and engage with a gamified experience.

**Brand Voice:** Bold, competitive, street-culture meets esports. Language uses arena/battle metaphors. The aesthetic is dark, cinematic, with vibrant orange (#FF6B00) and cyan (#00D9FF) accents.

**Core Pillars:**
1. **Competition** — Head-to-head battles with video submissions, real-time voting, tournaments
2. **Economy** — Barber Bucks (BB) virtual currency, Stripe payments, donations, stakes
3. **Community** — Country-based factions, leaderboards, social following, M4M mental health support
4. **Creator** — Portfolio management, sponsor deals, appointment booking, streaming

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS + shadcn/ui (Radix UI primitives) |
| **State** | TanStack React Query v5 + React Context |
| **Routing** | React Router DOM v6 |
| **Animation** | Framer Motion |
| **Icons** | Lucide React |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions, Storage, Realtime) |
| **Payments** | Stripe (Checkout Sessions via Edge Functions) |
| **3D** | Three.js + React Three Fiber + Drei (Globe on landing) |
| **Video** | YouTube embeds, Twilio Video SDK |
| **QR Codes** | `qrcode` npm package |
| **Maps** | Mapbox GL (barber finder) |
| **Font** | Poppins (Google Fonts) |

### Key Dependencies
```
@supabase/supabase-js, @tanstack/react-query, react-router-dom,
framer-motion, three, @react-three/fiber, @react-three/drei,
lucide-react, qrcode, twilio-video, recharts, canvas-confetti,
zod, react-hook-form, @hookform/resolvers, date-fns,
class-variance-authority, clsx, tailwind-merge, sonner
```

---

## 3. Design System

### 3.1 Color Palette (HSL in CSS variables)

```css
:root {
  --background: 0 0% 6%;        /* #0f0f0f — near-black */
  --foreground: 0 0% 100%;      /* white */
  --card: 0 0% 8%;              /* slightly lighter */
  --primary: 24 100% 52%;       /* #FF6B00 vibrant orange */
  --secondary: 0 0% 12%;
  --muted: 0 0% 15%;
  --muted-foreground: 0 0% 65%;
  --accent: 24 100% 52%;        /* same as primary */
  --cyan: 187 100% 50%;         /* #00D9FF — secondary accent */
  --success: 140 76% 39%;       /* #00C853 */
  --destructive: 0 84% 60%;
  --border: 0 0% 20%;
  --input: 0 0% 15%;
  --ring: 24 100% 52%;
  --radius: 0.75rem;
}
```

### 3.2 Gradients & Shadows
- `--gradient-primary`: from background to primary/10
- `--gradient-hero`: background → primary/15 → background
- `--gradient-card`: card to slightly lighter
- `--shadow-card`: `0 4px 20px hsl(0 0% 0% / 0.3)`
- `--shadow-hover`: `0 8px 30px hsl(24 100% 52% / 0.2)`
- `--shadow-glow`: `0 0 20px hsl(24 100% 52% / 0.3)`

### 3.3 Typography
- Font family: **Poppins** (300–800 weights)
- All headings: `font-semibold`
- Body: system defaults via Poppins

### 3.4 Custom Animations
- `animate-glow` — pulsing orange box-shadow
- `animate-float` — vertical bob (3s infinite)
- `animate-banner-sway` — 3D perspective rotation for faction banners
- `animate-chain-swing` — pendulum for chain links
- `animate-prize-glow` — text-shadow pulse for prize amounts
- `animate-holographic` — background-position shift
- `animate-electric-pulse` — multi-layer box-shadow pulse
- `animate-energy-rise` — translateY + fade for flame effects
- `animate-pulse-slow` — 4s opacity pulse for backgrounds

### 3.5 Utility Classes
- `.text-gradient` — orange gradient text
- `.card-gradient` — gradient background + shadow + hover lift
- `.btn-primary` — gradient orange button with glow
- `.btn-secondary` — bordered dark button
- `.btn-accent-cyan` — orange bg with cyan text/icons
- `.nav-link` — subtle hover-to-primary link
- `.scrollbar-hide` — cross-browser scrollbar hide
- `.theater-mode` — fixed fullscreen with overflow hidden
- `.controls-overlay` / `.controls-hidden` — auto-hiding UI controls

---

## 4. Authentication & Onboarding

### 4.1 Auth System
- **Provider:** Supabase Auth (email/password only currently; OAuth prepared for Google/Facebook/Twitter)
- **Auth Context:** `useAuth()` hook via `AuthProvider` wrapping entire app
- **Session:** `localStorage` persistence, auto-refresh tokens
- **Auth Guards:** `AuthGuard`, `BarberGuard`, `AdminGuard`, `SovereignGuard` — route-level protection components

### 4.2 Landing Page (Unauthenticated)
When not logged in, the Index page shows:
1. **Globe3D** — rotating 3D Earth (Three.js) as background
2. **WorldCupPrizeCounter** — animated total prize pool
3. **Sign In / Sign Up Card** — tabbed form with:
   - **Sign In tab:** email + password
   - **Sign Up tab:** role selector (Barber/Fan), display name, country, email, password
4. **Vault CTA** — "SPIN TO WIN FREE REWARDS" link to `/vault`
5. **Stats grid** — 500+ Barbers, 50+ Countries, $10K+ Prize Pool, 100K+ Votes

### 4.3 Arena Gate (Barber Signup)
When a user selects "Barber" during signup, the **ArenaGateModal** opens — a multi-step onboarding wizard:

| Step | Name | Description |
|---|---|---|
| 1 | `verify` | **ClipperSwipeVerifier** — user performs a horizontal swipe gesture (simulating clipper motion) to prove intent. Measures velocity/distance. Generates a verification token. |
| 2 | `credentials` | Email, password, display name fields |
| 3 | `barber-info` | Phone number input |
| 4 | `instagram` | Instagram follow verification (optional) |
| 5 | `claim-flag` | Country selector with flag display + cultural celebration data. Account is created here via `supabase.auth.signUp()` |
| 6 | `success` | **FreshAnimation** — country-themed celebration (confetti, emojis, hype phrase) |
| 7 | `choose-tier` | Subscription tier selection (Free/Bronze/Silver/Gold/Diamond) |
| 8 | `choose-categories` | Select up to 3 competition categories |

**Progress indicator** shows a step bar at the top.

### 4.4 Fan Signup
Fans use a simple form (no Arena Gate). After signup, they see a **WelcomeModal** on first visit.

### 4.5 Post-Auth Trigger
Database trigger `handle_new_user()` fires on `auth.users` insert:
- Creates `profiles` row
- Creates `user_roles` row (fan or barber)
- Creates `barber_profiles` row (if barber) or `client_profiles` row (if fan)

---

## 5. User Roles & Permissions

### 5.1 Role System
Roles stored in `user_roles` table (not on profiles — security requirement):
```sql
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user', 'barber', 'fan');
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
```

**Security definer function:**
```sql
CREATE FUNCTION has_role(_user_id UUID, _role app_role) RETURNS BOOLEAN
SECURITY DEFINER SET search_path = public
```

### 5.2 Role Descriptions

| Role | Access |
|---|---|
| **fan** | Vote on battles, follow barbers, purchase BB, donate, view leaderboards |
| **barber** | Everything fans can do + create battles, submit videos, manage portfolio, book appointments, access Creator Hub & Portal |
| **admin** | Everything + user management, battle management, BB awards, sponsor ads, analytics dashboard |
| **sovereign** | Super-admin with kill switches, economy controls, system controls, tournament management, audit logs |

### 5.3 Subscription Tiers (Barbers)
Stored in `barber_subscription_tiers` table:

| Tier | Monthly Price | Battle Limit/Month |
|---|---|---|
| Free | $0 | 2 |
| Bronze | varies | 4 |
| Silver | varies | 8 |
| Gold | varies | 16 |
| Diamond | varies | Unlimited |

**DEV_MODE flag** (`useSubscriptionLimits.tsx`): When `true`, all tier gates are bypassed. A yellow banner appears at top of screen.

---

## 6. Database Schema

### 6.1 Core Tables

#### `profiles`
Main user profile linked to `auth.users`:
- `user_id` (UUID PK), `display_name`, `username`, `avatar_url`, `bio`
- `user_type` ('fan'|'barber'|'admin'), `country_code`
- `barber_bucks` (INTEGER — BB balance)
- `is_verified`, `is_verified_by_competition`, `three_x_vote_expires_at`
- `referral_code`, `referred_by`, `favorite_creator_id`
- `is_creator`, `creator_level`, `sub_category`
- Social handles: `instagram_handle`, `facebook_handle`, `twitter_handle`, `tiktok_handle`, `youtube_handle`

#### `barber_profiles`
Extended barber data:
- `id` (UUID PK), `user_id` (FK → profiles), `name`, `nickname`
- `bio`, `specialty`, `location`, `country_code`, `years_experience`, `rating`
- `portfolio_url`, `phone_number`
- Social handles (duplicated for barber-specific display)
- Streaming: `is_live`, `live_video_id`, `featured_video_id`, `can_stream`, `youtube_channel_id`, `youtube_handle`
- `total_streams`, `total_stream_minutes`
- Subscription: `active_subscription_tier`, `subscription_expires_at`
- Battle limits: `battles_created_this_month`, `last_battle_reset`
- M4M: `m4m_certified` (BOOL), `m4m_paid` (BOOL), `m4m_lives_touched` (INT)
- Competition: `competition_categories` (TEXT[])

#### `client_profiles`
Fan-specific data:
- `user_id`, `username`, `avatar_url`, `bio`, `location`
- `total_votes_cast`, `voting_power`

#### `battles`
Central battle table:
- `id`, `title`, `description`, `category`, `status` (draft/upcoming/active/awaiting_submissions/voting/completed/cancelled)
- `organizer_id`, `barber1_id`, `barber2_id` (FK → barber_profiles)
- `prize_amount`, `currency` (usd/bb)
- `battle_type` (1v1/tournament), `streaming_type`
- Dates: `starts_at`, `ends_at`, `submission_deadline`, `voting_ends_at`
- Videos: `barber_1_video_url`, `barber_2_video_url`, `stream_url`, `youtube_stream_url`, `youtube_vod_url`
- Streaming state per barber: `barber1_is_streaming`, `barber1_live_viewers`, `barber1_peak_viewers`, etc.
- Twilio: `twilio_room_sid`
- Tournament: `tournament_id`, `phase_id`, `round_number`, `match_number`, `is_tournament_match`
- Results: `winner_id`, `forfeit_winner_id`, `forfeit_reason`, `vote_count1`, `vote_count2`
- `cover_image_url`, `rules`, `max_participants`, `live_viewers`

#### `battle_submissions`
Video submissions per barber per battle:
- `battle_id`, `user_id`, `media_url`, `youtube_vod_url`, `thumbnail_url`
- `title`, `description`, `status`, `is_live_stream`
- `stream_started_at`, `stream_ended_at`

#### `battle_votes`
One vote per user per battle:
- `battle_id`, `submission_id`, `voter_id`
- Unique constraint on (battle_id, voter_id)
- Validated by `validate_vote_time()` trigger

#### `battle_participants`
Tracks who joined a battle:
- `battle_id`, `user_id`, `status`, `seed`, `tournament_id`

#### `barber_bucks_transactions`
Full transaction ledger:
- `user_id`, `amount`, `balance_after`, `transaction_type`, `description`
- `stripe_payment_id`, `reference_id`

#### `barber_subscriptions`
Active subscription tracking:
- `user_id`, `tier_id` (FK → barber_subscription_tiers), `status`
- `stripe_subscription_id`, `stripe_customer_id`
- `current_period_start`, `current_period_end`, `cancel_at_period_end`

#### `notifications`
In-app notifications:
- `user_id`, `type`, `title`, `message`, `data` (JSONB), `read`, `created_at`

#### `creator_follows` / `creator_likes` / `creator_subscriptions`
Social engagement tables for the creator ecosystem.

#### `donations`
Financial donations from fans to creators:
- `fan_id`, `creator_id`, `amount_cents`, `status`, `message`

#### `open_challenges`
Barber-to-barber challenge queue:
- `challenger_id`, `stake_amount_bb`, `category`, `status` (open/matched/completed/expired)
- `matched_barber_id`, `battle_id`

#### `tournaments`
Tournament container:
- `name`, `description`, `status`, `category`, `max_participants`
- `entry_fee_bb`, `prize_pool_bb`
- `registration_start`, `registration_end`, `start_date`, `end_date`

#### `tournament_phases` / `bracket_matches` / `tournament_standings` / `match_results`
Full tournament bracket system with qualification → elimination phases.

#### `category_prize_pools`
Per-category annual prize pools:
- `category`, `tournament_year`, `total_pool_cents`, `participant_count`

#### `m4m_session_logs`
Minutes for Men session verification:
- `barber_user_id`, `client_user_id`, `verification_code`, `verified`, `verified_at`

#### `appointments` / `barber_availability` / `barber_blocked_slots` / `barber_services`
Full booking system with escrow, SOS multiplier, house calls.

#### `battle_chat_messages` / `battle_reactions` / `battle_donations`
Real-time battle engagement features.

#### `community_notes`
Temporary community content (auto-cleaned after 7 days).

#### `sponsor_boards` / `sponsor_ads`
Advertising/sponsorship system.

#### `marketing_leads`
Vault spin-to-win lead capture.

### 6.2 Materialized Views
- `barber_stats` — aggregated follower_count, like_count, total_donations for each barber
- `public_barber_profiles` — joined barber + profile data for public display
- `public_user_profiles` — public-safe profile data

### 6.3 Key Database Functions
- `handle_new_user()` — trigger on auth.users insert
- `verify_m4m_session()` — M4M QR code verification
- `get_battle_vote_results()` — weighted voting (3x for verified/subscribed barbers)
- `calculate_match_result()` — determines winner with points (3 win, 1 draw, 0 loss)
- `update_tournament_standings()` — recalculates rankings after each match
- `generate_elimination_bracket()` — creates bracket matches from qualified barbers
- `get_barber_bucks_balance()` — reads latest balance from transaction ledger
- `normalize_country_code()` — fixes common country code aliases (DR→DO, UK→GB)
- `check_battle_submissions_and_activate()` — trigger that moves battle to 'voting' when both submit
- `cleanup_old_community_notes()` — deletes notes older than 7 days

---

## 7. Page-by-Page Breakdown

### 7.1 Index `/` (Home)

**Unauthenticated:** LandingHero with Globe3D, prize counter, auth forms, vault CTA  
**Authenticated:**
1. **Header** — fixed top bar with barber pole logo (spinning, click for quick actions menu), centered "BARBER-HUB" brand, right side RotatingBBCoin avatar/dropdown with balance + add funds + profile links. Energy pulse animations (cyan blurs) in background.
2. **WelcomeModal** — first-visit onboarding
3. **DynamicBattleHero** — full-width head-to-head display:
   - Shows active/voting/upcoming battle with two barber video panels side by side
   - Country flag backgrounds with gradient overlays
   - Embedded YouTube videos (featured or live)
   - VS badge in center with rotating ring frame, lightning crack animation (mobile), particle effects
   - Real-time viewer counts per side
   - Vote buttons (for fans during voting phase)
   - ArenaActionBar with follow/like/donate/challenge actions
   - If no active battle: rotates through featured barbers every 8 seconds
   - If current user is a barber in the battle: shows stream controls instead
4. **ImmersiveFactionBanners** — horizontal scrolling category banners:
   - 5 tournament categories (Signature Style, Classic Cut, Creative Color, Viral Styles, Beard & Scissor)
   - Each banner shows: icon, name, prize pool, top barber avatar, participant count
   - "Assassin's Creed"-style swaying animation with chain effects
   - Barbers can "Join Category" (costs 50 BB entry fee)
   - ArenaTicker scrolling news bar below
5. **GlobalLeagueDashboard** — 3D sphere of barber avatars:
   - SphereImageGrid renders barber profile photos on a rotating sphere
   - Holographic wrapper effect
   - Barber search autocomplete
   - Live battle feed sidebar
   - Click any barber to navigate to their public profile
6. **LiveBarberStreams** — horizontal scroll of currently streaming barbers
7. **CommunitySection** — leaderboard (conditional on feature flag)
8. **GrantsSection** — barber grants info (conditional on feature flag)
9. **Footer** — brand, social links, navigation columns

### 7.2 Profile `/profile`

**Auth required.** Shows different views for barbers vs fans:

**Barber view:**
- **BarberProfileHeader** card:
  - Avatar with M4MHeartbeat badge below
  - Display name, subscription badge, country flag, LIVE indicator
  - Social media icons (Instagram, Twitter, YouTube, Facebook — max 3)
  - Stats row: Followers, Likes, Donated
  - BB balance display (RotatingBBCoin + amount + add/withdraw buttons)
  - Action buttons: View Public Profile, Settings, Sign Out, Delete Account
- **TransactionHistory** — BB transaction log

**Fan view:**
- **FanProfileHeader** — avatar, name, username, bio, country, sub-category
- Stats: votes cast, voting power
- Actions: Add Funds, Become Sponsor, Sign Out, Delete Account
- TransactionHistory

**Profile setup:** If `needsProfileSetup`, shows setup prompt → BarberProfileForm or ClientProfileForm

### 7.3 Creator Hub `/creator-hub`

**Auth + Barber required.**
- BarberProfileHeader (reused)
- SponsorDealBoard — available sponsor partnerships
- BarberAppointmentManager — calendar-based appointment management
- CreatorDashboard — content analytics, upload stats
- EarningSystem — BB earning breakdown
- ReferralProgram — referral code sharing + tracking

### 7.4 Portal `/portal`

**Auth + Barber required.** Barber's main command center.

### 7.5 Battles `/battles/create`, `/battles/:id`

- **CreateBattle** — form to create new 1v1 battles (barber only)
- **BattleDetails** — full battle view with submissions, voting, chat, results

### 7.6 Battle Theater `/battle/:id/theater`

Immersive fullscreen battle viewing experience for fans.

### 7.7 Contender Theater `/battle/:id/contender`

**Auth + Barber required.** Barber's view when they're in an active battle — stream controls, camera preview, readiness indicators.

### 7.8 Barber Public Profile `/barber/:userId`

Public-facing barber profile with portfolio, featured video, stats, follow/like/donate actions, M4MHeartbeat (non-own profile — clicking opens client verification).

### 7.9 Barbers Directory `/barbers`

Searchable grid of all registered barbers.

### 7.10 Tournaments `/tournaments`, `/tournaments/:tournamentId`

- Tournament listing with registration
- Individual tournament details: bracket view, standings table, match schedule

### 7.11 Watch Feed `/watch`

Content feed of battle videos and highlights.

### 7.12 Vault of Honor `/vault`

Gamified spin-to-win rewards:
- VaultSpinWheel — prize wheel with tiers (BB bonuses, subscription upgrades, passes)
- VaultViralGate — social sharing gate before spin
- VaultEntry — email capture for marketing leads
- VaultVictory — celebration on win

### 7.13 Grants `/grants`

Information page about barber education/community grants.

### 7.14 Analytics `/analytics`

**Auth + Barber required.** Performance metrics, earnings charts, battle stats.

### 7.15 Admin Pages

**Auth + Admin required:**
- `/admin` — AdminDashboard with stats cards
- `/admin/users` — UserManagement (role changes, verification, BB awards)
- `/admin/battles` — BattleManagement (approve/reject/moderate)
- `/admin/analytics` — AdminAnalytics
- `/admin/sponsors` — SponsorAdsManager

### 7.16 Sovereign HQ `/sovereign-hq`

**SovereignGuard required** (super-admin):
- LivePulseMonitor — real-time system health
- BattleControlPanel — force-end battles, override results
- EconomyControlPanel — adjust BB rates, fee structure
- UserControlPanel — ban/unban users
- TournamentManagerPanel — manage tournament lifecycle
- TournamentQueuePanel — upcoming match queue
- KillSwitchPanel — emergency system shutoffs
- SponsorControlPanel — manage sponsor campaigns
- VaultMetricsPanel — vault engagement analytics
- AuditLogViewer — admin action history
- BattleDirectoryPanel — all battles browser

### 7.17 M4M Verify `/m4m/verify/:barberUserId`

Public page accessed via QR code scan. Shows barber name, lives touched count, and "Confirm Session" button. Requires sign-in. On confirmation: creates m4m_session_log entry and increments barber's lives_touched.

### 7.18 Payment Pages

- `/payment-success` — Stripe success redirect
- `/payment-canceled` — Stripe cancel redirect

---

## 8. Core Systems

### 8.1 Barber Bucks (BB) Economy

**Virtual currency** used across the platform:
- **Earning:** Admin awards, referral bonuses, battle winnings, Stripe purchases
- **Spending:** Battle entry fees (50 BB/category), donations, sponsor board slots, appointment escrow, tournament registration
- **Purchase flow:** `useBarberBucks` hook → `purchase-barber-bucks` edge function → Stripe Checkout → `verify-bb-purchase` edge function → BB credited
- **Balance tracking:** `profiles.barber_bucks` field + `barber_bucks_transactions` ledger
- **Display:** RotatingBBCoin component (3D CSS coin with avatar on front, BB logo on back, Y-axis rotation animation)

### 8.2 Battle System

**Lifecycle:**
1. Barber creates battle → status `upcoming`
2. Both barbers join → status `active`
3. Both submit video (YouTube VOD URL) → auto-transitions to `voting` (trigger: `check_battle_submissions_and_activate`)
4. Voting period (configurable, default 7 days) → fans cast weighted votes
5. Voting closes → `close-voting` edge function calculates winner → status `completed`
6. Auto-close: `auto-close-voting` edge function runs on schedule

**Weighted Voting:**
- Standard fan: 1x vote weight
- Verified barber OR subscribed barber: 3x weight
- Fan with `is_verified_by_competition` + active `three_x_vote_expires_at`: 3x weight

**Video Submissions:**
- YouTube VOD URLs (no direct upload)
- Optional live streaming via Twilio Video SDK
- Battle submissions stored in `battle_submissions` table

### 8.3 Tournament System

**Structure:**
1. **Registration** — barbers register (BB entry fee)
2. **Qualification** (group stage) — round-robin matches, points system (3 win, 1 draw, 0 loss)
3. **Elimination** — seeded bracket (16/8/4/2), single elimination
4. **Finals** — championship match

**Key functions:** `update_tournament_standings()`, `generate_elimination_bracket()`, `complete_qualification_phase()`

### 8.4 Faction/Category System

5 competition categories:

| ID | Name | Icon | Color Theme |
|---|---|---|---|
| `speed_fade` | Technical Precision: The Signature Style | ⚡ | Cyan |
| `gentleman_cut` | Classic Artistry: The Classic Cut | 👔 | Amber/Gold |
| `creative_color` | Avant-Garde: Creative Color & Design | 🎨 | Pink/Purple/Cyan |
| `viral_trending` | Social Sensation: Viral & Trending | 📱 | Pink/Rose/Cyan |
| `beard_scissor` | Technical Beard & Scissor Craft | ✂️ | Silver/Slate |

Each category has its own prize pool tracked in `category_prize_pools`.

### 8.5 M4M (Minutes for Men) System

Mental health peer support program:

**Three visual states** (HandsHeartIcon — custom SVG of hands forming a heart):
1. **Ghost** (not certified) — grey, 15% opacity
2. **Static** (certified, not paid) — grey, 50% opacity
3. **Beating** (certified + paid) — Zion Blue (#002D62) pulse animation

**Barber flow:**
1. Click own M4MHeartbeat → opens M4MCertificationModal
2. Multi-step pledge ("What is M4M?", commitment checkbox)
3. On completion: `barber_profiles.m4m_certified = true`, generates QR code + printable PDF certificate
4. QR code encodes: `{appUrl}/m4m/verify/{barberUserId}`

**Client flow:**
1. Scan QR code → opens `/m4m/verify/:barberUserId`
2. Sign in if needed
3. Click "Confirm Session" → creates `m4m_session_logs` entry, increments `m4m_lives_touched`

**Verification function:** `verify_m4m_session()` — finds unverified log by code, marks verified, increments counter.

### 8.6 Booking System

- **Barber services** with BB pricing, duration, house call flag, SOS flag
- **Availability** by day of week with time slots
- **Blocked slots** for vacations/unavailability
- **Appointments** with escrow (BB held during appointment), SOS multiplier for urgent bookings
- **Edge functions:** `book-appointment`, `manage-appointment`

### 8.7 Streaming System

- YouTube Live detection via `check-youtube-live` edge function (uses YouTube Data API)
- Twilio Video rooms for real-time battles
- Stream status tracking per barber in battles
- `BarberHeroStreamControls` for in-battle streaming UI

### 8.8 Notification System

- Database-backed notifications table
- Real-time subscription via Supabase Realtime
- Triggers on: new follower, new like, new subscription, new donation, battle results
- `useNotifications()` hook for in-app notification display
- `useFollowedBarbersNotifications()` — toast when followed barber goes live

### 8.9 Challenge System

- Barbers can issue open challenges with BB stakes
- `open_challenges` table with stake amounts
- `create-challenge-stake` / `match-challenge-stake` / `complete-open-challenge` edge functions
- `cleanup-expired-challenges` for stale challenges

---

## 9. Edge Functions

All in `supabase/functions/`. Each is a Deno edge function.

| Function | Purpose |
|---|---|
| `admin-award-barber-bucks` | Admin awards BB to users |
| `admin-toggle-verification` | Toggle user verification status |
| `admin-update-user-role` | Change user role |
| `analyze-haircut` | AI haircut analysis (Gemini API) |
| `auto-close-voting` | Scheduled voting closure |
| `book-appointment` | Create appointment with escrow |
| `check-battle-submissions` | Verify submission status |
| `check-youtube-live` | YouTube Live API check |
| `cleanup-community-notes` | Delete old notes |
| `cleanup-expired-challenges` | Expire stale challenges |
| `close-voting` | Manual voting closure + winner calculation |
| `complete-match` | Finalize tournament match |
| `complete-open-challenge` | Resolve challenge after battle |
| `create-barber-subscription` | Stripe subscription creation |
| `create-battle-entry` | Register for battle |
| `create-challenge-stake` | Post open challenge with BB stake |
| `create-donation` | Process fan donation |
| `create-twilio-room` | Create Twilio video room |
| `delete-account` | Full account deletion |
| `distribute-pot` | Distribute battle prize pot |
| `donate-to-battle` | BB donation to battle pot |
| `end-twilio-stream` | Close Twilio room |
| `generate-battle-token` | Twilio token for barber |
| `get-viewer-token` | Twilio token for viewer |
| `manage-appointment` | Accept/deny/complete appointments |
| `manage-barber-subscription` | Cancel/modify subscription |
| `match-challenge-stake` | Accept open challenge |
| `process-bb-donation` | Process BB donation transaction |
| `purchase-barber-bucks` | Stripe checkout for BB |
| `purchase-product-bb` | Buy products with BB |
| `purchase-sponsor-slot` | Buy sponsor ad placement |
| `register-tournament-bb` | Tournament registration with BB |
| `schedule-tournament-match` | Create tournament battle |
| `set-featured-video` | Set barber's featured video |
| `sovereign-battle-control` | Force battle state changes |
| `sovereign-economy-control` | Adjust economic parameters |
| `sovereign-system-control` | System kill switches |
| `sovereign-user-control` | Ban/unban users |
| `start-live-stream` | Initialize live stream |
| `submit-battle-video` | Submit video to battle |
| `subscribe-with-bb` | Pay subscription with BB |
| `sync-battle-viewers` | Update viewer counts |
| `tournament-matchmaker` | Auto-create tournament matches |
| `twilio-webhook` | Twilio event callbacks |
| `update-stream-status` | Update streaming state |
| `verify-bb-purchase` | Verify Stripe BB purchase |
| `verify-tournament-payment` | Verify tournament payment |

**Required Secrets:**
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `YOUTUBE_API_KEY`
- `GOOGLE_GEMINI_API_KEY`
- `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

---

## 10. Component Library

### 10.1 UI Primitives (shadcn/ui)
Full shadcn component set: accordion, alert-dialog, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toggle, toggle-group, tooltip.

Custom additions: `BackButton`, `FloatingActionButton`, `display-cards`.

### 10.2 Key Custom Components

**Header:** Fixed top bar, barber pole logo spin (11s rotation), quick actions dropdown, centered brand, RotatingBBCoin avatar dropdown, energy pulse background effects.

**RotatingBBCoin:** 3D CSS coin with Y-axis rotation. Front face shows avatar/initial, back face shows BB logo. Gold border, shadow effects. Multiple sizes (xs/sm/md/lg/xl).

**DynamicBattleHero:** Full-width head-to-head. Country flag backgrounds, YouTube video embeds, VS badge with rotating ring + particle effects, real-time viewer counts, voting interface.

**ImmersiveBannerCard:** Faction banner with chain-hanging effect, 3D perspective sway, holographic shimmer, hover particles, prize pool counter, scratch-to-reveal interaction.

**M4MHeartbeat:** Handshake-heart SVG badge. Three states. Click behavior differs based on `isOwnProfile`.

**BarberProfileHeader:** Full profile card with avatar, M4M badge, name, subscription tier, country flag, live indicator, social links, stats, BB balance, action buttons.

**Globe3D:** React Three Fiber sphere with country markers, rotating animation.

**WorldCupPrizeCounter:** Animated counting number display for total prize pool.

**VotingCard / InteractiveVoteSlider:** Battle voting interfaces.

**BattleChat:** Real-time chat during battles (Supabase Realtime).

**FloatingReactions:** Emoji reactions floating up during battles.

---

## 11. Feature Flags & Configuration

### `src/config/features.ts`
```typescript
export const FEATURES = {
  HEADER_INSTAGRAM_FOLLOW: false,
  HEADER_MOBILE_QUICK_MENU: false,
  GRANTS_SECTION: false,
  COMMUNITY_LEADERBOARD: true,
  CREATOR_HUB_ENABLED: true,
  BARBER_BUCKS_SYSTEM: true,
  REFERRAL_PROGRAM: true,
};
```

### `src/config/tournament.ts`
Tournament configuration (entry fees, prize distribution, timing).

### `src/config/categories.ts`
5 tournament categories with color themes, icons, descriptions.

### DEV_MODE
`useSubscriptionLimits.tsx` exports `DEV_MODE = true` — bypasses all tier gates.

---

## 12. Third-Party Integrations

### Stripe
- Checkout Sessions for BB purchases and subscriptions
- Webhook handling for payment confirmation
- Customer creation/lookup

### YouTube Data API
- Live stream detection for barbers
- Video metadata fetching
- VOD URL validation

### Twilio Video
- Real-time video rooms for live battles
- Token generation for barbers and viewers
- Room lifecycle management

### Google Gemini AI
- Haircut analysis/advisor feature (`analyze-haircut` edge function)
- `HaircutAdvisorModal` component

### Mapbox GL
- Barber finder with map-based search (prepared but not primary flow)

---

## 13. Security & RLS

### Row Level Security
All tables have RLS enabled with policies following these patterns:
- **Own data:** Users can read/write their own profiles, votes, transactions
- **Public data:** Barber profiles, battles, submissions readable by all authenticated users
- **Admin actions:** Protected by `has_role(auth.uid(), 'admin')` checks
- **Sovereign actions:** Edge functions validate sovereign role server-side

### Vote Integrity
- `validate_vote_time()` trigger ensures voting only during active voting period
- `validate_vote_submission()` ensures submission belongs to the battle
- Unique constraint prevents double voting
- `validate_participant_limit()` prevents exceeding max participants

### Sensitive Operations
All financial operations (BB purchases, donations, stakes, escrow) go through edge functions with `SUPABASE_SERVICE_ROLE_KEY` — never client-side.

---

## 14. Deployment & Environment

### Environment Variables (`.env`)
```
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon key]
VITE_SUPABASE_PROJECT_ID=[project id]
```

### Storage Buckets
| Bucket | Public | Purpose |
|---|---|---|
| `avatars` | Yes | User profile photos |
| `creations` | Yes | Barber portfolio uploads |
| `portfolios` | Yes | Portfolio images |
| `videos` | Yes | Battle video uploads |
| `sponsor-logos` | Yes | Sponsor brand logos |

### Build & Deploy
- `npm run dev` — local development
- `npm run build` — production build (Vite)
- Deployed via Lovable's publish system
- Edge functions auto-deploy on push
- Database migrations in `supabase/migrations/`

### Post-Deployment Checklist
- [ ] Set Supabase Site URL and redirect URLs
- [ ] Configure Stripe webhook endpoint
- [ ] Add all secrets to Supabase Edge Functions
- [ ] Verify RLS policies are active
- [ ] Set `DEV_MODE = false` before production
- [ ] Test auth flow (signup, login, OAuth if enabled)
- [ ] Test BB purchase flow end-to-end
- [ ] Verify real-time subscriptions work
- [ ] Test battle creation → submission → voting → close flow

---

## Appendix: File Structure Overview

```
src/
├── App.tsx                    # Router + providers
├── main.tsx                   # Entry point
├── index.css                  # Design system + animations
├── assets/                    # Static assets (barber-pole, bb-coin-logo, globe-bg)
├── components/
│   ├── ui/                    # shadcn primitives (40+ components)
│   ├── auth/                  # ArenaGate, AuthDialog, Guards, RoleSelector, etc.
│   ├── barber/                # BarberProfileHeader, BarberDashboard, etc.
│   ├── battles/               # BattleCard, VotingView, ChallengeModal, Chat, etc.
│   ├── booking/               # AppointmentManager, DateSlotPicker, EscrowDialog
│   ├── camera/                # CameraPermissionPrompt
│   ├── contender/             # ContenderControlBar, VideoPreview, ReadinessBadge
│   ├── creator/               # CreatorDashboard, EarningSystem, ReferralProgram
│   ├── economy/               # BBWalletCard, BBWalletWidget, RotatingBBCoin
│   ├── factions/              # ImmersiveFactionBanners, BannerCard, ArenaTicker
│   ├── fan/                   # FanProfileHeader, SponsorBoardPurchaseModal
│   ├── m4m/                   # M4MHeartbeat, CertificationModal, QRCode, Verification
│   ├── onboarding/            # WelcomeModal, HowItWorks
│   ├── portal/                # CountryLeaderboard, FactionBannerCard
│   ├── profiles/              # AvatarUpload, BarberProfileForm, PortfolioManager
│   ├── sovereign/             # All Sovereign HQ panels
│   ├── streaming/             # StreamControls, TwilioVideoPlayer, BattleVideoContainer
│   ├── tournament/            # TournamentBracket, StandingsTable, RegistrationModal
│   ├── vault/                 # VaultSpinWheel, VaultEntry, VaultVictory, VaultViralGate
│   ├── admin/                 # AdminStatsCard, BarberBucksAwardModal, SponsorAdsManager
│   ├── analytics/             # BattleStatsCard, EarningsChart, TransactionHistory
│   ├── Header.tsx, Footer.tsx, LandingHero.tsx, Globe3D.tsx, etc.
├── hooks/                     # 30+ custom hooks
├── pages/                     # 20+ page components
├── config/                    # features.ts, categories.ts, tournament.ts
├── utils/                     # audioManager, celebrationEffects, deviceFingerprint, hapticFeedback
├── integrations/supabase/     # client.ts, types.ts (auto-generated)
supabase/
├── config.toml
├── functions/                 # 40+ edge functions
├── migrations/                # SQL migration files
```

---

*This document is the complete specification for replicating BARBER-HUB. Every page, component, database table, edge function, design token, and behavioral detail is documented above.*
