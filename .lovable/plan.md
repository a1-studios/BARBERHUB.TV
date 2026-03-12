

## Auto-Show Spin Wheel on Landing + Role-Specific Prizes

### What Changes

1. **Auto-open on site load** -- The spin wheel overlay appears automatically when a user lands on the site (both new and authenticated users). Uses `sessionStorage` so it only shows once per session. Users can skip/close it.

2. **Remove permanent trigger buttons** -- Delete the "SPIN TO WIN FREE REWARDS" button from `LandingHero.tsx` and the floating 🎰 button from `Index.tsx`. The wheel is now auto-triggered only.

3. **Role-specific prize pools** -- Completely different prizes for Barbers vs Fans:

**New Fan Prizes (free spin):**
| Prize | Weight |
|-------|--------|
| 15 BB Welcome | 40% |
| 25 BB Starter | 25% |
| 1 Month Free Cut | 20% |
| 3 Month Free Cuts | 10% |
| 6 Month Free Cuts | 4% |
| 1 Year Free Cuts (JACKPOT) | 1% |

**Existing Fan Prizes (5 BB cost):**
| Prize | Weight |
|-------|--------|
| 10 BB | 30% |
| 25 BB | 20% |
| 1 Month Free Cut | 25% |
| 3 Month Free Cuts | 15% |
| 6 Month Free Cuts | 8% |
| 1 Year Free Cuts (JACKPOT) | 2% |

**New Barber Prizes (free spin):**
| Prize | Weight |
|-------|--------|
| 15 BB Welcome | 40% |
| 25 BB Starter | 25% |
| 1 Week Premium Features | 20% |
| 1 Month Visibility Boost | 10% |
| 1 Month Premium Unlock | 4% |
| 3 Month Premium (JACKPOT) | 1% |

**Existing Barber Prizes (5 BB cost):**
| Prize | Weight |
|-------|--------|
| 10 BB | 30% |
| 25 BB | 20% |
| 1 Week Premium Features | 20% |
| 1 Month Visibility Boost | 15% |
| 1 Month Premium Unlock | 10% |
| 3 Month Premium (JACKPOT) | 5% |

### Flow Change

Current: User clicks button → role select → spin
New: Page loads → overlay auto-appears → user picks Barber/Fan → spin immediately (free for new, 5 BB confirm for existing) → result → signup prompt or collect

### Files Changed

| File | Change |
|------|--------|
| `src/components/vault/VaultSpinWheel.tsx` | Replace all 3 prize arrays with 4 new ones (`new_fan`, `new_barber`, `existing_fan`, `existing_barber`). Add non-BB prize types with descriptive labels. Update `PrizeSet` type. |
| `src/components/SpinWheelOverlay.tsx` | Update `getPrizeSet()` to use 4 prize sets based on auth + role. Flow stays the same (role-select first, then spin). No changes to state machine. |
| `src/pages/Index.tsx` | Auto-open spin wheel on mount (once per session via `sessionStorage`). Remove floating 🎰 button. Show for both authenticated and unauthenticated users. |
| `src/components/LandingHero.tsx` | Remove the "SPIN TO WIN FREE REWARDS" button and its `SpinWheelOverlay` instance (lines 404-419). The overlay is now only in `Index.tsx`. |

