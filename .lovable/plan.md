

## Streamline Subscription: Skip Straight to Add Funds

### The Problem
When a user with insufficient BB clicks "Subscribe", they currently go through two unnecessary steps:
1. An "Insufficient Barber Bucks" dialog appears showing the shortfall
2. They must click "Add Funds" on that dialog to finally open the BB Store

This is annoying -- the user already knows they want to subscribe, just take them straight to the store.

### The Fix
Remove the intermediate "Insufficient Funds" dialog entirely. When balance is too low, open the Add Funds modal (BB Store) directly with a single toast message explaining the shortfall.

### How It Will Work After the Change
1. User clicks "Subscribe for 125 BB"
2. If they have enough BB -- confirmation dialog appears (no change)
3. If they don't have enough BB -- the BB Store opens immediately with a toast like "You need 85 more BB to subscribe to Silver Master"
4. Same behavior if the edge function returns `insufficient_funds` -- just open the store directly

### Technical Details

#### File Modified: `src/components/barber/BarberSubscriptionTiers.tsx`

- Remove the `insufficientInfo` state variable entirely
- Remove the "Insufficient Funds" `AlertDialog` component (lines 271-298)
- In `handleSubscribeClick`: when `barberBucks < bbPrice`, show a toast with the shortfall info and immediately call `setShowAddFunds(true)` instead of setting `insufficientInfo`
- In `handleConfirmSubscribe`: when the edge function returns `insufficient_funds`, show a toast and immediately call `setShowAddFunds(true)` instead of setting `insufficientInfo`

This reduces the flow from 3 clicks (Subscribe -> Add Funds button -> pick package) down to 2 clicks (Subscribe -> pick package), with a helpful toast explaining the shortfall.

