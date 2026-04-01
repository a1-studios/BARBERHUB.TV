import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Radio } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LiveBarber {
  id: string;
  name: string;
  user_id: string;
  avatar_url?: string | null;
}

export const LiveNowBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get followed barber IDs
  const { data: followedIds } = useQuery({
    queryKey: ['followed-ids', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('creator_follows')
        .select('creator_id')
        .eq('follower_id', user.id);
      return data?.map(f => f.creator_id) || [];
    },
    enabled: !!user,
  });

  // Get all live barbers
  const { data: liveBarbers, refetch } = useQuery({
    queryKey: ['live-barbers-banner', followedIds],
    queryFn: async () => {
      const { data: barbers } = await supabase
        .from('barber_profiles')
        .select('id, name, user_id')
        .eq('is_live', true);

      if (!barbers || barbers.length === 0) return [];

      // Fetch avatars from profiles
      const userIds = barbers.map(b => b.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, avatar_url')
        .in('user_id', userIds);

      const avatarMap = new Map(profiles?.map(p => [p.user_id, p.avatar_url]) || []);

      const result: LiveBarber[] = barbers.map(b => ({
        ...b,
        avatar_url: avatarMap.get(b.user_id) || null,
      }));

      // Sort: followed barbers first
      if (followedIds && followedIds.length > 0) {
        const followedSet = new Set(followedIds);
        result.sort((a, b) => {
          const aFollowed = followedSet.has(a.user_id) ? 0 : 1;
          const bFollowed = followedSet.has(b.user_id) ? 0 : 1;
          return aFollowed - bFollowed;
        });
      }

      return result;
    },
    refetchInterval: 10000,
  });

  // Realtime subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('live-banner-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'barber_profiles',
      }, (payload) => {
        const oldLive = (payload.old as any)?.is_live;
        const newLive = (payload.new as any)?.is_live;
        if (oldLive !== newLive) {
          refetch();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  if (!liveBarbers || liveBarbers.length === 0) return null;

  return (
    <section className="px-3 sm:px-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
          Live Now
        </h3>
        <span className="text-xs text-muted-foreground">
          {liveBarbers.length} streaming
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {liveBarbers.map((barber) => {
          const isFollowed = followedIds?.includes(barber.user_id);
          return (
            <button
              key={barber.id}
              onClick={() => navigate(`/broadcast/${barber.id}`)}
              className="flex flex-col items-center gap-1 min-w-[64px] group"
            >
              {/* Avatar with pulsing red ring */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-60 scale-110" />
                <div className="relative rounded-full p-[2px] bg-gradient-to-tr from-red-500 to-orange-500">
                  <Avatar className="w-12 h-12 border-2 border-background">
                    <AvatarImage src={barber.avatar_url || undefined} alt={barber.name} />
                    <AvatarFallback className="bg-muted text-foreground text-xs">
                      {barber.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-background flex items-center justify-center">
                  <Radio className="w-2 h-2 text-white" />
                </div>
              </div>

              <span className="text-[10px] font-medium text-foreground truncate w-16 text-center leading-tight">
                {barber.name}
              </span>
              {isFollowed && (
                <span className="text-[8px] text-primary font-semibold">Following</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
