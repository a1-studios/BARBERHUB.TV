
# Architectural Audit & Cleanup Plan

Goal: shrink the bundle and codebase by removing genuinely dead frontend code and stale fragments, **without breaking anything currently in use**. We work in safe, reviewable phases with a strict "verify before delete" rule.

## Guiding rules (non-negotiable)

1. Never delete edge functions. Knip reports them as "unused" because they're invoked dynamically via `supabase.functions.invoke(...)` and cron — they are live infrastructure. Edge-function cleanup is OUT OF SCOPE of this pass.
2. Never delete DB tables, RLS policies, migrations, or anything under `supabase/` other than truly orphaned frontend helpers.
3. For every file proposed for deletion: confirm zero `import` references via `rg` AND no dynamic `lazy(() => import(...))` / string-literal reference before removing.
4. Keep all shadcn/ui primitives even if currently unused — they are a design-system library, not app code. (Exception in Phase 4 below, only if explicitly approved.)
5. No behavior changes. No refactors that alter UX, routes, auth, economy, or realtime logic.
6. Work in small commits per phase so anything can be reverted cleanly.

## Phase 1 — Confirmed dead legacy (safe deletes)

These are already neutralized in routing or replaced by newer components. Verified via grep:

- `src/pages/BattlesPage.tsx` — route was replaced with `<Navigate to="/watch" />` in `App.tsx`; file has no importers.
- `src/pages/CreateBattle.tsx` — `/battles/create` now redirects to `/creator-hub`; replaced by `components/creator/CreateBattleDrawer.tsx`. No importers.
- `src/components/BattlesSection.tsx` — empty placeholder returning `null`, still rendered in `Index.tsx`. Remove import + JSX usage in `Index.tsx` and delete the file.
- `src/components/coming-soon/StepBarberDetails.tsx`, `StepFanDetails.tsx`, `StepClaimAccount.tsx`, `StepProfileBoost.tsx` — superseded by current `LaunchWizard` flow (StepRole → StepAuth → StepBucksReward → StepRaffleSpin → StepTicketReveal). Verify zero importers, then delete.

Verification step before each delete: `rg -n "<Filename>" src supabase` returns only the file itself.

## Phase 2 — Frontend dead modules flagged by knip (verify each)

Knip flagged ~90 frontend files. We will **not** bulk-delete. Process: for each candidate, run `rg` for the symbol AND filename across `src/`. Delete only when both return zero hits outside the file itself. High-confidence batches to review (each individually verified):

- Legacy battle UI replaced by Watch/Theater flow: `components/battles/BattleResultsView.tsx`, `BattleVotingView.tsx`, `DesktopVoteButtons.tsx`, `FullscreenBattleVideoModal.tsx`, `HeadToHeadBattle.tsx`, `InteractiveVoteSlider.tsx`, `LiveNowBanner.tsx`, `PastHighlight.tsx`, `SubmissionPreview.tsx`, `TaleOfTheTape.tsx`.
- Orphan landing teasers under `components/landing/teasers/*` and `InsideTheHubStage`, `LeaguePulseStrip`, `LegendsHeadline`, `LockedTeaser`, `OrbitingSlogan`, `RotatingTeaserStage`.
- Stale creator/barber/profile files: `components/creator/CreatorHub.tsx` (page lives in `pages/CreatorHub.tsx`), `EarningSystem.tsx`, `ReferralProgram.tsx`, `barber/BarberDashboard.tsx`, `barber/BarberProfileHeader.tsx`, `barber/BarberBucksPackages.tsx`, `profiles/BarberProfileForm.tsx`, `profiles/BarberSettings.tsx`, `profiles/PortfolioManager.tsx`.
- Unused hooks: `useBarberLiveStatus`, `useGestureVerification`, `useLiveKitStream`, `useMediaControls`.
- Misc: `HaircutAdvisorModal.tsx` (AI-Style is permanently forbidden per memory), `VideoPlayer.tsx` (replaced by `BrandedVideoPlayer`/`SmartVideoPlayer`), `WorldCupPrizeCounter.tsx`, `EmptyState.tsx`, `RoleBadge.tsx`, `QuickActionsMenu.tsx` (only if no Header usage), `BarberSearchAutocomplete.tsx`, `FeaturedCreatorCard.tsx`, `PrizePoolCard.tsx`, `utils/countryCelebration.ts`.

For anything ambiguous (e.g. `QuickActionsMenu` — memory says it's a core UI piece), default to KEEP and add a note instead.

## Phase 3 — Light optimization (no behavior change)

- Add `React.lazy` + `Suspense` for heavy, route-bound pages currently imported eagerly in `src/App.tsx`: `SovereignHQ`, `AdminDashboard`, `admin/*`, `CameraStudio`, `BroadcastStudio`, `ContenderTheater`, `BattleTheater`, `Tournaments`, `TournamentDetails`, `VaultOfHonor`, `Analytics`, legal pages. `BarbersDirectory` is already lazy — mirror that pattern.
- Remove unused imports inside files we touch (only files we touch — no project-wide reformat).
- Confirm `vite.config.ts` has `build.chunkSizeWarningLimit` reasonable and no obvious bundler regressions; no plugin changes.

## Phase 4 — OUT OF SCOPE for this pass (require explicit approval later)

- Removing unused shadcn primitives (`accordion`, `carousel`, `chart`, `sidebar`, etc.).
- Touching any `supabase/functions/*`.
- Refactoring large components for line-count reduction. "Optimum amount of lines" is not a measurable target — we will not rewrite working components just to shrink them. Real wins come from dead-file removal + lazy loading.
- Any DB migration.

## Deliverables

- A single PR-style change-set per phase with the file list, the `rg` evidence for each deletion, and a one-line "why safe".
- After Phase 1+2: build must pass and the preview must load `/`, `/watch`, `/creator-hub`, `/portal`, `/sovereign-hq` without console errors.
- After Phase 3: same routes load, plus initial JS payload measurably smaller (we'll report before/after `dist/assets` sizes).

## Confirm before I start

1. Approve Phase 1 (5 files) for immediate deletion?
2. Approve Phase 2 with the per-file verification gate (I'll list each batch's confirmed-safe files before deleting)?
3. Approve Phase 3 lazy-loading of admin/heavy routes?
4. Keep Phase 4 (shadcn pruning, edge functions, big refactors) deferred?
