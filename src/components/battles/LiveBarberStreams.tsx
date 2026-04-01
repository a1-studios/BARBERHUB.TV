import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Swords, DollarSign, Users, Radio, Heart, UserPlus, UserCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useState, useEffect } from 'react';
import { AcceptChallengeModal } from './AcceptChallengeModal';
import { DonationModal } from '@/components/DonationModal';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface LiveStream {
  id: string;
  title: string;
  barber1_id: string;
  barber2_id: string | null;
  prize_amount: number;
  status: string;
  created_at: string;
  barber1_live_viewers: number;
  barber2_live_viewers: number;
  stream_url: string | null;
  barber_1_video_url: string | null;
  barber1?: { name: string; user_id: string };
  barber2?: { name: string; user_id: string };
  challenge?: Array<{ id: string; challenger_username: string; bounty_description: string | null }>;
}

interface SoloBroadcast {
  id: string;
  barber_id: string;
  room_name: string;
  status: string;
  started_at: string | null;
  peak_viewers: number;
  barber?: { name: string; id: string; user_id: string };
}

// --- Engagement hooks ---

const useIsFollowing = (creatorId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is-following', creatorId, user?.id],
    queryFn: async () => {
      if (!user || !creatorId) return false;
      const { data } = await supabase
        .from('creator_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('creator_id', creatorId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!creatorId,
  });
};

const useIsLiked = (creatorId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is-liked', creatorId, user?.id],
    queryFn: async () => {
      if (!user || !creatorId) return false;
      const { data } = await supabase
        .from('creator_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('creator_id', creatorId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!creatorId,
  });
};

// --- Engagement buttons sub-component ---

const EngagementActions = ({ barberUserId, barberName }: { barberUserId: string; barberName: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [donateOpen, setDonateOpen] = useState(false);

  const { data: isFollowing } = useIsFollowing(barberUserId);
  const { data: isLiked } = useIsLiked(barberUserId);

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Login required');
      if (isFollowing) {
        await supabase.from('creator_follows').delete().eq('follower_id', user.id).eq('creator_id', barberUserId);
      } else {
        await supabase.from('creator_follows').insert({ follower_id: user.id, creator_id: barberUserId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-following', barberUserId] });
      toast.success(isFollowing ? 'Unfollowed' : 'Following!');
    },
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Login required');
      if (isLiked) {
        await supabase.from('creator_likes').delete().eq('user_id', user.id).eq('creator_id', barberUserId);
      } else {
        await supabase.from('creator_likes').insert({ user_id: user.id, creator_id: barberUserId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-liked', barberUserId] });
      toast.success(isLiked ? 'Like removed' : 'Liked! ❤️');
    },
  });

  return (
    <>
      <div className="flex gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => { e.stopPropagation(); toggleLike.mutate(); }}
          disabled={!user}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => { e.stopPropagation(); toggleFollow.mutate(); }}
          disabled={!user}
        >
          {isFollowing ? (
            <UserCheck className="w-4 h-4 text-primary" />
          ) : (
            <UserPlus className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => { e.stopPropagation(); setDonateOpen(true); }}
          disabled={!user}
        >
          <DollarSign className="w-4 h-4 text-yellow-500" />
        </Button>
      </div>

      <DonationModal
        isOpen={donateOpen}
        onClose={() => setDonateOpen(false)}
        creatorId={barberUserId}
        creatorName={barberName}
      />
    </>
  );
};

// --- Main component ---

export const LiveBarberStreams = () => {
  const { user } = useAuth();
  const { isBarber } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedChallenge, setSelectedChallenge] = useState<{ id: string; challenger_username: string; title: string } | null>(null);

  // Realtime subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('live-streams-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stream_sessions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['solo-broadcasts'] });
          queryClient.invalidateQueries({ queryKey: ['live-barber-streams'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'barber_profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['solo-broadcasts'] });
          queryClient.invalidateQueries({ queryKey: ['live-barber-streams'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LiveStream[];
    },
    refetchInterval: 10000,
  });

  const { data: soloBroadcasts } = useQuery({
    queryKey: ['solo-broadcasts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stream_sessions')
        .select('id, barber_id, room_name, status, started_at, peak_viewers')
        .eq('stream_type', 'solo_broadcast')
        .in('status', ['connecting', 'active'])
        .order('started_at', { ascending: false });
      if (error) throw error;

      // Deduplicate by barber_id — keep only the most recent session per barber
      const seen = new Set<string>();
      const unique = (data || []).filter((s: any) => {
        if (seen.has(s.barber_id)) return false;
        seen.add(s.barber_id);
        return true;
      });

      const barberIds = unique.map((s: any) => s.barber_id).filter(Boolean);
      let barberMap: Record<string, { name: string; id: string; user_id: string }> = {};
      if (barberIds.length > 0) {
        const { data: barbers } = await supabase
          .from('barber_profiles')
          .select('id, name, user_id')
          .in('id', barberIds);
        if (barbers) {
          barberMap = Object.fromEntries(barbers.map((b: any) => [b.id, b]));
        }
      }

      return unique.map((s: any) => ({
        ...s,
        barber: barberMap[s.barber_id] || null,
      })) as SoloBroadcast[];
    },
    refetchInterval: 10000,
  });

  const hasContent =
    (liveStreams && liveStreams.length > 0) ||
    (soloBroadcasts && soloBroadcasts.length > 0);

  if (isLoading || !hasContent) return null;

  return (
    <section className="py-6 px-3 sm:px-6">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <h2 className="text-xl font-bold text-foreground">LIVE NOW</h2>
            <Badge variant="destructive" className="text-xs px-2 py-0.5">
              {(liveStreams?.length || 0) + (soloBroadcasts?.length || 0)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Watch live battles and broadcasts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Solo Broadcasts */}
          {soloBroadcasts?.map((broadcast) => (
            <Card key={broadcast.id} className="overflow-hidden hover:shadow-lg transition-all relative group">
              <div className="relative aspect-video bg-muted flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <div className="w-10 h-10 mx-auto mb-1.5 rounded-full bg-primary/20 flex items-center justify-center">
                    <Radio className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-[10px]">Solo Broadcast</p>
                </div>
                <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 bg-red-600 rounded text-white text-[10px] font-bold">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />LIVE
                </div>
              </div>

              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-foreground text-sm line-clamp-1">{broadcast.barber?.name || 'Barber'}</h3>
                    <p className="text-[10px] text-muted-foreground">Live broadcast</p>
                  </div>
                  {broadcast.barber?.user_id && (
                    <EngagementActions
                      barberUserId={broadcast.barber.user_id}
                      barberName={broadcast.barber.name}
                    />
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => navigate(`/broadcast/${broadcast.barber_id}`)}>
                  <ExternalLink className="w-3 h-3 mr-1.5" />Watch Live
                </Button>
              </div>
            </Card>
          ))}

          {/* Battle Streams */}
          {liveStreams?.map((stream) => {
            const isOwnStream = user?.id === stream.barber1_id;
            const canAccept = isBarber && !isOwnStream && stream.status === 'waiting_for_opponent';
            const isWaiting = stream.status === 'waiting_for_opponent';
            const challenge = Array.isArray(stream.challenge) ? stream.challenge[0] : stream.challenge;

            return (
              <Card key={stream.id} className="overflow-hidden hover:shadow-lg transition-all relative group">
                <div className="relative aspect-video bg-muted flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <div className="w-10 h-10 mx-auto mb-1.5 rounded-full bg-red-500/20 flex items-center justify-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    </div>
                    <p className="text-[10px]">Live Stream</p>
                  </div>
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 bg-red-600 rounded text-white text-[10px] font-bold">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />LIVE
                  </div>
                  {stream.prize_amount > 0 && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-500 to-orange-500 px-2 py-0.5 rounded text-white text-[10px] font-bold flex items-center gap-1">
                      <DollarSign className="w-2.5 h-2.5" />{stream.prize_amount}
                    </div>
                  )}
                  {stream.barber1_live_viewers > 0 && (
                    <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-white text-[10px] flex items-center gap-1">
                      <Users className="w-2.5 h-2.5" />{stream.barber1_live_viewers}
                    </div>
                  )}
                </div>

                <div className="p-3 space-y-2">
                  <div>
                    <h3 className="font-bold text-foreground text-sm line-clamp-2 mb-0.5">{stream.title}</h3>
                    <p className="text-[10px] text-muted-foreground">{stream.barber1?.name || 'Unknown Barber'}</p>
                  </div>
                  {challenge?.bounty_description && (
                    <div className="p-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-[10px]">
                      <p className="text-yellow-600 dark:text-yellow-400 line-clamp-2">"{challenge.bounty_description}"</p>
                    </div>
                  )}
                  {isWaiting ? (
                    <Badge variant="outline" className="border-orange-500 text-orange-500 text-[10px]"><Swords className="w-2.5 h-2.5 mr-1" />Open Challenge</Badge>
                  ) : stream.barber2 ? (
                    <Badge variant="outline" className="border-green-500 text-green-500 text-[10px]">Battle In Progress</Badge>
                  ) : null}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => navigate(`/battle/${stream.id}/theater`)}>
                      <ExternalLink className="w-3 h-3 mr-1.5" />Watch
                    </Button>
                    {canAccept && challenge && (
                      <Button size="sm" className="flex-1 h-8 text-xs bg-gradient-to-r from-primary to-orange-500" onClick={() => setSelectedChallenge({ id: challenge.id, challenger_username: challenge.challenger_username, title: stream.title })}>
                        <Swords className="w-3 h-3 mr-1.5" />Accept
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {selectedChallenge && (
        <AcceptChallengeModal challenge={selectedChallenge} isOpen={!!selectedChallenge} onClose={() => setSelectedChallenge(null)} />
      )}
    </section>
  );
};
