

## Pre-Sign-Up Spin Wheel Overlay

### What We're Building

A simplified, full-screen dimmed spin wheel that appears when users click "SPIN TO WIN" on the landing page. Two distinct flows:

1. **New users (unauthenticated)**: Free spin. Small prizes only (15 BB). After winning, a "Create Account" button takes them to signup. No email collection, no viral gate, no vault funnel -- just role pick → spin → prize → signup prompt.

2. **Existing users (authenticated)**: Costs minimum 5 BB per spin. Better prizes available. Deducts BB before spinning.

Both flows start with an intuitive **Barber vs Fan** role selector (two big buttons), then immediately show the wheel.

### Components

**`src/components/SpinWheelOverlay.tsx`** (new) -- Full-screen overlay component:
- Fixed overlay with dark backdrop (`bg-black/80`) + `z-50`, dims everything
- State machine: `role-select` → `spinning` → `result`
- Role selection: Two large buttons (Scissors icon = Barber, Users icon = Fan/Client) styled like the existing `UserTypeSelector` in LandingHero
- Embeds `VaultSpinWheel` for the actual wheel mechanic
- **New user flow**: Free spin, small prizes (15 BB new user bonus, 25 BB starter). On result → show prize + "Create Account" button linking to signup tab
- **Existing user flow**: Shows BB balance, "Spin for 5 BB" button. Calls edge function to deduct BB. On result → shows prize + "Collect" button that credits BB
- Close button (X) in corner

**`src/components/vault/VaultSpinWheel.tsx`** (modify):
- Update prize arrays:
  - `NEW_USER_PRIZES`: small prizes only (15 BB Welcome Bonus weight:70, 25 BB Starter weight:25, 50 BB Lucky Break weight:5)
  - `EXISTING_BARBER_PRIZES` / `EXISTING_FAN_PRIZES`: keep current prizes but rebalanced
- Add a `prizeSet` prop option to select which prize array to use

**`src/components/LandingHero.tsx`** (modify):
- Replace the Vault CTA link (lines 402-416) with an `onClick` that opens `SpinWheelOverlay` inline
- Import and render `SpinWheelOverlay` conditionally

**`src/pages/Index.tsx`** (modify):
- For authenticated users, add a floating "Spin" button or integrate into existing UI that opens the overlay with the paid spin flow

### Edge Function: No new edge function needed
- For existing users, use existing `purchase-barber-bucks` pattern: deduct BB via direct Supabase update in the overlay component (or a lightweight RPC). Prize crediting also done client-side via profile update. This keeps it simple.
- Actually, for security, we should use a small edge function `spin-wheel` that: validates user has ≥5 BB, deducts 5 BB, picks prize server-side, credits winnings, returns result. Prevents client-side manipulation.

**`supabase/functions/spin-wheel/index.ts`** (new):
- Auth required
- Deducts 5 BB from user
- Picks prize server-side (weighted random)
- Credits prize BB to user
- Records transactions
- Returns prize info

### Files Changed

| File | Action |
|------|--------|
| `src/components/SpinWheelOverlay.tsx` | **Create** -- full-screen overlay with role select + wheel + result |
| `src/components/vault/VaultSpinWheel.tsx` | **Modify** -- add new user prize set, accept `prizeSet` prop |
| `src/components/LandingHero.tsx` | **Modify** -- replace vault link with overlay trigger |
| `src/pages/Index.tsx` | **Modify** -- add spin overlay trigger for authenticated users |
| `supabase/functions/spin-wheel/index.ts` | **Create** -- server-side spin for authenticated users (5 BB cost) |

