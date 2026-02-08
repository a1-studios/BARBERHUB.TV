

## Pay for Subscriptions with Barber Bucks

### What Changes

The subscription tier cards will show prices in Barber Bucks (BB) instead of raw USD, and clicking "Subscribe Now" will attempt to pay directly from the user's BB wallet. If the user doesn't have enough BB, the Add Funds modal (BB Store) will pop up so they can top up first.

### Pricing Conversion ($1 = 5 BB)

| Tier | USD/month | BB/month |
|------|-----------|----------|
| Bronze | $10 | 50 BB |
| Silver | $25 | 125 BB |
| Gold | $50 | 250 BB |

Each card will show the BB price prominently (e.g. "50 BB") with a small "~$10/mo" subtitle for reference.

### New Subscribe Flow

1. User clicks "Subscribe Now" on a tier
2. System checks their BB balance
3. **Enough BB** -- A confirmation dialog appears: "Pay 50 BB for Bronze Creator? Your balance: 320 BB" with Confirm/Cancel buttons
4. On confirm, an edge function deducts the BB and activates the subscription in the database
5. **Not enough BB** -- A prompt appears showing the shortfall (e.g. "You need 125 BB but only have 40 BB") with a button to open the BB Store (AddFundsModal)

---

### Technical Details

#### 1. New Edge Function: `subscribe-with-bb`

Creates `supabase/functions/subscribe-with-bb/index.ts` that:
- Authenticates the user
- Verifies they are a barber
- Looks up the tier and its BB cost (`price_monthly_cents / 100 * 5`)
- Checks the user's `barber_bucks` balance
- If sufficient: deducts BB, records a `barber_bucks_transactions` entry (type: subscription), creates/updates a row in `barber_subscriptions` with status `active`, sets `current_period_start` to now and `current_period_end` to 30 days from now
- If insufficient: returns an error with the required amount and current balance
- All done atomically using the service role key

#### 2. Modify `BarberSubscriptionTiers.tsx`

- Import `useBarberBucks` hook to get current balance and `setShowAddFundsModal`
- Import `AddFundsModal` component
- Convert displayed price from cents to BB: `const bbPrice = (tier.price_monthly_cents / 100) * 5`
- Replace the USD price display with BB price + small USD reference text
- Replace `handleSubscribe` logic:
  - Instead of calling `create-barber-subscription` (Stripe), show an inline confirmation step
  - Add state: `confirmingTier` (which tier is being confirmed), `showAddFunds` (boolean)
  - If balance >= bbPrice: show confirmation dialog
  - If balance < bbPrice: show insufficient funds message with "Add Funds" button
  - On confirm: call the new `subscribe-with-bb` edge function
  - On success: invalidate queries, show success toast, close modal
- Add a "Your Balance: X BB" indicator at the top of the tiers section
- Render `AddFundsModal` with the `pausedForFunds` pattern (same as DonationModal) so it layers properly

#### 3. Modify `UpgradePrompt.tsx`

- Update the quick-preview cards in the grid to show BB prices instead of battle counts (e.g. "50 BB/mo" instead of "3 battles/mo") for consistency

#### Files Created
- `supabase/functions/subscribe-with-bb/index.ts`

#### Files Modified
- `src/components/barber/BarberSubscriptionTiers.tsx` -- BB pricing display, confirmation flow, insufficient funds prompt, AddFundsModal integration
- `src/components/barber/UpgradePrompt.tsx` -- Update quick preview cards to show BB prices

