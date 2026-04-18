

User wants to redesign the email gate (`EnterTheVault` step in promotion gate) to:
1. Add a "Sign In" path for existing users — currently it forces everyone through the new-lead flow
2. Re-skin from cyan-dominant to **orange-dominant with cyan accents** (matches platform brand: Neon Orange primary, Zion Blue secondary)
3. Inject high-energy welcome feel (motion, glow, hype copy)

Let me check the file briefly to confirm structure and existing flow.
<lov-tool-use id="toolu_vrtx_01625qYWFTii6xSP4tf9DAmF" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/promotion-gate/IdentifyStep.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_013AK7R99LtbTVxPUwPS9VWS" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/components/promotion-gate\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_0142Ttdigg1tnmMkwB8p42z9" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/promotion-gate/EmailGateStep.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Cw2ZgLXrV4pZz1wbtZYM3q" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/components/promotion-gate\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01P8Ygh6BnYckmhoGabttmfH" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/promotion-gate/IdentifyStep.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01EGJQU7nfVfHF7nXXFL8VAX" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/promotion-gate/useGateState.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01WxTfrDpu4p7DNKCZ9mdF6T" name="code--search_files" integration-id="code" data="{\"query\": \"EmailGateStep|promotion-gate\", \"include_patterns\": \"*.tsx,*.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01SvT4NFSLXvpJMEKQ5ZPs7R" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/SpinWheelOverlay.tsx\"}">
</lov-tool-use>
Now I have full context. The user wants the `EmailGateStep` (Enter the Vault screen) redesigned: (1) add a "Sign In" path for existing users, (2) shift palette from cyan-dominant to **orange-dominant with cyan accents**, and (3) more energetic welcome feel.

<lov-plan>

## What's Wrong (per screenshot)
- `EmailGateStep` is cyan-heavy (envelope ring, label, input border, glow) → feels cold/corporate vs our signature **Neon Orange**.
- "AUTHENTICATE" CTA is disabled-grey by default → looks dead.
- No path for **returning users** — they're forced through the full vault funnel even if they already have an account.
- Copy ("ENTER THE VAULT", "IDENTIFICATION REQUIRED", "OPERATOR EMAIL") feels sterile, not "energetic welcome."

## Fix — Redesign `EmailGateStep` only

### A. Visual overhaul — Orange primary, cyan accent

| Element | Now (cyan) | New (orange-led) |
|---|---|---|
| Icon ring | cyan border + cyan glow | **Orange Sparkles icon** in orange ring with pulsing orange glow + tiny cyan inner dot accent |
| Heading | "ENTER THE VAULT" thin tracking, cyan shadow | **"WELCOME BACK"** (or "JOIN THE ARENA") — chunky display weight, orange-to-yellow gradient text, animated letter-by-letter entrance |
| Sub-line | "IDENTIFICATION REQUIRED" grey | **"Your seat at the table is one tap away ⚡"** — warmer copy, white/80, no caps tracking |
| Input label | cyan triangle "OPERATOR EMAIL" | small orange dot + "Email" — friendly, not spec-sheet |
| Input border | cyan when valid | **orange when valid**, cyan only as the focus ring accent (1px inset) |
| Input bg | flat black | subtle orange radial-glow underneath when focused |
| CTA when empty | dead grey "AUTHENTICATE" | **always-live orange gradient**, label "Continue →"; if email invalid, button shakes on submit instead of looking dead |
| CTA when valid | flat orange | orange gradient + animated shimmer sweep + soft pulse halo |
| Footer | "ENCRYPTED · SINGLE-USE · NO SPAM" mono cyan-grey | warmer "🔒 We never spam. Promise." in white/40 |

Add a subtle **animated orange particle burst** behind the icon on mount (3-4 framer-motion dots fanning outward) for the "energetic welcome" feel.

### B. Returning-user path — "Already have an account? Sign in"

Below the CTA add a clearly visible secondary action:

```
─────────  or  ─────────
        Already have an account?
       [ Sign in instead → ]   ← cyan-outlined ghost button
```

Clicking it:
- Calls a new optional prop `onSignIn?: () => void` passed from `SpinWheelOverlay`
- In `SpinWheelOverlay.handleEmail`'s sibling, add `handleSignIn = () => { onClose(); navigate('/auth'); }` — closes the vault overlay and routes to `/auth` (existing sign-in page)
- Skips the gate entirely (does NOT call `markGateCompleted` so they can still claim a prize later if they want)

### C. Component contract changes

| File | Change |
|---|---|
| `src/components/promotion-gate/EmailGateStep.tsx` | Full visual rebuild per table above; add optional `onSignIn?: () => void` prop; render Sign-in CTA when present; keep all existing email validation logic untouched |
| `src/components/SpinWheelOverlay.tsx` | Add `handleSignIn` (uses existing `useNavigate`) → `onClose()` then `navigate('/auth')`. Pass `onSignIn={handleSignIn}` into `<EmailGateStep>` |

No other files touched. No DB, no edge functions, no routing additions (the `/auth` page already exists).

## Result
- New screen leads with **orange energy** (gradient title, pulsing orange icon, live orange CTA) with cyan reduced to small accent details (focus ring, sign-in button outline).
- Returning users see **"Sign in instead →"** below the primary CTA → one tap to `/auth`.
- New users still flow through Email → Identify → Spin → Reward → Finalize unchanged.
- Energetic welcome via gradient text, particle burst, shimmer CTA, warmer copy.

