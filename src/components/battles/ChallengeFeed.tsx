import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Swords, DollarSign, Clock, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { AcceptChallengeModal } from './AcceptChallengeModal';
import { buildYouTubeWatchUrl } from '@/utils/youtubeHelpers';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';

interface Challenge {
  id: string;
  challenger_id: string;
  challenger_username: string;
  title: string;
  challenger_stream_url: string;
  challenger_youtube_video_id: string;
  bounty_amount: number | null;
  bounty_currency: string | null;
  bounty_description: string | null;
  created_at: string;
  status: string;
}

export const ChallengeFeed = () => {
  const { user } = useAuth();
  const { isBarber } = useUserRole();
  const queryClient = useQueryClient();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['open-challenges'],
    queryFn: async () => {
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      const { data, error } = await supabase
        .from('open_challenges')
        .select('*')
        .eq('status', 'waiting_for_opponent')
        .gte('created_at', twoHoursAgo.toISOString())
        .order('bounty_amount', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Challenge[];
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('open-challenges-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'open_challenges',
          filter: 'status=eq.waiting_for_opponent'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['open-challenges'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading challenges...</div>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="text-center py-12 bg-card/30 backdrop-blur-sm rounded-lg border border-border">
        <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-bold text-foreground mb-2">No Active Challenges</h3>
        <p className="text-muted-foreground">Be the first to issue a challenge! Challenges expire after 2 hours.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {challenges.map((challenge) => {
          const isOwnChallenge = user?.id === challenge.challenger_id;
          const canAccept = isBarber && !isOwnChallenge;

          const streamUrl = challenge.challenger_youtube_video_id 
            ? buildYouTubeWatchUrl(challenge.challenger_youtube_video_id)
            : challenge.challenger_stream_url;

          return (
            <Card 
              key={challenge.id}
              className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 p-6 relative overflow-hidden"
            >
              {/* Bounty Banner */}
              {challenge.bounty_amount && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-1 rounded-bl-lg">
                  <div className="flex items-center gap-1 text-white font-bold text-sm">
                    <DollarSign className="w-4 h-4" />
                    <span>${challenge.bounty_amount}</span>
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 pr-16">
                  <div className="flex items-center gap-2 mb-2">
                    <Swords className="w-5 h-5 text-primary" />
                    <span className="font-bold text-foreground">
                      {challenge.challenger_username}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-foreground mb-2">
                    {challenge.title}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {formatDistanceToNow(new Date(challenge.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>

              {/* Bounty Description */}
              {challenge.bounty_description && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    "{challenge.bounty_description}"
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button 
                    variant="outline" 
                    className="w-full"
                    size="sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Live Stream
                  </Button>
                </a>

                {canAccept && (
                  <Button
                    onClick={() => setSelectedChallenge(challenge)}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    size="sm"
                  >
                    <Swords className="w-4 h-4 mr-2" />
                    Accept Challenge
                  </Button>
                )}

                {isOwnChallenge && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    Waiting for opponent...
                  </div>
                )}

                {!isBarber && !isOwnChallenge && (
                  <div className="text-center text-xs text-muted-foreground py-2">
                    Only verified barbers can accept
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {selectedChallenge && (
        <AcceptChallengeModal
          challenge={selectedChallenge}
          isOpen={!!selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
        />
      )}
    </div>
  );
};
