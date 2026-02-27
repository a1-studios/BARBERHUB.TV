import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Swords, Coins, Clock, Users, Trophy, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { AcceptChallengeModal } from './AcceptChallengeModal';
import { formatDistanceToNow, differenceInSeconds } from 'date-fns';
import { useEffect, useState } from 'react';

interface Challenge {
  id: string;
  challenger_id: string;
  challenger_username: string;
  title: string;
  stake_amount: number | null;
  pot_total: number | null;
  donations_total: number | null;
  created_at: string;
  status: string;
  expires_at: string | null;
  duration_minutes: number | null;
}

const CountdownBadge = ({ expiresAt }: { expiresAt: string }) => {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, differenceInSeconds(new Date(expiresAt), new Date())));

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, differenceInSeconds(new Date(expiresAt), new Date()));
      setSecondsLeft(left);
      if (left <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (secondsLeft <= 0) return <Badge variant="destructive" className="text-[10px]">EXPIRED</Badge>;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isUrgent = secondsLeft < 300;

  return (
    <Badge variant="outline" className={`text-[10px] ${isUrgent ? 'border-destructive/50 text-destructive animate-pulse' : 'border-blue-500/50 text-blue-500'}`}>
      <Clock className="w-3 h-3 mr-1" />
      {mins}:{secs.toString().padStart(2, '0')}
    </Badge>
  );
};

export const ChallengeFeed = () => {
  const { user } = useAuth();
  const { isBarber } = useUserRole();
  const { tierName } = useSubscriptionLimits();
  const queryClient = useQueryClient();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  const isSilverPlus = ['silver', 'gold', 'diamond'].includes(tierName);

  // Fetch challenge jackpot pool
  const { data: jackpot } = useQuery({
    queryKey: ['challenge-jackpot'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_prize_pool')
        .select('total_pool_bb, total_challenges_completed')
        .eq('pool_year', new Date().getFullYear())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['open-challenges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('open_challenges')
        .select('*')
        .eq('status', 'waiting_for_opponent')
        .order('stake_amount', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as Challenge[]).filter(c => {
        if (!c.expires_at) return true;
        return new Date(c.expires_at) > new Date();
      });
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('open-challenges-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'open_challenges' }, () => {
        queryClient.invalidateQueries({ queryKey: ['open-challenges'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return (
    <div className="space-y-4">
      {/* Jackpot Pool Banner */}
      {jackpot && (jackpot.total_pool_bb || 0) > 0 && (
        <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <div>
                <h4 className="font-bold text-foreground text-sm">Challenge Jackpot Pool</h4>
                <p className="text-xs text-muted-foreground">{jackpot.total_challenges_completed || 0} challenges completed</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-xl text-yellow-500">
              <Coins className="w-5 h-5" />
              {(jackpot.total_pool_bb || 0).toLocaleString()} BB
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading challenges...</div>
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-12 bg-card/30 backdrop-blur-sm rounded-lg border border-border">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-bold text-foreground mb-2">No Active Challenges</h3>
          <p className="text-muted-foreground">Be the first to issue a challenge! Challenges expire after 1 hour.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map((challenge) => {
            const isOwnChallenge = user?.id === challenge.challenger_id;
            const canAccept = isBarber && !isOwnChallenge;

            return (
              <Card key={challenge.id} className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 p-6 relative overflow-hidden">
                {challenge.stake_amount && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-1 rounded-bl-lg">
                    <div className="flex items-center gap-1 text-white font-bold text-sm">
                      <Coins className="w-4 h-4" />
                      <span>{challenge.stake_amount} BB</span>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-16">
                    <div className="flex items-center gap-2 mb-2">
                      <Swords className="w-5 h-5 text-primary" />
                      <span className="font-bold text-foreground">{challenge.challenger_username}</span>
                    </div>
                    <h4 className="text-lg font-bold text-foreground mb-2">{challenge.title}</h4>
                    <div className="flex items-center gap-2">
                      {challenge.expires_at && <CountdownBadge expiresAt={challenge.expires_at} />}
                    </div>
                  </div>
                </div>

                <Badge variant="outline" className="mb-3 text-[10px] border-yellow-500/40 text-yellow-500/80">UNOFFICIAL</Badge>

                {challenge.stake_amount && (
                  <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Stake to match:</span>
                      <span className="font-bold text-yellow-500">{challenge.stake_amount} BB</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Total pot:</span>
                      <span className="font-bold text-foreground">{(challenge.stake_amount || 0) * 2} BB</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {canAccept && isSilverPlus && (
                    <Button onClick={() => setSelectedChallenge(challenge)} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" size="sm">
                      <Swords className="w-4 h-4 mr-2" />
                      Match {challenge.stake_amount} BB & Accept
                    </Button>
                  )}

                  {canAccept && !isSilverPlus && (
                    <div className="flex items-center gap-2 text-center text-xs text-muted-foreground py-2 bg-muted/30 rounded-lg px-3">
                      <Lock className="w-4 h-4 flex-shrink-0" />
                      <span>Silver+ subscription required to accept</span>
                    </div>
                  )}

                  {isOwnChallenge && (
                    <div className="text-center text-sm text-muted-foreground py-2">
                      Waiting for opponent to match your stake...
                    </div>
                  )}

                  {!isBarber && !isOwnChallenge && (
                    <div className="text-center text-xs text-muted-foreground py-2">
                      Only barbers can accept challenges
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedChallenge && (
        <AcceptChallengeModal challenge={selectedChallenge} isOpen={!!selectedChallenge} onClose={() => setSelectedChallenge(null)} />
      )}
    </div>
  );
};
