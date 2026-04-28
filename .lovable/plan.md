# Creator Hub — Simplified Single-Page Layout + Academy

Repack everything onto **one scrollable page** with a slick unified card grid, shrink Camera Studio to a small pill directly under the title, and add the **BarberHub Academy** module using existing infra.

## New page layout (top → bottom)

```
┌─────────────────────────────────┐
│        👑                       │
│     CREATOR-HUB                 │  ← unchanged title
│   Your content command center   │
│                                 │
│   [📷 Camera Studio  →]         │  ← compact pill (~70% smaller)
├─────────────────────────────────┤
│  QUICK ACTIONS                  │  ← section label
│  ┌────────┐ ┌────────┐          │
│  │ Upload │ │ Battle │          │
│  ├────────┤ ├────────┤          │
│  │Challenge│ │ Deals │          │
│  ├────────┤ ├────────┤          │
│  │ Stats  │ │Academy │ ← NEW    │
│  └────────┘ └────────┘          │
├─────────────────────────────────┤
│  BARBERHUB ACADEMY              │  ← signature orange accent strip
│  ┌─────────────────────────┐    │
│  │ 🎓 Become an Educator   │    │  ← barber-only inline card
│  │ Monetize your technique │    │
│  │ [Start Teaching →]      │    │
│  └─────────────────────────┘    │
│  Featured Courses               │
│  ┌──────┐ ┌──────┐ ┌──────┐    │  ← horizontal scroll cards
│  │course│ │course│ │course│    │     w/ BB price + lock icon
│  └──────┘ └──────┘ └──────┘    │
├─────────────────────────────────┤
│  YOUR CONTENT                   │
│  (published content placeholder)│
└─────────────────────────────────┘
```

## Specific Changes

### 1. Shrink Camera Studio — `src/pages/CreatorHub.tsx`
Replace the 40vh giant card (lines 106–135) with a compact pill placed **immediately below** the subtitle:
- Height ~52px (down from ~40vh = ~70% reduction)
- Horizontal pill: small camera icon + "Camera Studio" + arrow → on right
- Same orange-glow border + gradient, just shrunk
- Centered, max-width ~280px

### 2. Add Academy to action bar — `src/components/creator/CreatorActionBar.tsx`
Add 6th action `{ key: 'academy', label: 'Academy', subtitle: 'Teach & Earn', icon: GraduationCap, color: 'text-primary' }`. Grid stays `grid-cols-2`, all 6 evenly fill 3 rows (remove the `col-span-2` last-item logic).

### 3. New inline Academy section — directly on `CreatorHub.tsx`
Replace the empty "Your published content will appear here" card with:

**a) Section header** — small JetBrains-mono style label "BARBERHUB ACADEMY" with orange underline.

**b) Become an Educator card** (barbers only, ~120px tall):
- Icon: GraduationCap in orange circle
- Title: "Become an Educator"
- Sub: "Publish courses, earn 85% in BB"
- CTA: opens existing `UploadDrawer` (which already routes to `EducatorUpload` — already gated by `active_subscription_tier` via `UpgradePrompt`). No new educator-onboarding work needed.

**c) Featured Courses rail** — horizontal scroll list of `creator_content` rows where `content_type IN ('masterclass','tutorial')`. Each card:
- 16:9 thumbnail
- Title, educator name
- Bottom-right BB price chip with 🪙 icon
- 🔒 lock overlay if user has not purchased

**d) Tap a course →** opens a `CourseDetailDrawer` (new) showing description + preview thumbnail + **paywall**:
- If unlocked → embedded `BrandedVideoPlayer`
- If locked → orange "Unlock for X BB" button → calls new `academy-unlock-course` edge function

### 4. Paywall — new edge function `academy-unlock-course`
Atomic BB transaction (FOR UPDATE lock per economy-integrity rules):
- Validate JWT
- Lock student's `profiles.barber_bucks` row
- If balance < price → return `insufficient_funds` (frontend opens `AddFundsModal`)
- Deduct price, credit 85% to educator, 15% to platform ledger
- Insert into new `academy_unlocks (id, content_id, student_id, bb_paid, unlocked_at, unique(content_id, student_id))`
- Log to `barber_bucks_transactions`
- Return `{ ok: true }`

### 5. New table — `academy_unlocks`
```sql
academy_unlocks (
  id uuid pk,
  content_id uuid references creator_content(id) on delete cascade,
  student_id uuid not null,
  bb_paid int not null,
  unlocked_at timestamptz default now(),
  unique(content_id, student_id)
)
```
RLS: SELECT only by `student_id = auth.uid()` OR by content owner. INSERT via edge function only.

### 6. Add price field to courses
Add `price_bb int default 0` to `creator_content` so educators can set a price when publishing. `EducatorUpload.tsx` gets one new BB price input (next to the existing boost field). Free content (`price_bb = 0`) skips the paywall.

## Reused infra (no rebuild needed)

- **Educator onboarding**: `EducatorUpload` already exists, already gates on subscription tier via `UpgradePrompt` — that's the "way for barbers to become educators" you mentioned.
- **BB economy**: `useBarberBucks`, `barber_bucks_transactions`, `AddFundsModal` — all wired.
- **Subscription paywall on creators**: `UpgradePrompt` with `reason="premium_feature"` already shown when a non-subscriber tries to publish.
- **Video playback**: `BrandedVideoPlayer` + `CloudflareStreamPlayer`.
- **Signature colors**: orange `#FF6B1A` primary, deep black `#0a0a0f` background — already the active theme.

## Files Changed / Created

**Edited (3):**
- `src/pages/CreatorHub.tsx` — shrink Camera Studio pill, add Academy section inline
- `src/components/creator/CreatorActionBar.tsx` — add 6th Academy action
- `src/components/creator/EducatorUpload.tsx` — add `price_bb` input field

**Created (3):**
- `src/components/academy/AcademyRail.tsx` — featured courses horizontal scroll
- `src/components/academy/CourseDetailDrawer.tsx` — preview + paywall + player
- `supabase/functions/academy-unlock-course/index.ts` — atomic BB unlock

**Migration (1):**
- New `academy_unlocks` table + RLS + add `price_bb` column to `creator_content`

## Out of scope (kept simple)

- Multi-lesson course curriculum (single videos only for now)
- Live coaching rooms / Mentor Battles / M4M auto-cert
- Standalone `/academy` route — Academy lives only inside Creator Hub for now
- Certificates — defer until courses become multi-lesson

## Acceptance

- One scrollable page, no drawers required to see Academy
- Camera Studio is a small pill under the title (~70% smaller)
- 6 quick-action cards in a clean 2-col grid
- Barbers see "Become an Educator" CTA → opens existing upload (already paywalled by tier)
- Fans see featured courses, tap → see paywall, pay BB → video unlocks
- All BB mutations server-side with row locks
