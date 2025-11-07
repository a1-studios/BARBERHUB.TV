
import { BackButton } from '@/components/ui/BackButton';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useRealtimeBattleViewers } from '@/hooks/useRealtimeBattleViewers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Calendar, MapPin, Trophy, Users, Upload, Vote } from 'lucide-react';
import { format } from 'date-fns';
import VotingCard from '@/components/VotingCard';
import { VotingCountdown } from '@/components/battles/VotingCountdown';
import { BattleResults } from '@/components/battles/BattleResults';
import { LiveViewerComparison } from '@/components/battles/LiveViewerComparison';
import { LiveBattleIndicator } from '@/components/battles/LiveBattleIndicator';
import { BattleStatsCard } from '@/components/battles/BattleStatsCard';
import { useEffect } from 'react';

const BattleDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { isBarber, isFan } = useUserRole();
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  if (!id) {
    return <Navigate to="/battles" replace />;
  }

  // Get live viewer data - MUST be called before any conditional returns
  // The hook itself handles the case where id is undefined
  const viewerData = useRealtimeBattleViewers(id || '');

  // Fetch battle details
  const { data: battle, isLoading: battleLoading } = useQuery({
    queryKey: ['battle', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch participants
  const { data: participants } = useQuery({
    queryKey: ['battle-participants', id],
    queryFn: async () => {
      // Fetch participants without profile join
      const { data: participantsData, error } = await supabase
        .from('battle_participants')
        .select('*')
        .eq('battle_id', id);
      
      if (error) throw error;
      if (!participantsData || participantsData.length === 0) return [];

      // Fetch public profiles for all participants
      const userIds = participantsData.map(p => p.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .rpc('get_multiple_public_profiles', { user_ids: userIds });
      
      if (profilesError) throw profilesError;

      // Merge participant data with profiles
      return participantsData.map(participant => ({
        ...participant,
        profiles: profilesData?.find(p => p.user_id === participant.user_id) || null
      }));
    }
  });

  // Fetch submissions
  const { data: submissions } = useQuery({
    queryKey: ['battle-submissions', id],
    queryFn: async () => {
      // Fetch submissions without profile join
      const { data: submissionsData, error } = await supabase
        .from('battle_submissions')
        .select('*')
        .eq('battle_id', id);
      
      if (error) throw error;
      if (!submissionsData || submissionsData.length === 0) return [];

      // Fetch public profiles for all submission creators
      const userIds = submissionsData.map(s => s.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .rpc('get_multiple_public_profiles', { user_ids: userIds });
      
      if (profilesError) throw profilesError;

      // Merge submission data with profiles
      return submissionsData.map(submission => ({
        ...submission,
        profiles: profilesData?.find(p => p.user_id === submission.user_id) || null
      }));
    }
  });

  // Fetch all public profiles for submissions (for results display)
  const { data: submissionProfiles } = useQuery({
    queryKey: ['submission-profiles', id],
    queryFn: async () => {
      if (!submissions || submissions.length === 0) return [];
      
      const userIds = [...new Set(submissions.map(s => s.user_id))];
      const { data, error } = await supabase
        .rpc('get_multiple_public_profiles', { user_ids: userIds });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!submissions && submissions.length > 0
  });

  // Fetch vote results
  const { data: voteResults } = useQuery({
    queryKey: ['battle-vote-results', id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_battle_vote_results', {
        _battle_id: id
      });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch user's vote
  const { data: userVote } = useQuery({
    queryKey: ['user-vote', id, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('battle_votes')
        .select('submission_id')
        .eq('battle_id', id)
        .eq('voter_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data?.submission_id || null;
    },
    enabled: !!user?.id
  });

  // Join battle mutation (barbers only)
  const joinBattleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('battle_participants')
        .insert({
          battle_id: id,
          user_id: user!.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Successfully joined the battle!');
      queryClient.invalidateQueries({ queryKey: ['battle-participants', id] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to join battle');
    }
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      // Delete existing vote if any
      if (userVote) {
        await supabase
          .from('battle_votes')
          .delete()
          .eq('battle_id', id)
          .eq('voter_id', user!.id);
      }

      // Insert new vote
      const { error } = await supabase
        .from('battle_votes')
        .insert({
          battle_id: id,
          submission_id: submissionId,
          voter_id: user!.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Vote cast successfully!');
      queryClient.invalidateQueries({ queryKey: ['user-vote', id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['battle-vote-results', id] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cast vote');
    }
  });

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('battle-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'battles',
        filter: `id=eq.${id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['battle', id] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'battle_participants',
        filter: `battle_id=eq.${id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['battle-participants', id] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'battle_submissions',
        filter: `battle_id=eq.${id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['battle-submissions', id] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'battle_votes',
        filter: `battle_id=eq.${id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-vote', id, user?.id] });
        queryClient.invalidateQueries({ queryKey: ['battle-vote-results', id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user?.id, queryClient]);

  if (battleLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!battle) {
    return <Navigate to="/battles" replace />;
  }

  const isParticipant = participants?.some(p => p.user_id === user?.id);
  const isOrganizer = battle.organizer_id === user?.id;
  const canJoin = isBarber && !isParticipant && battle.status === 'upcoming';
  const canVote = user && battle.status === 'voting';
  const totalWeightedVotes = voteResults?.reduce((sum, result) => sum + result.weighted_votes, 0) || 0;
  
  // Check if battle has live viewers
  const isLiveBattle = battle.status === 'voting';
  const hasLiveViewers = isLiveBattle && (viewerData.barber1 > 0 || viewerData.barber2 > 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <BackButton to="/battles" />
      
      {/* Live Battle Indicator */}
      {isLiveBattle && (
        <div className="mb-6 flex justify-center">
          <LiveBattleIndicator />
        </div>
      )}
      
      {/* Live Viewer Stats */}
      {hasLiveViewers && submissions && submissions.length >= 2 && (
        <div className="mb-6 space-y-4">
          <LiveViewerComparison
            barber1Name={
              submissionProfiles?.find(p => p.user_id === submissions[0]?.user_id)?.display_name ||
              'Barber 1'
            }
            barber2Name={
              submissionProfiles?.find(p => p.user_id === submissions[1]?.user_id)?.display_name ||
              'Barber 2'
            }
            barber1Viewers={viewerData.barber1}
            barber2Viewers={viewerData.barber2}
            barber1Peak={viewerData.peak1}
            barber2Peak={viewerData.peak2}
            lastUpdate={viewerData.lastUpdate}
          />
          
          <BattleStatsCard
            totalViewers={viewerData.barber1 + viewerData.barber2}
            peakViewers={Math.max(viewerData.peak1, viewerData.peak2)}
          />
        </div>
      )}
      {/* Battle Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {battle.cover_image_url && (
            <div className="lg:w-1/3">
              <img
                src={battle.cover_image_url}
                alt={battle.title}
                className="w-full h-64 lg:h-80 object-cover rounded-lg"
              />
            </div>
          )}
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={
                battle.status === 'upcoming' ? 'secondary' :
                battle.status === 'active' ? 'default' :
                battle.status === 'voting' ? 'destructive' :
                'outline'
              }>
                {battle.status.toUpperCase()}
              </Badge>
              {battle.category && (
                <Badge variant="outline">{battle.category}</Badge>
              )}
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              {battle.title}
            </h1>

            {battle.description && (
              <p className="text-muted-foreground mb-6 text-lg">
                {battle.description}
              </p>
            )}

            {/* Forfeit Warning */}
            {battle.forfeit_reason && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="text-destructive">⚠️</div>
                  <div>
                    <h3 className="font-semibold text-destructive mb-1">Battle Forfeited</h3>
                    <p className="text-sm text-muted-foreground">
                      {battle.forfeit_reason === 'no_submission_barber1' && 'Barber 1 did not submit a video by the deadline'}
                      {battle.forfeit_reason === 'no_submission_barber2' && 'Barber 2 did not submit a video by the deadline'}
                      {battle.forfeit_reason === 'no_submission_both' && 'Neither barber submitted a video by the deadline'}
                      {battle.forfeit_winner_id && ` - Winner by forfeit awarded 3 points`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {battle.starts_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Starts: {format(new Date(battle.starts_at), 'PPP')}</span>
                </div>
              )}
              
              {battle.ends_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Ends: {format(new Date(battle.ends_at), 'PPP')}</span>
                </div>
              )}

              {battle.voting_ends_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Vote className="w-4 h-4" />
                  <span>Voting ends: {format(new Date(battle.voting_ends_at), 'PPP')}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{participants?.length || 0} participants</span>
                {battle.max_participants && (
                  <span>/ {battle.max_participants} max</span>
                )}
              </div>

              {battle.prize_amount > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="w-4 h-4" />
                  <span>Prize: {battle.currency} {battle.prize_amount}</span>
                </div>
              )}
            </div>

            {/* Role-based Actions */}
            <div className="flex gap-4">
              {/* Barber Actions */}
              {isBarber && (
                <>
                  {canJoin && (
                    <Button
                      onClick={() => joinBattleMutation.mutate()}
                      disabled={joinBattleMutation.isPending}
                      size="lg"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Join Battle
                    </Button>
                  )}
                  
                  {isParticipant && battle.status === 'active' && (
                    <Button size="lg" asChild>
                      <a href={`/battles/${id}/submit`}>
                        <Upload className="w-4 h-4 mr-2" />
                        Submit Entry
                      </a>
                    </Button>
                  )}
                </>
              )}

              {/* Fan Message */}
              {isFan && battle.status === 'upcoming' && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    🎬 Get ready to vote! This battle will open for voting once entries are submitted.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Voting Countdown */}
      {battle.status === 'voting' && battle.voting_ends_at && (
        <div className="mb-8">
          <VotingCountdown
            battleId={id}
            votingEndsAt={battle.voting_ends_at}
            status={battle.status}
            isOrganizer={isOrganizer}
          />
        </div>
      )}

      {/* Battle Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Battle Results (Completed) */}
          {battle.status === 'completed' && submissions && submissions.length > 0 ? (
            <BattleResults
              battle={battle}
              submissions={submissions}
              voteResults={voteResults || []}
              profiles={submissionProfiles || []}
            />
          ) : battle.status === 'voting' && submissions && submissions.length > 0 ? (
            /* Voting Phase */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  Vote for Your Favorite
                </h2>
                {totalWeightedVotes > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {totalWeightedVotes} total weighted votes
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {submissions.map((submission) => (
                  <VotingCard
                    key={submission.id}
                    submission={submission}
                    voteResults={voteResults || []}
                    userVote={userVote}
                    totalWeightedVotes={totalWeightedVotes}
                    canVote={!!canVote}
                    isVoting={voteMutation.isPending}
                    onVote={(submissionId) => voteMutation.mutate(submissionId)}
                  />
                ))}
              </div>
            </div>
          ) : submissions && submissions.length > 0 ? (
            /* Other Statuses with Submissions */
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Submissions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {submissions.map((submission) => (
                  <VotingCard
                    key={submission.id}
                    submission={submission}
                    voteResults={voteResults || []}
                    userVote={userVote}
                    totalWeightedVotes={totalWeightedVotes}
                    canVote={false}
                    isVoting={false}
                    onVote={() => {}}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* No Submissions */
            <div className="text-center py-12">
              <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold text-white mb-2">No submissions yet</h3>
              <p className="text-muted-foreground">
                {isParticipant && battle.status === 'active' 
                  ? "Be the first to submit your entry!"
                  : "Participants will submit their entries soon."
                }
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Rules */}
          {battle.rules && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {battle.rules}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Participants */}
          {participants && participants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Participants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3">
                      {participant.profiles?.avatar_url ? (
                        <img
                          src={participant.profiles.avatar_url}
                          alt={participant.profiles?.display_name || 'Participant'}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {participant.profiles?.display_name || 'Anonymous Barber'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Joined {format(new Date(participant.joined_at), 'MMM d')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BattleDetails;
