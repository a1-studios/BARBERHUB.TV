

## Fix: BB Purchase Flow, Balance Crediting, and Add Funds Modal

### Problems Identified

1. **Purchases never credit BB**: Stripe checkout sessions are created successfully, but the balance never updates. The `barber_bucks_transactions` table is empty and all users show 0 BB. The PaymentSuccess page explicitly skips verification for BB purchases, relying entirely on a Stripe webhook that is not functioning.

2. **White page when clicking Add Funds**: The `window.open()` call inside the Lovable preview iframe gets blocked by the browser. The fallback `window.location.href` navigates the entire page away to Stripe. When the user returns, they see a white/blank page.

3. **Broken RLS policy**: The `barber_bucks_transactions` INSERT policy has a `with_check: false` condition, which always denies inserts. While the edge function bypasses this via the service role key, the policy is incorrect and should be fixed.

### Solution

#### 1. Create `verify-bb-purchase` Edge Function (NEW)

A new edge function that the PaymentSuccess page calls to verify and credit the purchase. This eliminates dependency on Stripe webhooks.

- Accepts `session_id` from an authenticated user
- Retrieves the Stripe checkout session to confirm it was paid
- Verifies the `user_id` in session metadata matches the authenticated user
- Checks if a transaction with that `stripe_payment_id` already exists (idempotent -- prevents double-crediting)
- If not yet credited: inserts the transaction record, updates the profile balance, creates a notification
- Returns the credited amount and new balance

#### 2. Update PaymentSuccess Page

- When `type=bb` and `session_id` is present, call the new `verify-bb-purchase` edge function instead of just showing a toast
- Add loading and error states during verification
- Display the actual BB amount credited after successful verification
- Invalidate the `barber_bucks` query cache so the header balance updates immediately

#### 3. Fix AddFundsModal Redirect Logic

- Remove the `window.open()` / popup approach entirely
- Use `window.location.href` directly for the Stripe redirect (most reliable in all environments including iframes)
- Add a brief loading state on the clicked package button to prevent double-clicks
- Close the modal before navigating so the UI is clean

#### 4. Fix `useBarberBucks` Purchase Mutation

- Remove the `window.open` / popup logic from `onSuccess`
- Return the URL from the mutation and let the calling component handle navigation
- This prevents the white-page scenario entirely

#### 5. Fix RLS Policy on `barber_bucks_transactions`

- Drop the broken INSERT policy (`with_check: false`)
- Create a correct INSERT policy that allows the service role to insert (or simply remove the public INSERT policy since the edge function uses the service role key which bypasses RLS anyway)

### Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/functions/verify-bb-purchase/index.ts` | **NEW** -- Verifies Stripe session and credits BB |
| `src/pages/PaymentSuccess.tsx` | Call `verify-bb-purchase` for BB purchases, show real amounts |
| `src/hooks/useBarberBucks.tsx` | Remove popup/redirect logic from mutation, return URL only |
| `src/components/AddFundsModal.tsx` | Handle redirect via `window.location.href`, add loading state |
| Database migration | Fix the broken INSERT RLS policy on `barber_bucks_transactions` |

### Technical Details

**verify-bb-purchase edge function logic:**
```
1. Authenticate user from Authorization header
2. Retrieve Stripe checkout session by session_id
3. Verify session.payment_status === "paid"
4. Verify session.metadata.user_id === authenticated user ID
5. Check barber_bucks_transactions for existing stripe_payment_id (idempotent)
6. If not found: calculate BB from package, insert transaction, update profile balance
7. Return { success, bb_credited, new_balance }
```

**AddFundsModal redirect fix:**
```typescript
const handleAddFunds = async (usdAmount: number) => {
  purchaseBucks.mutate(usdAmount, {
    onSuccess: (data) => {
      onClose();
      // Direct navigation -- most reliable across all environments
      window.location.href = data.url;
    }
  });
};
```

**useBarberBucks mutation cleanup:**
```typescript
// Remove window.open logic from onSuccess
// Just return the data, let the caller handle navigation
const purchaseBucks = useMutation({
  mutationFn: async (packageAmount: number) => {
    // ... invoke edge function ...
    return data; // { url, session_id, bb_amount }
  },
  onError: (error) => {
    toast.error(error.message || "Failed to initiate purchase");
  }
  // No onSuccess redirect here -- caller handles it
});
```

**RLS policy fix:**
```sql
DROP POLICY IF EXISTS "System can insert transactions" ON barber_bucks_transactions;
-- No public INSERT policy needed; edge functions use service role key which bypasses RLS
```

### Flow After Fix

```text
User clicks package in BB Store
  -> Edge function creates Stripe session
  -> Page navigates to Stripe checkout (window.location.href)
  -> User completes payment on Stripe
  -> Stripe redirects to /payment-success?session_id=xxx&type=bb
  -> PaymentSuccess calls verify-bb-purchase
  -> Edge function verifies payment, credits BB, records transaction
  -> User sees confirmed amount and updated balance
  -> Balance in header refreshes automatically
```

