import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Swords, DollarSign, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { buildYouTubeWatchUrl } from '@/utils/youtubeHelpers';
import { useState } from 'react';
import { AcceptChallengeModal } from './AcceptChallengeModal';

interface LiveStream {
  id: string;
  title: string;
  barber1_id: string;
  barber2_id: string | null;
  barber1_youtube_video_id: string;
  barber2_youtube_video_id: string | null;
  prize_amount: number;
  status: string;
  created_at: string;
  barber1_live_viewers: number;
  barber2_live_viewers: number;
  barber1?: {
    name: string;
    user_id: string;
  };
  barber2?: {
    name: string;
    user_id: string;
  };
  challenge?: Array<{
    id: string;
    challenger_username: string;
    bounty_description: string | null;
  }>;
}

export const LiveBarberStreams = () => {
  const { user } = useAuth();
  const { isBarber } = useUserRole();
  const [selectedChallenge, setSelectedChallenge] = useState<{ id: string; challenger_username: string; title: string } | null>(null);

  const { data: liveStreams, isLoading } = useQuery({
    queryKey: ['live-barber-streams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battles')
        .select(`
          *,
          barber1:barber_profiles!battles_barber1_id_fkey(name, user_id),
          barber2:barber_profiles!battles_barber2_id_fkey(name, user_id),
          challenge:open_challenges(id, challenger_username, bounty_description)
        `)
        .in('status', ['waiting_for_opponent', 'active', 'voting'])
        .not('barber1_youtube_video_id', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LiveStream[];
    },
    refetchInterval: 5000,
    enabled: !!user
  });

  if (!user || isLoading) {
    return null;
  }

  if (!liveStreams || liveStreams.length === 0) {
    return null;
  }

  return (
    <section className="py-12 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <h2 className="text-3xl font-bold text-foreground">
              LIVE NOW
            </h2>
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {liveStreams.length} {liveStreams.length === 1 ? 'Barber' : 'Barbers'} Streaming
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Watch live battles and accept open challenges
          </p>
        </div>

        {/* Streams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {liveStreams.map((stream) => {
            const isOwnStream = user?.id === stream.barber1_id;
            const canAccept = isBarber && !isOwnStream && stream.status === 'waiting_for_opponent';
            const isWaitingForOpponent = stream.status === 'waiting_for_opponent';
            const challenge = Array.isArray(stream.challenge) ? stream.challenge[0] : stream.challenge;

            return (
              <Card 
                key={stream.id}
                className="overflow-hidden hover:shadow-lg transition-all relative group"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-muted">
                  <img 
                    src={`https://img.youtube.com/vi/${stream.barber1_youtube_video_id}/maxresdefault.jpg`}
                    alt={stream.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://img.youtube.com/vi/${stream.barber1_youtube_video_id}/hqdefault.jpg`;
                    }}
                  />
                  
                  {/* Live Badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-2 px-2 py-1 bg-red-600 rounded text-white text-xs font-bold">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>

                  {/* Prize Badge */}
                  {stream.prize_amount > 0 && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-500 to-orange-500 px-2 py-1 rounded text-white text-xs font-bold flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {stream.prize_amount}
                    </div>
                  )}

                  {/* Viewer Count */}
                  {stream.barber1_live_viewers > 0 && (
                    <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-white text-xs flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {stream.barber1_live_viewers}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-foreground line-clamp-2 mb-1">
                      {stream.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {stream.barber1?.name || 'Unknown Barber'}
                    </p>
                  </div>

                  {/* Bounty Description */}
                  {challenge?.bounty_description && (
                    <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs">
                      <p className="text-yellow-600 dark:text-yellow-400 line-clamp-2">
                        "{challenge.bounty_description}"
                      </p>
                    </div>
                  )}

                  {/* Status Badge */}
                  {isWaitingForOpponent ? (
                    <Badge variant="outline" className="border-orange-500 text-orange-500">
                      <Swords className="w-3 h-3 mr-1" />
                      Open Challenge
                    </Badge>
                  ) : stream.barber2 ? (
                    <Badge variant="outline" className="border-green-500 text-green-500">
                      Battle In Progress
                    </Badge>
                  ) : null}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <a
                      href={buildYouTubeWatchUrl(stream.barber1_youtube_video_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Watch
                      </Button>
                    </a>

                    {canAccept && challenge && (
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-600"
                        onClick={() => setSelectedChallenge({
                          id: challenge.id,
                          challenger_username: challenge.challenger_username,
                          title: stream.title
                        })}
                      >
                        <Swords className="w-4 h-4 mr-2" />
                        Accept
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Accept Challenge Modal */}
      {selectedChallenge && (
        <AcceptChallengeModal
          challenge={selectedChallenge}
          isOpen={!!selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
        />
      )}
    </section>
  );
};
