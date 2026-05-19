import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_WEIGHTS, type VisibilityWeights } from '@/lib/visibilityScore';

const KEYS = [
  'map_weight_tier',
  'map_weight_bb',
  'map_weight_battle',
  'map_weight_contribution',
] as const;

export function useMapVisibilityWeights(): { weights: VisibilityWeights; loading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['map-visibility-weights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_state')
        .select('key, value')
        .in('key', KEYS as unknown as string[]);
      if (error) throw error;
      const map = new Map((data ?? []).map((r: any) => [r.key, parseFloat(r.value)]));
      return {
        tierMultiplier: map.get('map_weight_tier') ?? DEFAULT_WEIGHTS.tierMultiplier,
        bbWeight: map.get('map_weight_bb') ?? DEFAULT_WEIGHTS.bbWeight,
        battleWeight: map.get('map_weight_battle') ?? DEFAULT_WEIGHTS.battleWeight,
        contributionWeight: map.get('map_weight_contribution') ?? DEFAULT_WEIGHTS.contributionWeight,
      } as VisibilityWeights;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return { weights: data ?? DEFAULT_WEIGHTS, loading: isLoading };
}
