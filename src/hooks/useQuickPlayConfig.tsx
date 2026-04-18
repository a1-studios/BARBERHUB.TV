import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Quick Play (unranked barber-vs-barber challenges) config.
 *
 * - `quickPlayEnabled`: master switch. When false, all Quick Play entry points
 *   (Challenge Modal, Challenge Feed, direct-challenge buttons) are hidden and
 *   the create/match edge functions reject with 403.
 * - `feedPublishEnabled`: when false, Quick Play matches stay out of the
 *   /watch feed even though they're playable.
 *
 * Both keys are kept in sync via Supabase Realtime so flipping them in
 * Sovereign HQ propagates instantly.
 */
export function useQuickPlayConfig() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['platform-state', 'quick_play'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_state')
        .select('key, value')
        .in('key', ['quick_play_enabled', 'quick_play_feed_publish']);
      if (error) throw error;
      const map = (data || []).reduce<Record<string, string>>((acc, row) => {
        acc[row.key] = String(row.value ?? '');
        return acc;
      }, {});
      return map;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('platform-state-quick-play')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_state',
          filter: 'key=in.(quick_play_enabled,quick_play_feed_publish)',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['platform-state', 'quick_play'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Default ON for the master, OFF for feed publish — matches migration defaults.
  const quickPlayEnabled = (data?.quick_play_enabled ?? 'true') !== 'false';
  const feedPublishEnabled = data?.quick_play_feed_publish === 'true';

  return {
    quickPlayEnabled,
    feedPublishEnabled,
    loading: isLoading,
  };
}
