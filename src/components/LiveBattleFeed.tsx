import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

const getCountryFlag = (countryCode: string | null): string => {
  if (!countryCode) return '🌍';

  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌍';
  }
};

export const LiveBattleFeed = () => {
  const navigate = useNavigate();
  const { isBarber } = useUserRole();

  const { data: liveBattles, refetch } = useQuery({
    queryKey: ['liveBattles'],
    queryFn: async () => {
      const { data: battles, error } = await supabase
        .from('battles')
        .select(`
          id,
          title,
          status,
          barber1_id,
          barber2_id,
          starts_at,
          voting_ends_at,
          youtube_stream_url
        `)
        .in('status', ['voting', 'upcoming'])
        .order('starts_at', { ascending: true })
        .limit(6);

      if (error) throw error;
      if (!battles || battles.length === 0) return [];

      const barberIds = [
        ...battles.map(b => b.barber1_id),
        ...battles.map(b => b.barber2_id)
      ].filter(Boolean);

      const { data: barbers } = await supabase
        .from('barber_profiles')
        .select('id, user_id, name, country_code')
        .in('user_id', barberIds);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, avatar_url')
        .in('user_id', barberIds);

      const battlesWithData = await Promise.all(
        battles.map(async (battle) => {
          const { data: voteResults } = await supabase
            .rpc('get_battle_vote_results', { _battle_id: battle.id });

          const barber1 = barbers?.find(b => b.user_id === battle.barber1_id);
          const barber2 = barbers?.find(b => b.user_id === battle.barber2_id);
          
          const barber1Profile = profiles?.find(p => p.user_id === battle.barber1_id);
          const barber2Profile = profiles?.find(p => p.user_id === battle.barber2_id);

          return {
            ...battle,
            barber1: barber1 ? { ...barber1, avatar_url: barber1Profile?.avatar_url } : null,
            barber2: barber2 ? { ...barber2, avatar_url: barber2Profile?.avatar_url } : null,
            votes: voteResults || []
          };
        })
      );

      return battlesWithData;
    },
    refetchInterval: 10000
  });

  useEffect(() => {
    const channel = supabase
      .channel('battle-votes-live')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'battle_votes'
      }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  if (!liveBattles || liveBattles.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl sm:text-2xl font-bold mb-2">No battles scheduled</h3>
        <p className="text-muted-foreground mb-6">
          Check back on Sunday for live battles!
        </p>
        {isBarber && (
          <Button onClick={() => navigate('/battles/create')}>
            Create the First Battle
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6">Live & Upcoming Battles</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {liveBattles.map((battle) => {
          const barber1Votes = battle.votes.find((v: any) => 
            v.submission_id === battle.barber1_id
          )?.weighted_votes || 0;
          const barber2Votes = battle.votes.find((v: any) => 
            v.submission_id === battle.barber2_id
          )?.weighted_votes || 0;

          return (
            <Card key={battle.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between mb-4">
                  <Badge variant={battle.status === 'voting' ? 'default' : 'secondary'}>
                    {battle.status === 'voting' ? '🔴 LIVE' : 'UPCOMING'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center">
                    <Avatar className="w-12 h-12 mx-auto mb-2">
                      <AvatarImage src={battle.barber1?.avatar_url} />
                      <AvatarFallback>
                        {battle.barber1?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-sm truncate">
                      {battle.barber1?.name || 'Unknown'}
                    </p>
                    <span className="text-2xl">
                      {getCountryFlag(battle.barber1?.country_code)}
                    </span>
                    <div className="text-primary font-bold mt-1">{barber1Votes}</div>
                    <div className="text-xs text-muted-foreground">votes</div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="text-2xl font-bold text-primary">VS</div>
                  </div>

                  <div className="text-center">
                    <Avatar className="w-12 h-12 mx-auto mb-2">
                      <AvatarImage src={battle.barber2?.avatar_url} />
                      <AvatarFallback>
                        {battle.barber2?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-sm truncate">
                      {battle.barber2?.name || 'Unknown'}
                    </p>
                    <span className="text-2xl">
                      {getCountryFlag(battle.barber2?.country_code)}
                    </span>
                    <div className="text-primary font-bold mt-1">{barber2Votes}</div>
                    <div className="text-xs text-muted-foreground">votes</div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => navigate(`/battles/${battle.id}`)}
                >
                  {battle.status === 'voting' ? 'Vote Now' : 'View Battle'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
