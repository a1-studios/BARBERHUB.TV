

## Barber Settings Redesign: Cleaner Layout, Brand Colors, Consolidated Fields

### Problems from Screenshots
1. **Tab labels overlap** — "Professional" and "Portfolio" run together on mobile (390px viewport, 5 tabs cramped)
2. **Display Name + Username redundant** — eliminate Display Name, use Username only
3. **Professional Name + Nickname redundant** — keep only one field (Username from profile)
4. **Specialties show all pills inline** — should show only 3 selected + a "+" icon to open a popup with full list
5. **Years of Experience** — remove entirely
6. **Location field** — needs geolocation enable button
7. **"Locked" label on nationality** — remove the badge label, just keep it disabled
8. **Social Media Links** — move to top of Professional tab, right under the header
9. **No brand colors** — inputs/cards should use orange and cyan accents on borders/edges

### Changes

#### 1. `BarberSettings.tsx` — Tab spacing fix
Change from `grid-cols-5` to a scrollable horizontal `TabsList` with proper spacing, or use shorter labels: "Profile", "Pro", "Portfolio", "Biz", "Privacy"

#### 2. `BarberSettings.tsx` — Profile tab: Remove Display Name
Remove the Display Name field entirely. Keep only Username. The username will serve as the primary identity.

#### 3. `BarberSettings.tsx` — Professional tab restructure
- **Move Social Media Links to the top**, right after the card header
- **Remove Professional Name and Nickname** — the barber's identity comes from their Username in the Profile tab
- **Remove Years of Experience** field
- **Specialties**: Replace inline `SpecialtyPillSelector` with a compact display: show up to 3 selected pills + a "+" button that opens a Dialog with the full pill selector
- **Location**: Add a "Use my location" button (geolocation API) next to the input
- **Nationality**: Remove the "Locked" badge and the "Represents your nation" helper text — just show the disabled selector silently

#### 4. `BarberSettings.tsx` — Brand color accents
- Card borders: `border-primary/30` (orange tint)
- Input focus rings: keep default but add `border-cyan-500/30` on card edges
- Tab active state: use `data-[state=active]:bg-primary/20 data-[state=active]:text-primary`
- Section headers: add subtle orange accent line or icon color

#### 5. `SpecialtyPillSelector.tsx` — Add compact mode
Add a `compact` prop. When true, only render the selected pills (max 3) + a "+" button. The parent will handle opening a Dialog with the full selector.

### Files Changed

| File | Change |
|------|--------|
| `src/components/profiles/BarberSettings.tsx` | Remove Display Name, remove Pro Name/Nickname/Years of Experience, move socials to top of Pro tab, add geolocation button to Location, remove Locked badge, add brand color accents, fix tab spacing |
| `src/components/profiles/SpecialtyPillSelector.tsx` | Add `compact` prop for inline display of selected pills + "+" expand button |

