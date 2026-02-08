

## Full Audit and Fix: BB Store Freezing and Purchase Flow

### Root Cause Found

The BB Store (AddFundsModal) freezes because it is rendered **inside** `BarberSubscriptionTiers`, which itself lives **inside** a Radix UI Dialog. When the "pausedForFunds" pattern closes the parent Dialog to release its pointer-event lock, Radix unmounts the Dialog's content -- including `BarberSubscriptionTiers` and its child `AddFundsModal`. The modal briefly appears on screen via portal, then immediately unmounts or becomes part of a dead React tree, making it completely unclickable.

Compare with `DonationModal`, which works correctly: it renders `AddFundsModal` as a **sibling outside** the Dialog, so when the Dialog pauses, the AddFundsModal survives.

### Stripe Edge Function Status

The `purchase-barber-bucks` edge function is healthy and working. Logs show successful Stripe checkout session creation. The CORS headers were already fixed. The `STRIPE_SECRET_KEY` secret is configured. The problem is purely on the frontend -- clicks never reach the edge function because the modal is frozen.

### The Fix (3 parts)

#### Part 1: Harden AddFundsModal itself

Add `pointer-events: auto` as an inline style on the AddFundsModal's portal container div. This overrides any `pointer-events: none` that Radix Dialog sets on `document.body`, providing a safety net even if the pausedForFunds pattern has timing issues.

**File: `src/components/AddFundsModal.tsx`**
- Add `style={{ pointerEvents: 'auto' }}` to the outermost `<div>` inside the portal (the fixed overlay)

#### Part 2: Move AddFundsModal out of BarberSubscriptionTiers

The core fix. `BarberSubscriptionTiers` should NOT render `AddFundsModal` itself, because it lives inside a Dialog that can unmount it. Instead, it signals to its parent that it needs funds.

**File: `src/components/barber/BarberSubscriptionTiers.tsx`**
- Remove the `<AddFundsModal>` render at line 286
- Remove the `AddFundsModal` import
- Rename the `onFundsModalStateChange` prop to `onShowAddFunds` (clearer intent) -- a callback the parent uses to show its own AddFundsModal
- When insufficient funds are detected (in `handleSubscribeClick` or `handleConfirmSubscribe`), call `onShowAddFunds?.()` instead of `setShowAddFunds(true)`
- Remove the local `showAddFunds` state and `handleShowAddFunds` helper entirely

#### Part 3: Update all 3 parent components

Each parent component that wraps `BarberSubscriptionTiers` in a Dialog needs to:
1. Add its own `showAddFunds` state
2. Render its own `AddFundsModal` **outside** the Dialog (as a sibling)
3. When AddFundsModal opens, pause the Dialog (same pattern as DonationModal)
4. When AddFundsModal closes, resume the Dialog

**File: `src/components/SubscriptionBadge.tsx`**
- Add `showAddFunds` state
- Import and render `AddFundsModal` outside the Dialog
- Set Dialog `open={showUpgradeModal && !pausedForFunds}`
- Pass `onShowAddFunds` callback to `BarberSubscriptionTiers` that sets `showAddFunds = true` and `pausedForFunds = true`
- On AddFundsModal close, set both back to false

**File: `src/components/barber/SubscriptionStatusCard.tsx`**
- Same pattern as above

**File: `src/components/barber/UpgradePrompt.tsx`**
- Same pattern as above

### Why This Works

This mirrors the proven `DonationModal` pattern:
```text
DonationModal (working):
  <>
    <Dialog open={isOpen && !pausedForFunds}>  // pauses when funds modal opens
      ...dialog content...
    </Dialog>
    <AddFundsModal />  // lives OUTSIDE the Dialog, survives unmount
  </>

SubscriptionBadge (after fix):
  <>
    <Dialog open={showUpgradeModal && !pausedForFunds}>
      <BarberSubscriptionTiers onShowAddFunds={...} />
    </Dialog>
    <AddFundsModal />  // lives OUTSIDE the Dialog, survives unmount
  </>
```

### Files Modified (4 total)

| File | Change |
|------|--------|
| `src/components/AddFundsModal.tsx` | Add `pointer-events: auto` safety net |
| `src/components/barber/BarberSubscriptionTiers.tsx` | Remove AddFundsModal, change prop to `onShowAddFunds` callback |
| `src/components/SubscriptionBadge.tsx` | Add own AddFundsModal outside Dialog, wire pausedForFunds |
| `src/components/barber/SubscriptionStatusCard.tsx` | Same pattern |
| `src/components/barber/UpgradePrompt.tsx` | Same pattern |

### Edge Function: No changes needed

The `purchase-barber-bucks` edge function is confirmed working (CORS fixed, Stripe session creation successful, secrets configured). Once the frontend modal is interactive, the full purchase flow will work: click package -> edge function creates Stripe checkout -> user redirected to Stripe -> payment processed -> BB credited via webhook.

