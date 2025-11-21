import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PresenceUser {
  user_id: string;
  username: string;
  avatar_url: string;
  user_type: string;
}

export const useBattlePresence = (battleId: string) => {
  const { user } = useAuth();
  const [viewers, setViewers] = useState<PresenceUser[]>([]);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (!battleId || !user) return;

    const channel = supabase.channel(`battle-presence-${battleId}`);

    // Track current user's presence
    const trackPresence = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url, user_type')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        await channel
          .on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState();
            const allUsers: PresenceUser[] = [];
            
            Object.values(presenceState).forEach((presences: any) => {
              presences.forEach((presence: any) => {
                allUsers.push(presence);
              });
            });

            setViewers(allUsers);
            setViewerCount(allUsers.length);
          })
          .on('presence', { event: 'join' }, ({ newPresences }) => {
            console.log('New viewers joined:', newPresences);
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            console.log('Viewers left:', leftPresences);
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({
                user_id: user.id,
                username: profile.username || 'Anonymous',
                avatar_url: profile.avatar_url || '',
                user_type: profile.user_type || 'fan'
              });
            }
          });
      }
    };

    trackPresence();

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [battleId, user]);

  return {
    viewers,
    viewerCount
  };
};
