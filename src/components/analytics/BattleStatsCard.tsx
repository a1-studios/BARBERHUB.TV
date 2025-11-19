import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp, Zap, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const BattleStatsCard = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['battleStats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get barber profile ID
      const { data: barberProfile } = await supabase
        .from('barber_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!barberProfile) return null;

      // Get battle statistics
      const { data: battles } = await supabase
        .from('battles')
        .select('id, status, winner_id, barber1_id, barber2_id')
        .or(`barber1_id.eq.${barberProfile.id},barber2_id.eq.${barberProfile.id}`);

      const totalBattles = battles?.length || 0;
      const completedBattles = battles?.filter(b => b.status === 'completed') || [];
      const wins = completedBattles.filter(b => b.winner_id === user.id).length;
      const losses = completedBattles.length - wins;
      const winRate = completedBattles.length > 0 ? (wins / completedBattles.length) * 100 : 0;

      // Get total votes received
      const { data: submissions } = await supabase
        .from('battle_submissions')
        .select('id')
        .eq('user_id', user.id);

      const submissionIds = submissions?.map(s => s.id) || [];
      const { count: totalVotes } = await supabase
        .from('battle_votes')
        .select('*', { count: 'exact', head: true })
        .in('submission_id', submissionIds);

      return {
        totalBattles,
        wins,
        losses,
        winRate: Math.round(winRate),
        totalVotes: totalVotes || 0
      };
    },
    enabled: !!user?.id
  });

  const statCards = [
    {
      icon: Zap,
      label: 'Total Battles',
      value: stats?.totalBattles || 0,
      color: 'text-blue-500'
    },
    {
      icon: Trophy,
      label: 'Wins',
      value: stats?.wins || 0,
      color: 'text-green-500'
    },
    {
      icon: Target,
      label: 'Win Rate',
      value: `${stats?.winRate || 0}%`,
      color: 'text-yellow-500'
    },
    {
      icon: TrendingUp,
      label: 'Total Votes',
      value: stats?.totalVotes || 0,
      color: 'text-purple-500'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Battle Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
              <stat.icon className={`w-8 h-8 mb-2 ${stat.color}`} />
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
