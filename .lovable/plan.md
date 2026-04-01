

# Fix "Pay with Services" Visibility + Enhance Appointment System

## Problems Identified

1. **"Pay with Services" not showing**: The `ImmersiveFactionBanners` (Portal page) shows `AddFundsModal` directly when a barber has insufficient BB for tournament entry. It never offers the barter option. Same issue in `TournamentRegistration`, `Header`, and other places that use `AddFundsModal` standalone.

2. **Barter only works for subscriptions**: The `UniversalBarterGateway` is only wired into `UpgradePrompt` for subscription tiers. It was supposed to also be injected into `CreateBattleDrawer` and tournament entry flows but the tournament entry flow on the Portal page bypasses `UpgradePrompt` entirely.

3. **Appointment system lacks client-side cancel button**: Fan's `MyAppointments` shows appointments but has no cancel action for pending/confirmed ones. The barber side has accept/deny/complete/no-show but no reschedule.

## Plan

### Step 1: Add "Pay with Services" to AddFundsModal for Barbers

**File: `src/components/AddFundsModal.tsx`**

- Import `UniversalBarterGateway` and `useUserRole`
- When user `isBarber`, add a "Pay with Services" tab/button at the top of the modal that opens the barter gateway
- Accept an optional `barterContext` prop (`{ perkCategory, perkDetails, requiredBBValue }`) so callers can pass the specific perk being purchased
- When no `barterContext` is provided (generic "add funds"), show a general "Donate slots for BB credit" option (or hide barter)

### Step 2: Wire Barter into Tournament Entry (ImmersiveFactionBanners)

**File: `src/components/factions/ImmersiveFactionBanners.tsx`**

- When BB is insufficient for tournament entry (line 122-126), instead of only showing `AddFundsModal`, also offer the barter option
- Add state for `showBarter` and render `<UniversalBarterGateway perkCategory="battle_entry" perkDetails={{ category }} requiredBBValue={TOURNAMENT_CONFIG.ENTRY_FEE_BB} />`
- Show both options: "Add BB" and "Pay with Services" as two buttons in a small chooser dialog

### Step 3: Wire Barter into TournamentRegistration

**File: `src/components/tournament/TournamentRegistration.tsx`**

- Same pattern as Step 2 — add barter gateway as alternative payment for tournament entry

### Step 4: Add Client Cancel Button to MyAppointments

**File: `src/components/fan/MyAppointments.tsx`**

- For appointments with status `pending` or `confirmed`, show a "Cancel" button
- On click, call `manageMutation` with `action: 'cancel'`
- Show confirmation dialog before canceling (warn about 50% fee if < 2 hours before scheduled time)
- Refetch appointments on success

### Step 5: Add Reschedule Placeholder + Webhook Note

- Add a disabled "Reschedule" button with tooltip "Coming soon" on confirmed appointments
- Note: Webhook integration for appointment notifications (SMS/email on request, confirmation, cancellation) should be added via n8n or a Supabase webhook — will prompt user to configure this separately

## Technical Details

The key fix is that `ImmersiveFactionBanners` line 122-126 currently does:
```tsx
toast.error('You need 250 BB to join. Please add funds.');
setShowAddFunds(true);
```

It needs to instead show a chooser: "Buy BB" or "Pay with Services" (for barbers only), where the latter opens `UniversalBarterGateway` with `perkCategory="battle_entry"`.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/factions/ImmersiveFactionBanners.tsx` | Add barter gateway for tournament entry |
| `src/components/tournament/TournamentRegistration.tsx` | Add barter gateway for tournament entry |
| `src/components/fan/MyAppointments.tsx` | Add cancel button with confirmation for pending/confirmed appointments |
| `src/components/booking/BarberAppointmentManager.tsx` | Minor: add reschedule placeholder |

