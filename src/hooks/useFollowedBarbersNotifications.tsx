import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

interface BarberLiveStatus {
  id: string;
  name: string;
  is_live: boolean;
  live_video_id: string | null;
  user_id: string;
}

export const useFollowedBarbersNotifications = () => {
  const { user } = useAuth();
  const [followedBarberIds, setFollowedBarberIds] = useState<string[]>([]);
  const [liveStatusMap, setLiveStatusMap] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!user) return;

    // Fetch followed barbers
    const fetchFollowedBarbers = async () => {
      const { data: follows } = await supabase
        .from('creator_follows')
        .select('creator_id')
        .eq('follower_id', user.id);

      if (follows) {
        const barberIds = follows.map(f => f.creator_id);
        setFollowedBarberIds(barberIds);

        // Fetch initial live status for all followed barbers
        if (barberIds.length > 0) {
          const { data: barbers } = await supabase
            .from('barber_profiles')
            .select('id, name, is_live, live_video_id, user_id')
            .in('user_id', barberIds);

          if (barbers) {
            const statusMap = new Map<string, boolean>();
            barbers.forEach((barber: BarberLiveStatus) => {
              statusMap.set(barber.user_id, barber.is_live || false);
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

    // Subscribe to updates for all followed barbers
    const subscription = supabase
      .channel('followed-barbers-live')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'barber_profiles',
        filter: `user_id=in.(${followedBarberIds.join(',')})`
      }, async (payload) => {
        const barberData = payload.new as BarberLiveStatus;
        const wasLive = liveStatusMap.get(barberData.user_id);
        const isNowLive = barberData.is_live || false;

        // Only notify if barber just went live (wasn't live before, but is now)
        if (!wasLive && isNowLive) {
          toast({
            title: "🔴 LIVE NOW!",
            description: (
              <div className="flex flex-col gap-2">
                <p>{barberData.name} is now streaming live!</p>
                <button 
                  onClick={() => window.location.href = `/barber/${barberData.user_id}`}
                  className="text-sm text-primary hover:underline text-left"
                >
                  View Profile →
                </button>
              </div>
            ),
            duration: 10000,
          });
        }

        // Update the status map
        setLiveStatusMap(prev => {
          const newMap = new Map(prev);
          newMap.set(barberData.user_id, isNowLive);
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
