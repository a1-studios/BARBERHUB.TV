import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Swords } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isFreshLiveBroadcast } from '@/lib/liveBroadcast';
import { cn } from '@/lib/utils';

interface SoloLive {
  kind: 'solo';
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface BattleLive {
  kind: 'battle';
  id: string;
  status: string;
  b1_name: string;
  b1_avatar?: string | null;
  b2_name: string;
  b2_avatar?: string | null;
}

type LiveItem = SoloLive | BattleLive;

export const LiveActivityPill = () => {
  const navigate = useNavigate();

  const { data: items = [], refetch } = useQuery({
    queryKey: ['live-activity-pill'],
    queryFn: async (): Promise<LiveItem[]> => {
      // 1) Solo live broadcasts
      const { data: barbers } = await supabase
        .from('barber_profiles')
        .select('id, name, user_id, last_live_check, updated_at')
        .eq('is_live', true);

      const freshBarbers = (barbers || []).filter((b) =>
        isFreshLiveBroadcast(b.last_live_check, b.updated_at)
      );

      // 2) Live battles (active / voting / waiting_for_opponent w/ both barbers)
      const { data: battles } = await supabase
        .from('battles')
        .select('id, status, barber1_id, barber2_id')
        .in('status', ['active', 'voting', 'live'])
        .not('barber1_id', 'is', null)
        .not('barber2_id', 'is', null);

      // Collect all user_ids needed for avatar/name lookups
      const userIds = new Set<string>();
      freshBarbers.forEach((b) => userIds.add(b.user_id));
      (battles || []).forEach((b) => {
        if (b.barber1_id) userIds.add(b.barber1_id);
        if (b.barber2_id) userIds.add(b.barber2_id);
      });

      let avatarMap = new Map<string, { avatar_url: string | null; display_name: string | null }>();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, avatar_url, display_name')
          .in('user_id', Array.from(userIds));
        avatarMap = new Map(
          (profiles || []).map((p) => [
            p.user_id,
            { avatar_url: p.avatar_url, display_name: p.display_name },
          ])
        );
      }

      const soloItems: SoloLive[] = freshBarbers.map((b) => ({
        kind: 'solo',
        id: b.id,
        name: b.name,
        avatar_url: avatarMap.get(b.user_id)?.avatar_url || null,
      }));

      const battleItems: BattleLive[] = (battles || []).map((b) => {
        const p1 = avatarMap.get(b.barber1_id!);
        const p2 = avatarMap.get(b.barber2_id!);
        return {
          kind: 'battle',
          id: b.id,
          status: b.status,
          b1_name: p1?.display_name || 'Barber',
          b1_avatar: p1?.avatar_url || null,
          b2_name: p2?.display_name || 'Barber',
          b2_avatar: p2?.avatar_url || null,
        };
      });

      // Battles first (more compelling), then solo
      return [...battleItems, ...soloItems];
    },
    refetchInterval: 5000,
  });

  // Realtime updates on barber_profiles + battles
  useEffect(() => {
    const channel = supabase
      .channel('live-activity-pill-rt')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'barber_profiles' },
        (payload) => {
          const oldLive = (payload.old as any)?.is_live;
          const newLive = (payload.new as any)?.is_live;
          if (oldLive !== newLive) refetch();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battles' },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  if (items.length === 0) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-40 pointer-events-none"
      style={{ top: '88px' }}
    >
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-2',
          'bg-background/70 backdrop-blur-md',
          'border border-primary/30 rounded-full',
          'px-3 py-1.5 shadow-lg shadow-primary/10',
          'max-w-[92vw] overflow-x-auto scrollbar-hide'
        )}
      >
        {/* LIVE label */}
        <div className="flex items-center gap-1.5 pr-2 border-r border-border/40 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
            Live
          </span>
        </div>

        {items.map((item) =>
          item.kind === 'solo' ? (
            <button
              key={`solo-${item.id}`}
              onClick={() => navigate(`/broadcast/${item.id}`)}
              className="relative shrink-0 group"
              aria-label={`Watch ${item.name} live`}
            >
              <span className="absolute inset-0 rounded-full bg-red-500/60 animate-pulse scale-110" />
              <div className="relative rounded-full p-[2px] bg-gradient-to-tr from-red-500 to-orange-500">
                <Avatar className="w-9 h-9 border-2 border-background">
                  <AvatarImage src={item.avatar_url || undefined} alt={item.name} />
                  <AvatarFallback className="bg-muted text-foreground text-[10px]">
                    {item.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </button>
          ) : (
            <button
              key={`battle-${item.id}`}
              onClick={() => navigate(`/battle/${item.id}/theater`)}
              className="relative shrink-0 group"
              style={{ width: '60px', height: '40px' }}
              aria-label={`Watch live battle`}
            >
              {/* Stacked pair wrapped in shared gradient glow */}
              <span className="absolute inset-0 rounded-full bg-orange-500/40 animate-pulse scale-110 blur-sm" />

              {/* Barber 1 — left */}
              <div className="absolute left-0 top-0 rounded-full p-[2px] bg-gradient-to-tr from-red-500 to-orange-500 z-10">
                <Avatar className="w-9 h-9 border-2 border-background">
                  <AvatarImage src={item.b1_avatar || undefined} alt={item.b1_name} />
                  <AvatarFallback className="bg-muted text-foreground text-[10px]">
                    {item.b1_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Barber 2 — overlapping right */}
              <div className="absolute right-0 top-1 rounded-full p-[2px] bg-gradient-to-tr from-orange-500 to-yellow-500 z-20">
                <Avatar className="w-9 h-9 border-2 border-background">
                  <AvatarImage src={item.b2_avatar || undefined} alt={item.b2_name} />
                  <AvatarFallback className="bg-muted text-foreground text-[10px]">
                    {item.b2_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Crossed swords badge */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 z-30 w-4 h-4 rounded-full bg-primary border-2 border-background flex items-center justify-center shadow">
                <Swords className="w-2 h-2 text-primary-foreground" />
              </div>
            </button>
          )
        )}
      </div>
    </div>
  );
};
