import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Sovereign-controlled Developer Mode flag.
 *
 * When enabled, gates that normally enforce paid tiers / limits are bypassed.
 * Stored in `platform_state.dev_mode`. Defaults OFF for production safety.
 * Subscribes to Realtime so flipping it in Sovereign HQ propagates instantly.
 */
export function useDevMode() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['platform-state', 'dev_mode'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_state')
        .select('value')
        .eq('key', 'dev_mode')
        .maybeSingle();
      if (error) throw error;
      // Default OFF when row missing
      return data?.value ?? 'false';
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('platform-state-dev-mode')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_state',
          filter: 'key=eq.dev_mode',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['platform-state', 'dev_mode'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    devMode: data === 'true', // default false
    loading: isLoading,
  };
}
