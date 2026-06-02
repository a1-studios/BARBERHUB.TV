import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isFreshLiveBroadcast } from '@/lib/liveBroadcast';

export type LiveKind = 'battle' | 'broadcast' | null;

export interface BarberLiveState {
  isLive: boolean;
  kind: LiveKind;
  destination: string | null;
  battleId?: string | null;
}

interface LiveStateMap {
  battles: Record<string, { battleId: string }>; // barberUserId -> battle
  broadcasts: Record<string, { barberId: string }>; // barberUserId -> barber_profiles.id
}

const QUERY_KEY = ['barber-live-state'];

async function fetchLiveState(): Promise<LiveStateMap> {
  const [battlesRes, barbersRes] = await Promise.all([
    supabase
      .from('battles')
      .select('id, barber1_id, barber2_id, status')
      .in('status', ['voting', 'live']),
    supabase
      .from('barber_profiles')
      .select('id, user_id, is_live, last_live_check, updated_at')
      .eq('is_live', true),
  ]);

  const battles: LiveStateMap['battles'] = {};
  battlesRes.data?.forEach((b: any) => {
    if (b.barber1_id) battles[b.barber1_id] = { battleId: b.id };
    if (b.barber2_id) battles[b.barber2_id] = { battleId: b.id };
  });

  const broadcasts: LiveStateMap['broadcasts'] = {};
  barbersRes.data?.forEach((p: any) => {
    if (isFreshLiveBroadcast(p.last_live_check, p.updated_at)) {
      broadcasts[p.user_id] = { barberId: p.id };
    }
  });

  return { battles, broadcasts };
}

function useLiveStateMap() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchLiveState,
    refetchInterval: 15000,
    staleTime: 5000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('live-state-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battles' },
        () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'barber_profiles' },
        () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query.data ?? { battles: {}, broadcasts: {} };
}

export function useBarberLiveState(barberUserId?: string | null): BarberLiveState {
  const map = useLiveStateMap();
  return useMemo(() => {
    if (!barberUserId) return { isLive: false, kind: null, destination: null };
    const battle = map.battles[barberUserId];
    if (battle) {
      return {
        isLive: true,
        kind: 'battle',
        destination: `/battle/${battle.battleId}/theater`,
        battleId: battle.battleId,
      };
    }
    const broadcast = map.broadcasts[barberUserId];
    if (broadcast) {
      return {
        isLive: true,
        kind: 'broadcast',
        destination: `/broadcast/${broadcast.barberId}`,
      };
    }
    return { isLive: false, kind: null, destination: null };
  }, [map, barberUserId]);
}

export function useLiveSnapshot() {
  return useLiveStateMap();
}
