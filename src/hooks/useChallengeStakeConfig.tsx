import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Reads the Sovereign-controlled challenge-stake configuration from
 * `platform_state` and keeps it in sync via Supabase Realtime.
 *
 * - `stakesEnabled` — when false, barbers can challenge each other for free
 *   (no BB locked). Viewer donations still build the winner's pot.
 * - `minStake` — minimum BB required when stakes are enabled (configurable).
 */
export function useChallengeStakeConfig() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['platform-state', 'challenge-stake-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_state')
        .select('key, value')
        .in('key', ['challenge_stakes_enabled', 'challenge_min_stake_bb']);
      if (error) throw error;
      const map = (data || []).reduce<Record<string, string>>((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
      return {
        // Default OFF — stakes disabled unless explicitly turned on
        stakesEnabled: map.challenge_stakes_enabled === 'true',
        minStake: parseInt(map.challenge_min_stake_bb || '100', 10) || 100,
      };
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('platform-state-challenge-stakes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_state',
          filter: 'key=in.(challenge_stakes_enabled,challenge_min_stake_bb)',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['platform-state', 'challenge-stake-config'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    stakesEnabled: data?.stakesEnabled ?? false,
    minStake: data?.minStake ?? 100,
    loading: isLoading,
  };
}
