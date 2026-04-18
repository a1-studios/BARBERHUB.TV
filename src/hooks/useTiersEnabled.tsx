import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Master tier-system toggle. When `enabled === false`, the entire tier
 * subscription/visibility system is disabled platform-wide.
 *
 * Subscribes to Supabase Realtime on `platform_state` so that flipping
 * the toggle in Sovereign HQ propagates to every active client instantly.
 */
export function useTiersEnabled() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['platform-state', 'tiers_enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_state')
        .select('value')
        .eq('key', 'tiers_enabled')
        .maybeSingle();
      if (error) throw error;
      // Default ON when row missing (backward compatibility)
      return data?.value ?? 'true';
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('platform-state-tiers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_state',
          filter: 'key=eq.tiers_enabled',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['platform-state', 'tiers_enabled'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    enabled: data !== 'false', // default true; only false when explicitly set
    loading: isLoading,
  };
}
