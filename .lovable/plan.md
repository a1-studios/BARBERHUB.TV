

# Fix AddFundsModal Click Blocking Inside DonationModal

## Problem

The Radix UI `Dialog` component (used by `DonationModal`) implements a **focus trap and pointer-event lock**. Even though the `AddFundsModal` renders via `createPortal` at `z-[60]` (visually above the Dialog at `z-50`), Radix blocks all pointer events outside its own content area. This means the BB Store package buttons are visible but completely unclickable.

## Solution

When the AddFundsModal opens, **temporarily close the DonationModal's Dialog** so Radix releases its pointer-event lock. When the AddFundsModal closes, reopen the DonationModal so the user can continue their donation flow.

## Changes

### File: `src/components/DonationModal.tsx`

1. **Track "paused" state** -- Add a state variable to track when the DonationModal should temporarily hide because the AddFundsModal is open:
   ```typescript
   const [pausedForFunds, setPausedForFunds] = useState(false);
   ```

2. **Sync with showAddFundsModal** -- When `showAddFundsModal` becomes true, set `pausedForFunds = true`. When the AddFundsModal closes, set it back to false.

3. **Conditionally control Dialog open state** -- Change the Dialog's `open` prop from `isOpen` to `isOpen && !pausedForFunds`. This closes the Radix Dialog (releasing its focus/pointer lock) while the AddFundsModal is active.

4. **Handle AddFundsModal close** -- When the AddFundsModal closes, reset `pausedForFunds` to false and also reset `showAddFundsModal`. This reopens the DonationModal automatically.

The key change in the return block:
```typescript
<Dialog open={isOpen && !pausedForFunds} onOpenChange={handleClose}>
```

And the AddFundsModal onClose handler:
```typescript
<AddFundsModal 
  isOpen={showAddFundsModal} 
  onClose={() => {
    setShowAddFundsModal(false);
    setPausedForFunds(false);  // Reopen DonationModal
  }} 
/>
```

## What This Achieves

- Clicking "Add Funds" in the insufficient funds warning temporarily hides the DonationModal
- The BB Store (AddFundsModal) opens with full interactivity -- all package buttons are clickable
- Clicking a package triggers Stripe checkout as expected
- Clicking "Cancel" or closing the BB Store reopens the DonationModal where the user left off
- All existing state (selected amount, message, etc.) is preserved because the component stays mounted

## Files Modified

| File | Change |
|------|--------|
| `src/components/DonationModal.tsx` | Add pausedForFunds state to temporarily dismiss Dialog while AddFundsModal is active |

