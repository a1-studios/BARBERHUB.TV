import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLiveSnapshot } from '@/hooks/useBarberLiveState';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LiveAvatar } from '@/components/barber/LiveAvatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Radio, Swords, Users } from 'lucide-react';
import Header from '@/components/Header';
import { BottomNavBar } from '@/components/BottomNavBar';

interface BattleRow {
  id: string;
  title: string | null;
  status: string;
  barber1_id: string;
  barber2_id: string;
  starts_at: string | null;
}

interface BarberMini {
  id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  country_code: string | null;
}

const LiveHub = () => {
  const navigate = useNavigate();
  const snapshot = useLiveSnapshot();

  const liveBarberUserIds = Object.keys(snapshot.broadcasts);
  const activeBattleIds = useMemo(
    () => Array.from(new Set(Object.values(snapshot.battles).map((b) => b.battleId))),
    [snapshot.battles],
  );

  const { data: liveBarbers = [] } = useQuery({
    queryKey: ['live-hub-barbers', liveBarberUserIds.sort().join(',')],
    enabled: liveBarberUserIds.length > 0,
    queryFn: async (): Promise<BarberMini[]> => {
      const [{ data: barbers }, { data: profiles }] = await Promise.all([
        supabase
          .from('barber_profiles')
          .select('id, user_id, name, country_code')
          .in('user_id', liveBarberUserIds),
        supabase
          .from('profiles')
          .select('user_id, avatar_url')
          .in('user_id', liveBarberUserIds),
      ]);
      return (barbers || []).map((b: any) => ({
        ...b,
        avatar_url: profiles?.find((p: any) => p.user_id === b.user_id)?.avatar_url ?? null,
      }));
    },
  });

  const { data: battles = [] } = useQuery({
    queryKey: ['live-hub-battles', activeBattleIds.sort().join(',')],
    enabled: activeBattleIds.length > 0,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('battles')
        .select('id, title, status, barber1_id, barber2_id, starts_at')
        .in('id', activeBattleIds);

      const allUserIds = Array.from(
        new Set((rows || []).flatMap((b: any) => [b.barber1_id, b.barber2_id]).filter(Boolean)),
      );

      const [{ data: barbers }, { data: profiles }] = await Promise.all([
        supabase
          .from('barber_profiles')
          .select('id, user_id, name, country_code')
          .in('user_id', allUserIds),
        supabase
          .from('profiles')
          .select('user_id, avatar_url')
          .in('user_id', allUserIds),
      ]);

      const lookup = (uid: string): BarberMini | null => {
        const b = barbers?.find((x: any) => x.user_id === uid);
        if (!b) return null;
        const p = profiles?.find((x: any) => x.user_id === uid);
        return { ...b, avatar_url: p?.avatar_url ?? null } as BarberMini;
      };

      return (rows || []).map((b: any) => ({
        ...(b as BattleRow),
        barber1: lookup(b.barber1_id),
        barber2: lookup(b.barber2_id),
      }));
    },
  });

  const nothingLive = liveBarbers.length === 0 && battles.length === 0;

  return (
    <main className="min-h-screen bg-background pb-24">
      <Header />



      {nothingLive && (
        <div className="px-6 py-24 text-center text-muted-foreground">
          <Radio className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nothing live right now. Check back soon.</p>
        </div>
      )}

      {/* Live Now — solo broadcasts */}
      {liveBarbers.length > 0 && (
        <section className="px-4 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-bold tracking-wide uppercase">Live Now</h2>
            <Badge variant="outline" className="ml-auto text-[10px]">
              {liveBarbers.length}
            </Badge>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {liveBarbers.map((b) => (
              <div key={b.id} className="flex flex-col items-center text-center">
                <LiveAvatar
                  barberUserId={b.user_id}
                  fallbackHref={`/barber/${b.user_id}`}
                  showLabel
                >
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={b.avatar_url || undefined} />
                    <AvatarFallback>{(b.name || 'B').charAt(0)}</AvatarFallback>
                  </Avatar>
                </LiveAvatar>
                <span className="mt-1 text-xs font-medium line-clamp-1">
                  {b.name || 'Barber'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Battles & Challenges */}
      {battles.length > 0 && (
        <section className="px-4 pt-8">
          <div className="flex items-center gap-2 mb-3">
            <Swords className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold tracking-wide uppercase">Active Challenges</h2>
            <Badge variant="outline" className="ml-auto text-[10px]">
              {battles.length}
            </Badge>
          </div>
          <div className="space-y-3">
            {battles.map((battle: any) => (
              <Card
                key={battle.id}
                className="bg-gradient-to-br from-primary/10 to-background border-primary/30 cursor-pointer hover:border-primary/60 transition"
                onClick={() => navigate(`/battle/${battle.id}/theater`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    {/* Barber 1 */}
                    <div className="flex-1 flex flex-col items-center text-center">
                      <LiveAvatar
                        barberUserId={battle.barber1?.user_id}
                        fallbackHref={`/barber/${battle.barber1?.user_id}`}
                      >
                        <Avatar className="w-14 h-14">
                          <AvatarImage src={battle.barber1?.avatar_url || undefined} />
                          <AvatarFallback>
                            {(battle.barber1?.name || 'B').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </LiveAvatar>
                      <span className="mt-1.5 text-xs font-semibold line-clamp-1">
                        {battle.barber1?.name || 'Barber 1'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-black text-primary">VS</span>
                      <Badge
                        variant="destructive"
                        className="mt-1 text-[9px] animate-pulse"
                      >
                        {battle.status === 'live' ? '● LIVE' : '● VOTING'}
                      </Badge>
                    </div>

                    {/* Barber 2 */}
                    <div className="flex-1 flex flex-col items-center text-center">
                      <LiveAvatar
                        barberUserId={battle.barber2?.user_id}
                        fallbackHref={`/barber/${battle.barber2?.user_id}`}
                      >
                        <Avatar className="w-14 h-14">
                          <AvatarImage src={battle.barber2?.avatar_url || undefined} />
                          <AvatarFallback>
                            {(battle.barber2?.name || 'B').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </LiveAvatar>
                      <span className="mt-1.5 text-xs font-semibold line-clamp-1">
                        {battle.barber2?.name || 'Barber 2'}
                      </span>
                    </div>
                  </div>

                  {battle.title && (
                    <p className="mt-3 text-center text-xs text-muted-foreground line-clamp-1">
                      {battle.title}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-primary font-semibold">
                    <Users className="w-3 h-3" />
                    Tap to join the arena
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default LiveHub;
