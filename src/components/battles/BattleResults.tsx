import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Users, Award, Zap, ArrowRight, Clock, Handshake } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BattleResultsProps {
  battle: any;
  submissions: any[];
  voteResults: any[];
  profiles: any[];
}

export const BattleResults = ({ battle, submissions, voteResults, profiles }: BattleResultsProps) => {
  const { isVerified, isFan } = useUserProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const totalWeightedVotes = voteResults?.reduce((sum, result) => sum + result.weighted_votes, 0) || 0;
  
  const isDraw = !battle.winner_id && battle.status === 'completed';

  // Sort submissions by votes (highest first)
  const sortedSubmissions = [...submissions].sort((a, b) => {
    const aVotes = voteResults?.find(v => v.submission_id === a.id)?.weighted_votes || 0;
    const bVotes = voteResults?.find(v => v.submission_id === b.id)?.weighted_votes || 0;
    return bVotes - aVotes;
  });

  // Check if current user has a pending payout
  const { data: pendingPayouts } = useQuery({
    queryKey: ['pendingPayouts', battle.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('pending_payouts')
        .select('*')
        .eq('battle_id', battle.id)
        .eq('status', 'pending');
      return data || [];
    },
    enabled: battle.status === 'completed',
  });

  const getProfile = (userId: string) => {
    return profiles?.find(p => p.user_id === userId);
  };

  const getVotePercentage = (submissionId: string) => {
    const votes = voteResults?.find(v => v.submission_id === submissionId)?.weighted_votes || 0;
    return totalWeightedVotes > 0 ? Math.round((votes / totalWeightedVotes) * 100) : 0;
  };

  const getWeightedVotes = (submissionId: string) => {
    return voteResults?.find(v => v.submission_id === submissionId)?.weighted_votes || 0;
  };

  const getDaysUntilRelease = (releaseDate: string) => {
    const now = new Date();
    const release = new Date(releaseDate);
    const diff = Math.ceil((release.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const winner = sortedSubmissions[0];
  const winnerProfile = winner ? getProfile(winner.user_id) : null;
  const winnerVotes = winner ? getWeightedVotes(winner.id) : 0;
  const winnerPercentage = winner ? getVotePercentage(winner.id) : 0;

  return (
    <div className="space-y-6">
      {/* Draw / Winner Announcement */}
      {isDraw ? (
        <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/10">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Handshake className="w-10 h-10 text-white" />
                </div>
              </div>
              <div>
                <Badge className="mb-2 bg-amber-500 text-black">Draw</Badge>
                <h2 className="text-3xl font-bold text-foreground mb-2">It's a Draw!</h2>
                <p className="text-lg text-muted-foreground">
                  Both barbers tied with {winnerPercentage}% of votes each
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : winner && (
        <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center animate-pulse">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
              </div>
              <div>
                <Badge variant="default" className="mb-2">Winner</Badge>
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  {winnerProfile?.display_name || 'Anonymous Barber'}
                </h2>
                <p className="text-lg text-muted-foreground">
                  {winnerPercentage}% of votes ({winnerVotes} weighted votes)
                </p>
              </div>
              {winnerProfile?.avatar_url && (
                <div className="flex justify-center">
                  <Avatar className="w-24 h-24 border-4 border-primary">
                    <AvatarImage src={winnerProfile.avatar_url} />
                    <AvatarFallback>{winnerProfile.display_name?.[0] || 'W'}</AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Payout Indicator */}
      {pendingPayouts && pendingPayouts.length > 0 && (
        <Card className="border border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Payouts Pending</p>
                {pendingPayouts.map((p: any) => (
                  <p key={p.id} className="text-sm text-muted-foreground">
                    {p.amount_bb} BB — releases in {getDaysUntilRelease(p.scheduled_release_at)} days
                    <Badge variant="outline" className="ml-2 text-[10px]">{p.payout_type.replace('battle_', '')}</Badge>
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Final Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {sortedSubmissions.map((submission, index) => {
            const profile = getProfile(submission.user_id);
            const votes = getWeightedVotes(submission.id);
            const percentage = getVotePercentage(submission.id);
            const isWinner = index === 0 && !isDraw;

            return (
              <div key={submission.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      {isDraw ? (
                        <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                          <Handshake className="w-4 h-4 text-amber-400" />
                        </div>
                      ) : isWinner ? (
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold">#{index + 1}</span>
                        </div>
                      )}
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback>{profile?.display_name?.[0] || 'B'}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">
                          {profile?.display_name || 'Anonymous Barber'}
                        </p>
                        {isDraw && <Badge className="text-xs bg-amber-500 text-black">Draw</Badge>}
                        {isWinner && <Badge variant="default" className="text-xs">Winner</Badge>}
                      </div>
                      {submission.title && (
                        <p className="text-sm text-muted-foreground truncate">{submission.title}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{percentage}%</p>
                    <p className="text-xs text-muted-foreground">{votes} votes</p>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Total Votes Cast</span>
              </div>
              <span className="font-semibold text-foreground">{totalWeightedVotes}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tournament Info */}
      {battle.is_tournament_match && (
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Award className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Tournament Match</p>
                <p className="text-sm text-muted-foreground">
                  {isDraw ? 'Both barbers received +1 season point' : 'Points have been awarded and standings updated'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Upsell */}
      {isFan && !isVerified && (
        <Card className="border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-amber-600/5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                  <Zap className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg mb-1">You voted with 1x power</p>
                  <p className="text-sm text-muted-foreground">
                    Get <span className="text-yellow-500 font-semibold">3x vote power</span> with verification or subscription
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/portal')}
                className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500"
              >
                Unlock 3x Power
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
