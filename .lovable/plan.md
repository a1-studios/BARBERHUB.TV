

## Rename "Arena Gate" to "Path to Victory" + Verify Vault Flow

### Changes

**1. `src/components/auth/ArenaGateModal.tsx`** — Rename header
- Line 181: Change `"ARENA GATE"` text to `PATH TO ` + `<span className="text-primary">VICTORY</span>`
- Center the header title instead of left-aligning it (remove the justify-between layout for the title row, keep X button absolute top-right)

**2. `src/components/vault/VaultVictory.tsx`** — Already correct
- Barbers already open `ArenaGateModal` on claim click
- Fans already open `AuthDialog` on claim click
- No changes needed here — the flow is already wired correctly from previous fixes

**Note:** The same unmounting issue from `Index.tsx` does NOT apply to VaultVictory because the Vault page (`VaultOfHonor.tsx`) doesn't conditionally unmount based on auth state the way Index does. The ArenaGateModal rendered inside VaultVictory will persist through the signup flow.

### Files Changed
| File | Action |
|------|--------|
| `src/components/auth/ArenaGateModal.tsx` | Rename title to "PATH TO VICTORY" (orange "VICTORY"), center it |

