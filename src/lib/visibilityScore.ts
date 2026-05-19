// Map marker visibility scoring (frontend, runs before render)
export interface VisibilityWeights {
  tierMultiplier: number;
  bbWeight: number;
  battleWeight: number;
  contributionWeight: number;
}

export const DEFAULT_WEIGHTS: VisibilityWeights = {
  tierMultiplier: 1.0,
  bbWeight: 1.0,
  battleWeight: 1.0,
  contributionWeight: 1.0,
};

const TIER_BASE: Record<string, number> = {
  diamond: 150,
  gold: 100,
  silver: 50,
  bronze: 10,
};

export interface ScorableBarber {
  active_subscription_tier: string | null;
  bb_purchased?: number | null;
  battles_participated?: number | null;
  contribution_score?: number | null;
}

export function calculateVisibilityScore(
  barber: ScorableBarber,
  weights: VisibilityWeights,
): number {
  const tierBase = TIER_BASE[barber.active_subscription_tier ?? ''] ?? 0;
  const bb = Number(barber.bb_purchased ?? 0);
  const battles = Number(barber.battles_participated ?? 0);
  const contrib = Number(barber.contribution_score ?? 0);

  return (
    tierBase * weights.tierMultiplier +
    bb * weights.bbWeight +
    battles * 10 * weights.battleWeight +
    contrib * weights.contributionWeight
  );
}

// Visual scale: caps at 1.6x to keep aesthetic stable
export function scoreToScale(score: number): number {
  return 1 + Math.min(score / 500, 0.6);
}
