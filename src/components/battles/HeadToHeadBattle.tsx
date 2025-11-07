import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { UserVotePowerIndicator } from '@/components/UserVotePowerIndicator';
import { toast } from 'sonner';
import { Clock, Users, Trophy } from 'lucide-react';

interface Battle {
  id: string;
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
  voting_ends_at: string;
  creation1_id: string;
  creation2_id: string;
  barber1_id: string;
  barber2_id: string;
}

interface VoteResult {
  submission_id: string;
  weighted_votes: number;
  raw_votes: number;
}

interface Creation {
  id: string;
  media_url: string;
  title: string;
  description: string;
  barber_profiles: {
    name: string;
    user_id: string;
  };
}

interface HeadToHeadBattleProps {
  battle: Battle;
  onVote?: () => void;
}

export function HeadToHeadBattle({ battle, onVote }: HeadToHeadBattleProps) {
  const { user } = useAuth();
  const { isFan } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [creation1, setCreation1] = useState<Creation | null>(null);
  const [creation2, setCreation2] = useState<Creation | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteResults, setVoteResults] = useState<VoteResult[]>([]);

  useEffect(() => {
    fetchCreations();
    checkIfUserVoted();
    fetchVoteResults();
  }, [battle.id]);

  const fetchVoteResults = async () => {
    try {
      // Get weighted votes
      const { data: weightedData, error: weightedError } = await supabase.rpc('get_battle_vote_results', {
        _battle_id: battle.id
      });

      if (weightedError) throw weightedError;
      
      // Get raw vote counts
      const { data: rawData, error: rawError } = await supabase
        .from('battle_votes')
        .select('submission_id')
        .eq('battle_id', battle.id);
      
      if (rawError) throw rawError;
      
      // Count votes per submission
      const voteCounts: Record<string, number> = {};
      rawData?.forEach(vote => {
        voteCounts[vote.submission_id] = (voteCounts[vote.submission_id] || 0) + 1;
      });
      
      // Merge weighted and raw counts
      const results = (weightedData || []).map((r: any) => ({
        submission_id: r.submission_id,
        weighted_votes: r.weighted_votes,
        raw_votes: voteCounts[r.submission_id] || 0
      }));
      
      setVoteResults(results);
    } catch (error) {
      console.error('Error fetching vote results:', error);
    }
  };

  const fetchCreations = async () => {
    try {
      // Fetch both creations
      const { data: creationsData, error } = await supabase
        .from('creations')
        .select(`
          id,
          media_url,
          title,
          description,
          barber_profiles!inner (
            name,
            user_id
          )
        `)
        .in('id', [battle.creation1_id, battle.creation2_id]);

      if (error) throw error;

      if (creationsData) {
        const c1 = creationsData.find(c => c.id === battle.creation1_id);
        const c2 = creationsData.find(c => c.id === battle.creation2_id);
        setCreation1(c1 || null);
        setCreation2(c2 || null);
      }
    } catch (error) {
      console.error('Error fetching creations:', error);
    }
  };

  const checkIfUserVoted = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('battle_votes')
      .select('id')
      .eq('battle_id', battle.id)
      .eq('voter_id', user.id)
      .single();

    setHasVoted(!!data);
  };

  const handleVote = async (creationId: string) => {
    if (!user) return;

    // Check if user can vote (fans only)
    if (!isFan) {
      toast.error('Only fans can vote in battles');
      return;
    }

    if (hasVoted) {
      toast.error('You have already voted in this battle');
      return;
    }

    setLoading(true);
    try {
      // Check vote eligibility via PostgreSQL function
      const { data: canVote, error: eligibilityError } = await supabase
        .rpc('check_vote_eligibility', {
          battle_id_param: battle.id,
          creation_id_param: creationId
        });

      if (eligibilityError) throw eligibilityError;
      if (!canVote) {
        toast.error('You are not eligible to vote in this battle');
        return;
      }

      // Cast the vote
      const { error } = await supabase
        .from('battle_votes')
        .insert({
          battle_id: battle.id,
          voter_id: user.id,
          submission_id: creationId
        });

      if (error) throw error;

      toast.success('Vote cast successfully!');
      setHasVoted(true);
      fetchVoteResults(); // Refresh vote counts
      onVote?.();
    } catch (error: any) {
      console.error('Error voting:', error);
      toast.error(error.message || 'Failed to cast vote');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500';
      case 'voting': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const canVote = isFan && battle.status === 'voting' && !hasVoted;
  
  const getWeightedVotes = (creationId: string) => {
    const result = voteResults.find(r => r.submission_id === creationId);
    return result ? result.weighted_votes : 0;
  };
  
  const getRawVotes = (creationId: string) => {
    const result = voteResults.find(r => r.submission_id === creationId);
    return result ? result.raw_votes : 0;
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold">{battle.title}</h3>
            {user && <UserVotePowerIndicator />}
          </div>
          <Badge className={getStatusColor(battle.status)}>
            {battle.status.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Creation 1 */}
          <div className="space-y-4">
            {creation1 && (
              <>
                <div className="aspect-square rounded-lg overflow-hidden">
                  <img
                    src={creation1.media_url}
                    alt={creation1.title || 'Battle submission'}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>
                        {creation1.barber_profiles.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{creation1.barber_profiles.name}</span>
                  </div>
                  
                  {creation1.title && (
                    <h4 className="font-semibold">{creation1.title}</h4>
                  )}
                  
                  {creation1.description && (
                    <p className="text-sm text-muted-foreground">
                      {creation1.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-semibold">{getWeightedVotes(creation1.id)} points</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span className="text-xs text-muted-foreground">{getRawVotes(creation1.id)} votes</span>
                      </div>
                    </div>
                    
                    {canVote && (
                      <Button
                        onClick={() => handleVote(creation1.id)}
                        disabled={loading}
                        size="sm"
                      >
                        Vote
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center md:absolute md:left-1/2 md:transform md:-translate-x-1/2 md:z-10">
            <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center font-bold">
              VS
            </div>
          </div>

          {/* Creation 2 */}
          <div className="space-y-4">
            {creation2 && (
              <>
                <div className="aspect-square rounded-lg overflow-hidden">
                  <img
                    src={creation2.media_url}
                    alt={creation2.title || 'Battle submission'}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>
                        {creation2.barber_profiles.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{creation2.barber_profiles.name}</span>
                  </div>
                  
                  {creation2.title && (
                    <h4 className="font-semibold">{creation2.title}</h4>
                  )}
                  
                  {creation2.description && (
                    <p className="text-sm text-muted-foreground">
                      {creation2.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-semibold">{getWeightedVotes(creation2.id)} points</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span className="text-xs text-muted-foreground">{getRawVotes(creation2.id)} votes</span>
                      </div>
                    </div>
                    
                    {canVote && (
                      <Button
                        onClick={() => handleVote(creation2.id)}
                        disabled={loading}
                        size="sm"
                      >
                        Vote
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Battle Info */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              {battle.starts_at && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Started: {new Date(battle.starts_at).toLocaleDateString()}</span>
                </div>
              )}
              
              {battle.voting_ends_at && (
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  <span>Voting ends: {new Date(battle.voting_ends_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            
            <div className="text-right">
              <div className="flex flex-col gap-1">
                <span className="text-sm">Total: {voteResults.reduce((sum, r) => sum + r.weighted_votes, 0)} points</span>
                <span className="text-xs text-muted-foreground">
                  {voteResults.reduce((sum, r) => sum + r.raw_votes, 0)} votes cast
                </span>
              </div>
              {hasVoted && (
                <div className="text-green-600 font-medium mt-2">✓ You voted</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}