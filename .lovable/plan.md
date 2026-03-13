

## Vault-to-Signup: Direct Profile Creation Flow + Mandatory Country

### Problem
1. After winning a prize, VaultVictory shows a "CLAIM YOUR BOUNTY" button that navigates to `/?tab=signup` with URL params — user lands on a generic signup form and has to fill everything manually.
2. Country is labeled "Optional" for fans — it should be **mandatory for all users** with no mention of it being locked.

### Changes

**1. `src/components/vault/VaultVictory.tsx`** — Replace navigate-to-homepage with inline signup trigger
- For **barbers**: auto-open the `ArenaGateModal` directly inside VaultVictory (email pre-filled from vault entry).
- For **fans**: auto-open the `AuthDialog` with email, role, and prize pre-filled, tab set to signup.
- The "CLAIM YOUR BOUNTY" button triggers the modal/dialog instead of navigating away. The user stays in the vault context until account creation completes.
- After successful auth, navigate to `/profile` (or let auth state handle redirect).

**2. `src/pages/VaultOfHonor.tsx`** — Pass email to VaultVictory for pre-filling
- Already passing `email` and `role` — no change needed here.

**3. `src/components/LandingHero.tsx`** — Make country mandatory for fans
- Remove the "Optional" text under the country selector for fans.
- Add validation: block fan signup if `countryCode` is null (show toast "Please select your country").
- Remove the "Nationality locked" placeholder and "cannot be changed" warning — just show a normal "Select your country" placeholder for all users.

**4. `src/components/auth/AuthDialog.tsx`** — Same country changes
- Remove "Optional" label for fans.
- Add country validation for fan signup (`if (!signUpData.countryCode)` toast error).
- Remove "Verified" badge and "Nationality cannot be changed" warning. Just show the selector normally.

**5. `src/components/auth/SignUpForm.tsx`** — Already validates country (line 57-59), no change needed.

### Technical Details

**VaultVictory modal approach:**
```tsx
// VaultVictory.tsx — barber path
const [showArenaGate, setShowArenaGate] = useState(false);

// On "CLAIM YOUR BOUNTY" click:
if (role === 'barber') {
  setShowArenaGate(true); // ArenaGateModal opens
} else {
  // Open AuthDialog with autoOpen, pre-filled email/role
}
```

The ArenaGateModal already handles full account creation internally (credentials step pre-fills email). The AuthDialog for fans also handles signup. Both already exist — we just trigger them from VaultVictory instead of navigating to the landing page.

### Files Changed
| File | Action |
|------|--------|
| `src/components/vault/VaultVictory.tsx` | Add ArenaGateModal (barbers) and AuthDialog (fans) inline instead of navigate |
| `src/components/LandingHero.tsx` | Make country required for fans, remove "Optional"/"locked" text |
| `src/components/auth/AuthDialog.tsx` | Make country required for fans, remove lock messaging |

