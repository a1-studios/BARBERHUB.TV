import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeBattleViewers } from '@/hooks/useRealtimeBattleViewers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Users, Eye } from 'lucide-react';

import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/battles/AnimatedCounter';
import { BattleCard } from '@/components/battles/BattleCard';
import { BattleWindowTimer } from '@/components/BattleWindowTimer';
import { SignatureHeader } from '@/components/shared/SignatureHeader';

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
          stream_url
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

      // Filter out battles with incomplete data
      return battlesWithData.filter(battle => 
        battle.barber1 && 
        battle.barber2 && 
        battle.barber1.name && 
        battle.barber2.name &&
        battle.barber1_id &&
        battle.barber2_id
      );
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
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <SignatureHeader title="Battles" subtitle="ACTIVE BATTLES" className="" />
        <BattleWindowTimer />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {liveBattles.map((battle) => {
          const barber1Votes = battle.votes.find((v: any) => 
            v.submission_id === battle.barber1_id
          )?.weighted_votes || 0;
          const barber2Votes = battle.votes.find((v: any) => 
            v.submission_id === battle.barber2_id
          )?.weighted_votes || 0;

          return (
            <BattleCard
              key={battle.id}
              battleId={battle.id}
              status={battle.status}
              barber1={battle.barber1}
              barber2={battle.barber2}
              barber1Votes={barber1Votes}
              barber2Votes={barber2Votes}
              onViewBattle={() => navigate(`/battles/${battle.id}`)}
            />
          );
        })}
      </div>
    </div>
  );
};
