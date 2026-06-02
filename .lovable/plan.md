# Chair Swap + Unified Calendar + Dual-Image Intake — Plan

Three coordinated additions to Creator Hub. All modular, all behind feature flags, all inheriting existing tokens (Deep Black, Neon Orange, Zion Blue/Cyan), Mapbox `dark-v11` setup, and BB escrow RPC patterns. No changes to auth, bottom nav, or unrelated tables.

---

## A. Chair Swap Module (`/chair-swap`)

Executes the previously approved plan verbatim.

### Database (one migration)

```sql
CREATE TABLE public.chair_listings (
  id uuid PK, owner_user_id uuid NOT NULL,
  shop_name text, chair_name text NOT NULL,
  address text, latitude numeric, longitude numeric,
  daily_rate_bb int NOT NULL CHECK (daily_rate_bb > 0),
  weekly_rate_bb int,
  amenities text[] DEFAULT '{}',     -- wifi, storage, backwash, parking, tools, reception, ac, music
  photo_urls text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at, updated_at
);

CREATE TABLE public.chair_availability (
  id uuid PK, listing_id uuid REFERENCES chair_listings ON DELETE CASCADE,
  available_from date NOT NULL, available_to date NOT NULL,
  CHECK (available_to >= available_from)
);

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE public.chair_bookings (
  id uuid PK, listing_id uuid REFERENCES chair_listings,
  renter_user_id uuid NOT NULL,
  start_date date NOT NULL, end_date date NOT NULL,
  total_bb int NOT NULL, platform_fee_bb int NOT NULL,
  status text DEFAULT 'confirmed',
  created_at,
  EXCLUDE USING gist (
    listing_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  ) WHERE (status = 'confirmed')
);
```

- GRANTs: `authenticated` full DML on own rows, `anon` SELECT on active listings only, `service_role` ALL.
- RLS: owners manage own listings/availability; renters insert own bookings; public reads active listings.
- RPC `book_chair(listing_id, start, end)`: FOR UPDATE lock on renter profile, compute total, debit BB, insert booking (GiST auto-rejects overlap), log to `barber_bucks_transactions` as `chair_swap_payment`, credit owner net of 5% platform fee. Mirrors `process_battle_donation`.
- RPC `find_chairs_nearby(lat, lng, radius, start, end, amenities[])`: Haversine + availability + conflict filter.

### Frontend

```
src/features/chair-swap/
├── ChairSwapPage.tsx           # tabs: Discover | My Chairs | My Bookings
├── components/
│   ├── ChairMap.tsx            # reuses BarberMapDirectory Mapbox config + pulsing orange pins
│   ├── ChairFilterSidebar.tsx  # date range + amenities checkboxes
│   ├── ChairQuickCard.tsx      # popup; all dynamic text via esc()
│   ├── PostChairForm.tsx       # react-hook-form + zod, R2 uploads via useR2Upload
│   ├── BookingSummarySheet.tsx # BB escrow confirm (EscrowConfirmDialog pattern)
│   └── MyChairsList.tsx / MyBookingsList.tsx
├── hooks/ { useChairListings, usePostChair, useBookChair }
└── types.ts
```

- Feature flag `CHAIR_SWAP_ENABLED` in `src/config/features.ts`.
- Creator Hub tile + `<Route path="/chair-swap" />` — single insertion points, both gated by flag and `useUserRole().isBarber`.

---

## B. Unified Calendar (`/hub/calendar`)

Single authoritative temporal view aggregating every booking type.

### Routing & Access
- New route `/hub/calendar` mounted in `src/App.tsx`; tile in Creator Hub Quick Actions.
- Barber sees: their appointments, chair-swap rentals (in & out), bounty claims, house calls, SOS calls.
- Fan sees: their appointments + booked house calls (chair swap not exposed to fans).

### Data Aggregation
- New SECURITY DEFINER RPC `get_unified_calendar_events(user_id uuid, from_ts, to_ts)` returns a union of:
  - `appointments` (existing) → type `appointment`
  - `appointments` where `appointment_type = 'house_call'` → type `house_call`
  - `appointments` where `appointment_type = 'sos'` → type `sos`
  - `chair_bookings` (owner side + renter side) → type `chair_swap`
  - `house_call_bounties` claimed/assigned → type `bounty`
- Returns: `{ id, type, title, counterparty_name, starts_at, ends_at, status, color_hint, deep_link }`.

### Overlap Rules
- Inside the RPC and in the UI conflict pass: appointment ↔ appointment overlap forbidden; chair_swap (owner-side, full-day) may overlap appointments; SOS may not overlap appointment; house_call inherits appointment rules. UI tags conflicts with a small red dot; DB-level prevention stays only on the booking RPCs that already own that responsibility (no new global exclusion constraints).

### UI

```
src/features/hub-calendar/
├── HubCalendarPage.tsx
├── components/
│   ├── EventFilterPills.tsx    # horizontal scroll: All / Appointments / Chair Swap / Bounties / House Calls / SOS
│   ├── ViewToggle.tsx          # Day | Week | Month
│   ├── DayView.tsx             # CSS-grid 24×N timeline, virtualized via react-window
│   ├── WeekView.tsx            # 7-col CSS grid, same virtualization
│   ├── MonthView.tsx           # 7×6 CSS grid, event chips per cell, "+N more" overflow
│   ├── EventChip.tsx           # color per type, click → deep_link
│   └── EventDetailsSheet.tsx
└── hooks/ useCalendarEvents.ts # React Query, keyed by [from,to,filters]
```

- Native CSS Grid only — no FullCalendar/react-big-calendar.
- `react-window` (already in deps for feeds; verify before install) for time-slot lists in Day/Week.
- Pills: inactive = `bg-muted/30 text-muted-foreground`; active = `border-primary text-[hsl(var(--accent))] shadow-[0_0_10px_hsl(var(--accent)/0.4)]`.
- Filter state in URL search params for shareable views; instant client-side filter, no refetch.
- Color tokens per type (all from existing palette): appointment = orange, chair_swap = cyan, bounty = gold, house_call = blue, sos = red.

---

## C. Dual-Image Intake Preview

Upgrades the existing `StyleCaptureButton` / intake flow inside Booking Console.

### Capture
- Two slots in the intake sheet:
  1. **Current State** — live camera capture (reuse `useCameraPermission` + existing camera hook), front camera, single frame, uploaded to R2 via `useR2Upload`.
  2. **Reference** — file picker (image/*), R2 upload.
- Both required to proceed; show inline progress.

### IntakePreviewCard.tsx
- Condensed thumbnail, 16:9 aspect, 50/50 split:
  - Left half: Reference photo, label chip `REFERENCE`.
  - Right half: Current state, label chip `CURRENT`.
  - Hairline cyan divider in the middle.
  - Two-line summary beneath: line 1 = service name + duration; line 2 = client note (auto-truncated to ~60 chars).
- Used in three places:
  1. Booking confirmation sheet (preview before pay).
  2. Barber's incoming appointment card (2-second scan target).
  3. Unified Calendar `EventDetailsSheet` when event has intake data.
- Data persisted on `appointments` via two new nullable columns: `intake_current_url text`, `intake_reference_url text`, `intake_note text` (added in the same migration).

---

## Cross-Cutting

- All three pieces ship behind feature flags: `CHAIR_SWAP_ENABLED`, `HUB_CALENDAR_ENABLED`, `INTAKE_DUAL_IMAGE_ENABLED`. Tiles + routes guard on flag + role.
- All Mapbox popups (Chair Swap) call `esc()` for any dynamic string before `setHTML`.
- BB mutations stay server-side via RPC with FOR UPDATE locks. No client-side balance changes.
- No new third-party calendar libs. `react-window` only if not already present.
- No changes to bottom nav, auth, headers, or existing tables beyond the three additive columns on `appointments`.

## Deliverables

1. One DB migration: chair_swap tables + RPCs (`book_chair`, `find_chairs_nearby`), calendar RPC (`get_unified_calendar_events`), appointments columns (`intake_*`), all GRANTs + RLS.
2. `src/features/chair-swap/` module + flag + route + Hub tile.
3. `src/features/hub-calendar/` module + flag + route + Hub tile.
4. Dual-image upgrade to intake + new `IntakePreviewCard.tsx`, integrated in booking console, barber appointment card, and calendar details sheet.

## Out of Scope

- iCal/Google Calendar sync.
- In-app messaging between owner/renter.
- Reviews for chair stays.
- Recurring availability rules.
