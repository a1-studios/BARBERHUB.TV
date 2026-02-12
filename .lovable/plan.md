

## Ensure BB Purchases Are Immediately Reflected and Usable

### Problem

When a user completes a Stripe checkout (especially in new-tab flows used in iframe/preview environments), there is no guarantee the BB gets credited because:

1. The Stripe success page opens in a **new tab** where the auth session may not be ready yet
2. If the user **closes that tab** before verification completes, the BB is never credited
3. There is **no recovery mechanism** — if verification fails once, the purchase is lost forever
4. The Stripe webhook path in `purchase-barber-bucks` may not be configured, so there is no server-side fallback

### Fix Plan

#### Step 1: Manually Credit User "cj" (Database)

Insert the missing 25 BB for the $5 purchase directly into the database:

- INSERT a transaction record into `barber_bucks_transactions` for user `09acf09b-298b-49a3-a91f-038ba4314c93` with amount 25, type "purchase"
- UPDATE `profiles` to set `barber_bucks = 25` for that user

#### Step 2: Store Pending Purchase in localStorage (AddFundsModal)

**File: `src/components/AddFundsModal.tsx`**

When the Stripe checkout URL is opened (in new tab or same window), save the session info to localStorage so the app can recover it later:

```
localStorage.setItem('pending_bb_purchase', JSON.stringify({
  session_id: data.session_id,
  bb_amount: data.bb_amount,
  timestamp: Date.now()
}));
```

This happens in the `handleAddFunds` function, right before opening the URL.

#### Step 3: Add Retry Logic to PaymentSuccess

**File: `src/pages/PaymentSuccess.tsx`**

- Add a retry with delay if the first verification attempt fails (auth session race condition in new tabs)
- On success, clear the `pending_bb_purchase` localStorage key
- Maximum 3 retries with 2-second delays between attempts

#### Step 4: Add Purchase Recovery on App Load

**File: `src/pages/Index.tsx`**

Add a `useEffect` that runs on mount to check for any pending BB purchase in localStorage:

- If `pending_bb_purchase` exists and is less than 24 hours old, call `verify-bb-purchase` with the stored session ID
- On success: clear localStorage, show a toast with the credited amount, and invalidate BB query cache
- On failure or if older than 24 hours: clear the key silently
- This catches the case where the user closed the Stripe success tab before verification completed

#### Step 5: Ensure Query Cache Updates Propagate Everywhere

**File: `src/hooks/useBarberBucks.tsx`**

- Add `refetchOnWindowFocus: true` to the barber bucks balance query so when users switch back from a Stripe tab, their balance auto-refreshes
- This is a simple one-line addition that handles the most common case naturally

### Summary of Changes

| File | Action | Purpose |
|------|--------|---------|
| Database | INSERT + UPDATE | Credit 25 BB to user "cj" for missed $5 purchase |
| `src/components/AddFundsModal.tsx` | Edit | Store pending purchase in localStorage before Stripe redirect |
| `src/pages/PaymentSuccess.tsx` | Edit | Add retry logic + clear localStorage on success |
| `src/pages/Index.tsx` | Edit | Add pending purchase recovery check on page load |
| `src/hooks/useBarberBucks.tsx` | Edit | Add `refetchOnWindowFocus: true` for auto-refresh on tab switch |

### How It Works End-to-End

```text
User clicks "Add Funds" ($5)
    |
    v
AddFundsModal saves {session_id, bb_amount, timestamp} to localStorage
    |
    v
Stripe checkout opens (new tab or redirect)
    |
    v
User pays --> Stripe redirects to /payment-success?session_id=...&type=bb
    |
    +---> SUCCESS PATH: verify-bb-purchase credits BB, clears localStorage, shows balance
    |
    +---> FAIL PATH (tab closed early):
              User returns to app --> Index.tsx detects pending purchase in localStorage
              --> Calls verify-bb-purchase --> Credits BB --> Clears localStorage --> Toast
    |
    +---> NATURAL PATH (tab switch back):
              useBarberBucks refetches on window focus --> Balance updates automatically
```

This ensures that no matter what happens after payment, the user will see their BB balance update.
