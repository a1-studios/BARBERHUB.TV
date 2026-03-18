

## Pill-Based Specialty Selector + Barber-to-Client Review Tags

### What Already Exists
- The **review pill system** is fully built: `TagSelector` component, `CLIENT_REVIEW_TAGS` config (with positive tags like "Good Tipper 💰", "On Time ⏰" and negative tags like "No-Show Risk 🚩", "Aggressive 😤"), `PostAppointmentReviewModal`, and `ClientSnapshotWidget`. This flow already works for barber-to-client reviews.
- The **specialty field** uses a basic `<Select>` dropdown allowing only one choice from 6 options.

### What Needs to Change

#### 1. Create specialty pills config (`src/config/specialtyTags.ts`)
Define a list of barber specialty pills with emoji + label, similar to `reviewTags.ts`:
- ✂️ Fades, 💈 Classic Cuts, 🧔 Beard Styling, 🎨 Hair Color, 🌀 Texture Work, 🔥 Creative Styles, 👶 Kids Cuts, 💇‍♀️ Women's Cuts, 🪒 Straight Razor, 💎 Luxury Grooming

#### 2. Create `SpecialtyPillSelector` component (`src/components/profiles/SpecialtyPillSelector.tsx`)
Reuses the same pill visual pattern as `TagSelector` but for multi-select specialties. Max 3 selections. Shows selected pills with primary highlight.

#### 3. Update `BarberProfileForm.tsx` and `BarberSettings.tsx`
Replace the `<Select>` dropdown for specialty with the new `SpecialtyPillSelector`. Store selected specialties as comma-separated string in `barber_profiles.specialty` (no schema change needed — it's already a `text` column).

#### 4. Update display locations
In `Profile.tsx`, `BarberPublicProfile.tsx`, `Rankings.tsx` — render specialty as pill badges instead of plain text. Split the comma-separated value and show each as a styled pill.

### Files Changed

| File | Change |
|------|--------|
| `src/config/specialtyTags.ts` | New — define specialty pill options with emoji/label |
| `src/components/profiles/SpecialtyPillSelector.tsx` | New — pill-based multi-select (max 3) |
| `src/components/profiles/BarberProfileForm.tsx` | Replace `<Select>` with `SpecialtyPillSelector` |
| `src/components/profiles/BarberSettings.tsx` | Replace `<Select>` with `SpecialtyPillSelector` |
| `src/pages/Profile.tsx` | Render specialty as pill badges |
| `src/pages/BarberPublicProfile.tsx` | Render specialty as pill badges |

No database changes needed — `barber_profiles.specialty` is already a text field. The review system for barber-to-client feedback is already fully implemented.

