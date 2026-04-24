import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

interface BarberLiveStatus {
  id: string;
  name: string;
  is_live: boolean;
  live_video_id: string | null;
  user_id: string;
}

/**
 * Realtime alerts when a followed barber goes live.
 * Uses sonner (top-right, transient — never persisted in any toast store)
 * with a short 5s duration to avoid stacking / clutter.
 */
export const useFollowedBarbersNotifications = () => {
  const { user } = useAuth();
  const [followedBarberIds, setFollowedBarberIds] = useState<string[]>([]);
  const [liveStatusMap, setLiveStatusMap] = useState<Map<string, { isLive: boolean; barberProfileId: string }>>(new Map());

  useEffect(() => {
    if (!user) return;

    const fetchFollowedBarbers = async () => {
      const { data: follows } = await supabase
        .from('creator_follows')
        .select('creator_id')
        .eq('follower_id', user.id);

      if (follows) {
        const barberIds = follows.map(f => f.creator_id).filter(id => id !== user.id);
        setFollowedBarberIds(barberIds);

        if (barberIds.length > 0) {
          const { data: barbers } = await supabase
            .from('barber_profiles')
            .select('id, name, is_live, live_video_id, user_id')
            .in('user_id', barberIds);

          if (barbers) {
            const statusMap = new Map<string, { isLive: boolean; barberProfileId: string }>();
            barbers.forEach((barber: BarberLiveStatus) => {
              statusMap.set(barber.user_id, {
                isLive: barber.is_live || false,
                barberProfileId: barber.id,
              });
            });
            setLiveStatusMap(statusMap);
          }
        }
      }
    };

    fetchFollowedBarbers();
  }, [user]);

  useEffect(() => {
    if (followedBarberIds.length === 0) return;

    const subscription = supabase
      .channel('followed-barbers-live')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'barber_profiles',
        filter: `user_id=in.(${followedBarberIds.join(',')})`
      }, async (payload) => {
        const barberData = payload.new as BarberLiveStatus;
        const prev = liveStatusMap.get(barberData.user_id);
        const wasLive = prev?.isLive ?? false;
        const isNowLive = barberData.is_live || false;

        if (!wasLive && isNowLive) {
          // Transient sonner pop-down — top-right, 5s, not stored anywhere.
          toast(`🔴 ${barberData.name} is LIVE`, {
            description: 'Tap to watch',
            duration: 5000,
            action: {
              label: 'Watch',
              onClick: () => { window.location.href = `/broadcast/${barberData.id}`; },
            },
          });
        }

        setLiveStatusMap(prev => {
          const newMap = new Map(prev);
          newMap.set(barberData.user_id, {
            isLive: isNowLive,
            barberProfileId: barberData.id,
          });
          return newMap;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [followedBarberIds, liveStatusMap]);

  return null;
};
