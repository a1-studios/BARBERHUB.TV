

## Add Post-Signup Upsell Steps to Arena Gate

After the barber's account is created and the celebration plays, add two new steps before closing the modal: a **subscription tier showcase** and a **battle category selection**. This turns the post-signup moment into a conversion opportunity.

### New Flow
```text
select → verify → credentials → barber-info → instagram → success → choose-tier → choose-categories → done
```

The `success` celebration plays as before, but instead of closing the modal, it transitions to the upsell steps.

### Changes

#### `src/components/auth/ArenaGateModal.tsx`
- Add two new step types: `'choose-tier'` and `'choose-categories'`
- After `handleCelebrationComplete`, transition to `'choose-tier'` instead of calling `onComplete`
- Add rendering for both new steps
- Add a "Skip for now" option on both upsell steps so it's not forced
- `'choose-categories'` step calls `onComplete` when done or skipped

#### New: `src/components/auth/ArenaGateChooseTierStep.tsx`
- Compact version of the subscription tiers (3 cards stacked vertically for mobile)
- Each tier shows: icon, name, BB price, top 3 features
- "Subscribe" button per tier (triggers the existing BB subscription flow)
- "Skip — I'll decide later" ghost button at bottom → advances to categories step
- Headline: "UNLOCK YOUR FULL POTENTIAL" with gradient text

#### New: `src/components/auth/ArenaGateChooseCategoriesStep.tsx`
- Shows the 5 tournament categories from `TOURNAMENT_CATEGORIES` config
- Each category is a selectable card with icon, short name, vibe text, and category-themed border glow
- Multi-select (max 2 per rules) with visual toggle
- "Enter the Arena" CTA button that saves selected categories to `barber_profiles.competition_categories`
- "Skip — explore first" ghost button → completes the flow
- Headline: "CHOOSE YOUR BATTLEFIELD" with gradient text

#### `src/components/auth/ArenaGateProgressIndicator.tsx`
- Add two new steps to STEPS array:
  - `{ key: 'choose-tier', icon: '👑', label: 'Tier' }`
  - `{ key: 'choose-categories', icon: '⚔️', label: 'Battle' }`
- Move `success`/`Done!` to the very end or remove from progress bar (celebration is a transition, not a tracked step)
- New order: Flag → Verify → Info → Phone → Follow → Tier → Battle

### Technical Details
- The choose-tier step reuses the existing `subscribe-with-bb` edge function — no new backend needed
- Category selection writes to `barber_profiles.competition_categories` (existing array column) via a simple Supabase update
- Both steps are skippable — no blocking the user from entering the platform

