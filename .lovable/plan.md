

## Plan: Specialty Pills Visible to Fans + Hide Tier Plans from Non-Barbers

### Problem
1. **Specialty pills** are only shown on profile edit forms — fans can't see or filter by them in the Barbers Directory or on barber cards/profiles.
2. **Tier subscription plans** (the membership drawer in TierRing) are visible to anyone who clicks the avatar, including fans who shouldn't see barber-only tier options.

### Changes

#### 1. Replace specialty dropdown filter with pill-based filter in BarbersDirectory
**File**: `src/pages/BarbersDirectory.tsx`
- Replace the `<Select>` specialty filter (lines 178-191) with a horizontal row of clickable specialty pills using `SPECIALTY_TAGS` from `specialtyTags.ts`
- Update the filter logic (line 74) to check if the barber's comma-separated specialty string contains the selected specialty ID (not exact match)
- Add diamond to the tier sort priority (line 91-97): `diamond` = 5

#### 2. Show specialty pills on BarberProfileCard
**File**: `src/components/barber/BarberProfileCard.tsx`
- Import `parseSpecialties`, `getSpecialtyDisplay` from `specialtyTags.ts`
- Replace the plain text specialty display (lines 221-226) with parsed pill badges showing emoji + label

#### 3. Hide tier drawer from non-barbers in TierRing
**File**: `src/components/TierRing.tsx`
- Add an optional `hideUpgrade` prop (default false)
- When `hideUpgrade` is true, skip the interactive drawer entirely (just show the ring visually)

#### 4. Pass `hideUpgrade` from fan-facing contexts
**Files**: `src/components/barber/BarberProfileCard.tsx`, `src/pages/BarberPublicProfile.tsx`
- On the public profile and directory cards, the TierRing/AvatarCrest should never show the membership plans drawer — set `interactive={false}` (BarberProfileCard already doesn't pass `interactive`, so it defaults to false — this is fine)
- In `BarberProfileHeader.tsx`, the `interactive` prop is tied to `showActions` which is only true on the barber's own profile — this is already correct

#### 5. Show specialty pills on BarberPublicProfile
**File**: `src/pages/BarberPublicProfile.tsx`
- Ensure the specialty section renders parsed pills (already done in last edit — verify it's correct)

### Files Changed

| File | Change |
|------|--------|
| `src/pages/BarbersDirectory.tsx` | Replace specialty `<Select>` with pill row filter; fix specialty matching for comma-separated values; add diamond to tier sort |
| `src/components/barber/BarberProfileCard.tsx` | Render specialty as pill badges instead of plain text |

Two files. The TierRing and public profile are already correctly configured — no changes needed there.

