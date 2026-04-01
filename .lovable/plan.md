

# Universal "Pay with Services" Barter Gateway

## Overview

Build a platform-wide alternative payment method allowing barbers to trade their time slots (services) for premium perks instead of spending Barber Bucks. This includes a new database ledger, a server-side RPC for atomic checkout, a reusable React component, and injection into existing paywalls.

## Exchange Rate

One premium "Full Cut & Beard" slot = 150 BB equivalent. The RPC calculates required slots dynamically based on the perk's BB cost and the barber's service prices. Prime-time slots (weekday evenings, weekends) count at full value; off-peak slots count at 75%.

## Step 1: Database Migration

**New table: `donated_services_inventory`**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Row ID |
| `barber_id` | UUID FK → profiles.user_id | Donating barber |
| `service_id` | UUID FK → barber_services.id | Which service is donated |
| `service_type` | TEXT (enum check: haircut, kids_cut, beard_trim, shape_up, full_cut_beard) | Service category |
| `slot_datetime` | TIMESTAMPTZ | When the donated slot is scheduled |
| `time_tier` | TEXT (enum check: prime_time, off_peak) | Affects value calculation |
| `bb_value` | INTEGER | Calculated BB equivalent of this slot |
| `granted_perk_category` | TEXT (enum check: subscription, battle_entry, visibility_boost) | What was unlocked |
| `granted_perk_details` | JSONB | Specific details (tier_id, battle_id, boost_duration, etc.) |
| `status` | TEXT DEFAULT 'locked' | locked / redeemed / expired |
| `barter_group_id` | UUID | Groups slots from the same checkout |
| `created_at` | TIMESTAMPTZ | Timestamp |

RLS: Barbers can SELECT their own rows. INSERT/UPDATE via service role only (RPC).

## Step 2: Server-Side RPC — `process_universal_barter_checkout`

**New Supabase database function** (not edge function — simpler, atomic, no external calls needed):

```sql
process_universal_barter_checkout(
  p_barber_id UUID,
  p_perk_category TEXT,
  p_perk_details JSONB,
  p_required_bb_value INTEGER,
  p_donated_slots JSONB[] -- array of {service_id, slot_datetime, time_tier, service_type}
)
```

Logic:
1. Validate barber owns the referenced services via `barber_services`
2. Calculate total BB value of donated slots (sum each slot's `price_bb` adjusted by time tier: prime = 100%, off-peak = 75%)
3. If total BB value < `p_required_bb_value`, raise exception
4. Generate a `barter_group_id`
5. Insert all slots into `donated_services_inventory` with status='locked'
6. Execute the perk unlock based on `p_perk_category`:
   - **subscription**: Insert/update `barber_subscriptions` (same logic as `subscribe-with-bb`)
   - **battle_entry**: Deduct from queue fee tracking, mark battle entry paid
   - **visibility_boost**: Insert a boost record or update algorithm score
7. Log a `barber_bucks_transactions` entry with type='barter_payment' and amount=0 (for audit trail)
8. Return success with the group ID

## Step 3: Reusable React Component — `UniversalBarterGateway`

**New file: `src/components/barter/UniversalBarterGateway.tsx`**

Props interface:
```typescript
interface UniversalBarterGatewayProps {
  perkCategory: 'subscription' | 'battle_entry' | 'visibility_boost';
  perkDetails: Record<string, any>; // tier_id, battle_id, etc.
  requiredBBValue: number; // BB equivalent cost
  onSuccess: () => void;
  onCancel: () => void;
  isOpen: boolean;
}
```

UI Flow (inside a Drawer):
1. **Header**: Shows what's being unlocked and the BB-equivalent cost
2. **Service Picker**: Fetches barber's active services from `barber_services`, displays as selectable cards with BB value
3. **Date/Slot Picker**: Reuses the existing `DateSlotPicker` component + `useBarberAvailability` hook to pick available slots
4. **Donation Cart**: Lists selected slots with their BB values and time tier tags (prime/off-peak)
5. **Progress Bar**: Visual fill showing donated value vs required value
6. **Submit Button**: Calls the RPC, disabled until threshold met
7. **Locked Confirmation**: On success, shows a "Slots Locked" confirmation with month/expiry info

Auto-detects prime vs off-peak: weekday 9AM-5PM = off-peak, evenings (5PM+) and weekends = prime_time.

## Step 4: Platform-Wide Injection

Modify `UpgradePrompt.tsx` — this is the central paywall drawer used across the app. Add a tab or toggle: "Pay with BB" | "Pay with Services".

**Files to modify:**

| File | Change |
|------|--------|
| `src/components/barber/UpgradePrompt.tsx` | Add "Pay with Services" tab that renders `<UniversalBarterGateway>` |
| `src/components/barber/BarberSubscriptionTiers.tsx` | Add "Or pay with services" link below each tier's Upgrade button |
| `src/components/creator/CreateBattleDrawer.tsx` | Add barter option alongside BB payment for battle entry fee |

The component is injected via the existing `UpgradePrompt` drawer, which is already used by `CreateBattle`, `CreateBattleDrawer`, and `EducatorUpload`. No need to touch every screen individually — the centralized drawer handles it.

## Step 5: Immutability Enforcement

- Once `process_universal_barter_checkout` executes, slots get `status='locked'`
- The barber's availability system (`useBarberAvailability`) must cross-reference `donated_services_inventory` to exclude locked slots from booking
- No client-side mutation paths exist for the donated inventory table
- Add a constraint: slots cannot be donated if they're within 24 hours

## Files to Create/Modify

| File | Action |
|------|--------|
| New migration SQL | Create `donated_services_inventory` table + `process_universal_barter_checkout` RPC |
| `src/components/barter/UniversalBarterGateway.tsx` | New reusable barter component |
| `src/components/barber/UpgradePrompt.tsx` | Add "Pay with Services" tab |
| `src/components/barber/BarberSubscriptionTiers.tsx` | Add barter link per tier |
| `src/components/creator/CreateBattleDrawer.tsx` | Add barter option for battle entry |
| `src/hooks/useBarberAvailability.tsx` | Exclude locked donated slots from available slots |

## Technical Details

```text
Barter Value Calculation:
  slot_bb_value = service.price_bb * time_tier_multiplier
  time_tier_multiplier:
    prime_time (evenings 5PM+, weekends) = 1.0
    off_peak (weekday 9AM-5PM) = 0.75

  Example: Full Cut & Beard (150 BB) donated at prime_time = 150 BB credit
  Example: Full Cut & Beard (150 BB) donated at off_peak = 112 BB credit
  
  Pro Subscription (125 BB) = 1 prime Full Cut & Beard slot
  Gold Subscription (250 BB) = 2 prime Full Cut & Beard slots

Slot Locking:
  donated slots → status='locked' → excluded from booking availability
  Duration: locked for the calendar month of the perk period
  No edit/cancel path — immutable once committed
```

