import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VideoSubmissionModal } from '@/components/battles/VideoSubmissionModal';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Upload, Eye, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MyBattlesSectionProps {
  userId: string;
}

interface Battle {
  id: string;
  title: string;
  status: string;
  category: string | null;
  starts_at: string | null;
  voting_ends_at: string | null;
  barber1_id: string;
  barber2_id: string;
  barber_1_video_url: string | null;
  barber_2_video_url: string | null;
  barber1: Array<{
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  }>;
  barber2: Array<{
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  }>;
  battle_submissions: Array<{
    user_id: string;
    youtube_vod_url: string | null;
    status: string;
  }>;
}

export const MyBattlesSection = ({ userId }: MyBattlesSectionProps) => {
  const [selectedBattle, setSelectedBattle] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: myBattles, isLoading, refetch } = useQuery({
    queryKey: ['my-battles', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battles')
        .select(`
          *,
          barber1:profiles!battles_barber1_id_fkey(user_id, display_name, avatar_url),
          barber2:profiles!battles_barber2_id_fkey(user_id, display_name, avatar_url),
          battle_submissions(user_id, youtube_vod_url, status)
        `)
        .or(`barber1_id.eq.${userId},barber2_id.eq.${userId}`)
        .in('status', ['awaiting_submissions', 'voting', 'active'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Battle[];
    },
    enabled: !!userId
  });

  // Separate active and voting battles
  const activeBattles = myBattles?.filter(b => b.status === 'awaiting_submissions' || b.status === 'active') || [];
  const votingBattles = myBattles?.filter(b => b.status === 'voting') || [];

  const getOpponentInfo = (battle: Battle) => {
    const isBarber1 = battle.barber1_id === userId;
    const opponent = isBarber1 ? battle.barber2 : battle.barber1;
    return opponent[0] || { user_id: '', display_name: 'Unknown', avatar_url: null };
  };

  const hasUserSubmitted = (battle: Battle) => {
    return battle.battle_submissions.some(sub => sub.user_id === userId && sub.youtube_vod_url);
  };

  const hasOpponentSubmitted = (battle: Battle) => {
    const opponent = getOpponentInfo(battle);
    return battle.battle_submissions.some(sub => sub.user_id === opponent.user_id && sub.youtube_vod_url);
  };

  const handleSubmissionSuccess = () => {
    refetch();
    setSelectedBattle(null);
    toast({
      title: "Success!",
      description: "Your video has been submitted successfully.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!myBattles || myBattles.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold mb-2">No Active Battles</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Register for an official tournament to start competing, or create an unofficial battle for practice.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={() => navigate('/portal')}>
              <Trophy className="w-4 h-4 mr-2" />
              Enter Tournament Portal
            </Button>
            <Button variant="outline" onClick={() => navigate('/battles/create')} className="text-sm">
              Create Unofficial Battle
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Battles - Awaiting Submissions */}
      {activeBattles.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Pending Submissions
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {activeBattles.map(battle => {
              const opponent = getOpponentInfo(battle);
              const userSubmitted = hasUserSubmitted(battle);
              const opponentSubmitted = hasOpponentSubmitted(battle);

              return (
                <Card key={battle.id} className="border-2 border-primary/20">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">{battle.category || 'General'}</Badge>
                      {battle.starts_at && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(battle.starts_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-lg">
                      You vs. {opponent.display_name || 'Unknown Barber'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Submission Status */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Your Submission:</span>
                        {userSubmitted ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Submitted
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Opponent:</span>
                        {opponentSubmitted ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Submitted
                          </Badge>
                        ) : (
                          <Badge variant="outline">Waiting...</Badge>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {!userSubmitted ? (
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={() => setSelectedBattle(battle.id)}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Submit Your Video
                      </Button>
                    ) : opponentSubmitted ? (
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700" 
                        size="lg"
                        onClick={() => navigate(`/battles/${battle.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Battle Arena
                      </Button>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">
                          ✅ Video submitted! Waiting for {opponent.display_name || 'opponent'}...
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Voting will begin once they submit their video
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Battles Currently in Voting */}
      {votingBattles.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-500" />
            Live for Voting
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {votingBattles.map(battle => {
              const opponent = getOpponentInfo(battle);

              return (
                <Card key={battle.id} className="border-2 border-green-500/50">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-green-500 hover:bg-green-600">🔴 VOTING LIVE</Badge>
                      <Badge variant="outline">{battle.category || 'General'}</Badge>
                    </div>
                    <CardTitle className="text-lg">
                      You vs. {opponent.display_name || 'Unknown Barber'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {battle.voting_ends_at && (
                      <div className="text-sm text-muted-foreground">
                        <Clock className="inline h-4 w-4 mr-1" />
                        Voting ends: {new Date(battle.voting_ends_at).toLocaleDateString()}
                      </div>
                    )}
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => navigate(`/battles/${battle.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Battle Arena
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Video Submission Modal */}
      {selectedBattle && (
        <VideoSubmissionModal
          battleId={selectedBattle}
          isOpen={!!selectedBattle}
          onClose={() => setSelectedBattle(null)}
          onSuccess={handleSubmissionSuccess}
        />
      )}
    </div>
  );
};
