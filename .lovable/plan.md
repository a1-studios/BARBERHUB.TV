

## Move Flag Selection to After Instagram, Replace Buggy Carousel

### New Flow Order
```text
Old: select(Flag) → verify → credentials → barber-info → instagram → success → choose-tier → choose-categories
New: verify → credentials → barber-info → instagram → claim-flag → success → choose-tier → choose-categories
```

### Changes

#### `src/components/auth/ArenaGateModal.tsx`
- Change `Step` type: replace `'select'` with `'claim-flag'`, reorder to `'verify' | 'credentials' | 'barber-info' | 'instagram' | 'claim-flag' | 'success' | 'choose-tier' | 'choose-categories'`
- Start at `'verify'` step (clipper swipe is the entry gate)
- Remove the entire `step === 'select'` rendering block (the FlagCarousel usage)
- Add a new `step === 'claim-flag'` block after instagram that uses a **shadcn Select dropdown** (not the buggy FlagCarousel) to pick country from 180+ options
- When country is selected in claim-flag, show giant animated flag emoji + cultural hype phrase
- CTA button: "CLAIM MY FLAG & CREATE ACCOUNT" — triggers `handleAccountCreation`
- Instagram step's `onVerified` now navigates to `'claim-flag'` instead of creating account directly
- `handleAccountCreation` is called from the claim-flag step
- Remove `handleProceedToVerify` (no longer needed)
- Update `handleVerified` to go straight to `'credentials'` without needing `selectedCountry`
- Update `handleBack` step order to match new flow
- Update subtitle text for each step
- Verify step back button removed (it's the first step now)

#### `src/components/auth/ArenaGateInstagramStep.tsx`
- Change button text from "Claim My Flag! 🏆" to "Continue" — flag claim is the next step
- Remove `isLoading` dependency from the CTA (account creation happens in next step)

#### `src/components/auth/ArenaGateProgressIndicator.tsx`
- Reorder STEPS: `verify(✂️) → credentials(👤) → barber-info(📱) → instagram(📸) → claim-flag(🏳) → tier(👑) → battle(⚔️)`
- Remove old `'select'` key, add `'claim-flag'` key

#### `src/components/auth/ArenaGateBarberInfoStep.tsx`
- Make `countryCode` prop optional with default `'US'` since country isn't selected yet at this stage

#### Flag Selection UI (inline in ArenaGateModal, claim-flag step)
- Uses shadcn `Select` dropdown with all 180+ countries from `CAROUSEL_COUNTRIES`
- On selection: large animated flag emoji (spring scale-in), cultural hype phrase, country glow
- "CLAIM MY FLAG & CREATE ACCOUNT 🏆" gradient CTA
- Back button to instagram step
- Shows `isLoading` state during account creation

### Why This Fixes the Bug
The old `FlagCarousel` uses complex framer-motion drag physics (`useMotionValue`, `drag="y"`, `dragConstraints`) causing the janky behavior. Replacing with a simple `Select` dropdown eliminates all drag bugs. Moving it to the end makes it feel like a climactic moment.

