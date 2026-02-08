
## Fix: BB Store Frozen When Opened From Subscription Dialog

### The Problem
The BB Store appears on screen but is completely unclickable. This happens because:

1. "Choose Your Tier" always opens inside a Radix UI Dialog
2. Radix Dialog applies `pointer-events: none` to everything outside its content area (this is a focus-trap feature)
3. The BB Store is rendered via `createPortal` to `document.body`, which is OUTSIDE the Dialog's content
4. Result: the BB Store is visible but all clicks are blocked by the Dialog's pointer-event lock

### The Fix
Use the same "pausedForFunds" pattern already proven in the DonationModal: when the BB Store needs to open, temporarily dismiss the parent Dialog to release its pointer-event lock. When the BB Store closes, restore the parent Dialog.

### How It Will Work
1. User clicks "Subscribe for 125 BB" (doesn't have enough)
2. The subscription Dialog temporarily closes (releasing pointer-events)
3. The BB Store opens and is fully interactive
4. User completes purchase or cancels
5. The subscription Dialog re-opens automatically

### Technical Details

#### 1. Modify `BarberSubscriptionTiers.tsx`
- Add a new optional prop: `onFundsModalStateChange?: (isOpen: boolean) => void`
- When `showAddFunds` changes, call this callback so the parent knows to pause/resume
- Use `useEffect` to sync the callback with the `showAddFunds` state
- When the AddFundsModal closes, call `onFundsModalStateChange(false)` so the parent Dialog can reappear

#### 2. Modify `SubscriptionBadge.tsx`
- Add `pausedForFunds` state
- Pass `onFundsModalStateChange` to `BarberSubscriptionTiers`
- Set Dialog's `open` to `showUpgradeModal && !pausedForFunds` (temporarily hides Dialog when BB Store is active)
- Render its own `AddFundsModal` at the component level (not inside the Dialog)

#### 3. Modify `SubscriptionStatusCard.tsx`
- Same pattern: add `pausedForFunds` state
- Set Dialog's `open` to `showUpgradeModal && !pausedForFunds`
- Pass callback to `BarberSubscriptionTiers`

#### 4. Modify `UpgradePrompt.tsx`
- Same pattern: add `pausedForFunds` state
- Set Dialog's `open` to `isOpen && !pausedForFunds`
- Pass callback to `BarberSubscriptionTiers`

#### Files Modified
- `src/components/barber/BarberSubscriptionTiers.tsx` -- Add `onFundsModalStateChange` prop, sync with `showAddFunds`
- `src/components/SubscriptionBadge.tsx` -- Add pausedForFunds pattern
- `src/components/barber/SubscriptionStatusCard.tsx` -- Add pausedForFunds pattern
- `src/components/barber/UpgradePrompt.tsx` -- Add pausedForFunds pattern
