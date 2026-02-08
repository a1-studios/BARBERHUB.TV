

## Fix: White Page When Clicking BB Store Packages

### Root Cause

When a user clicks a BB package in the AddFundsModal, the code runs `window.location.href = stripeUrl`. Inside the Lovable preview iframe, this navigates the **iframe content** to Stripe's checkout URL. Stripe blocks iframe embedding (via `X-Frame-Options: DENY`), so the iframe shows a completely blank white page. The user is stuck and cannot get back to the app.

### Solution

Replace the `window.location.href` redirect with a smarter approach:

1. **Try `window.open(url, '_blank')`** to open Stripe checkout in a new browser tab
2. **If popup is blocked** (returns `null`), show a visible "Open Checkout" link the user can click manually
3. **If not in an iframe** (e.g. published site), use `window.location.href` directly since it works fine there

This keeps the app running in the preview while the user completes payment in a separate tab.

### Changes

#### 1. AddFundsModal.tsx -- Smart Redirect Logic

Replace `handleAddFunds` with iframe-aware logic:

- Detect if running inside an iframe (`window.self !== window.top`)
- If iframe: use `window.open(url, '_blank')`, show toast confirming new tab opened
- If popup blocked: display a clickable checkout link directly in the modal
- If not iframe: use `window.location.href` directly (production behavior)
- Add a `pendingCheckoutUrl` state for the fallback link
- Add loading state to prevent double-clicks on packages

#### 2. useBarberBucks.tsx -- No Changes Needed

The hook already returns the URL cleanly from the mutation. No modifications required.

### Technical Details

```text
User clicks package
  -> purchaseBucks.mutate(amount) calls edge function
  -> Edge function creates Stripe session, returns { url }
  -> AddFundsModal receives URL in onSuccess
  -> Check: window.self !== window.top? (iframe detection)
     -> YES (preview): window.open(url, '_blank')
        -> Success: close modal, show "checkout opened in new tab" toast
        -> Blocked: show clickable checkout link inside modal
     -> NO (production): window.location.href = url (navigate directly)
  -> User completes payment on Stripe
  -> Stripe redirects to /payment-success?session_id=xxx&type=bb
  -> verify-bb-purchase credits the BB (auth fallback already deployed)
```

### Files Modified

| File | Change |
|------|--------|
| `src/components/AddFundsModal.tsx` | Replace `window.location.href` with iframe-aware redirect (try `window.open`, fallback to clickable link); add loading and fallback states |

