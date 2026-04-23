/**
 * Controls whether the root route (`/`) renders the public Coming Soon page
 * or the full live app. Flipped via the `VITE_LAUNCH_MODE` env var.
 *
 * - `coming_soon` → `/` shows ComingSoon page; all other routes still work for QA.
 * - `live` (default) → normal app behavior.
 */
export type LaunchMode = 'coming_soon' | 'live';

export const LAUNCH_MODE: LaunchMode =
  (import.meta.env.VITE_LAUNCH_MODE as LaunchMode | undefined) ?? 'live';

export const IS_COMING_SOON = LAUNCH_MODE === 'coming_soon';
