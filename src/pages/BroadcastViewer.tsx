import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Radio, Users, WifiOff, Heart, UserPlus, UserCheck, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLikes } from '@/hooks/useLikes';
import { DonationModal } from '@/components/DonationModal';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useRoomContext,
} from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';
import { isFreshLiveBroadcast } from '@/lib/liveBroadcast';
import { toast } from 'sonner';

function ViewerContent({
  barberName,
  barberUserId,
  barberId,
}: {
  barberName: string;
  barberUserId: string | null;
  barberId: string;
}) {
  const room = useRoomContext();
  const { user } = useAuth();
  const { hasUserLiked, toggleLike } = useLikes();
  const [viewerCount, setViewerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showDonation, setShowDonation] = useState(false);

  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });
  const remoteVideoTrack = tracks.find((t) => !t.participant.isLocal);

  // Viewer count
  useEffect(() => {
    const update = () => setViewerCount(Math.max(0, room.numParticipants - 1));
    update();
    room.on(RoomEvent.ParticipantConnected, update);
    room.on(RoomEvent.ParticipantDisconnected, update);
    return () => {
      room.off(RoomEvent.ParticipantConnected, update);
      room.off(RoomEvent.ParticipantDisconnected, update);
    };
  }, [room]);

  // Check follow status
  useEffect(() => {
    if (!user || !barberUserId) return;
    supabase
      .from('creator_follows')
      .select('id')
      .eq('creator_id', barberUserId)
      .eq('follower_id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsFollowing(!!data));
  }, [user, barberUserId]);

  const likeQuery = barberUserId ? hasUserLiked(barberUserId) : { data: false };
  const isLiked = likeQuery.data ?? false;

  const handleToggleLike = () => {
    if (!user) return toast.error('Sign in to like');
    if (!barberUserId) return;
    toggleLike.mutate({ creatorId: barberUserId, isLiked });
  };

  const handleToggleFollow = async () => {
    if (!user) return toast.error('Sign in to follow');
    if (!barberUserId || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from('creator_follows')
          .delete()
          .eq('creator_id', barberUserId)
          .eq('follower_id', user.id);
        setIsFollowing(false);
        toast.success('Unfollowed');
      } else {
        await supabase
          .from('creator_follows')
          .insert({ creator_id: barberUserId, follower_id: user.id });
        setIsFollowing(true);
        toast.success('Following!');
      }
    } catch {
      toast.error('Failed to update follow');
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <div className="flex-1 relative bg-black">
      {remoteVideoTrack?.publication?.track ? (
        <VideoTrack trackRef={remoteVideoTrack} className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Radio className="h-12 w-12 mx-auto mb-3 animate-pulse text-primary/50" />
            <p className="text-sm">Waiting for stream...</p>
          </div>
        </div>
      )}

      {/* Top-left: LIVE + viewers */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
        <Badge className="bg-red-600 text-white font-bold gap-1.5 px-3 py-1">
          <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
          LIVE
        </Badge>
        <Badge variant="secondary" className="gap-1 bg-black/50 text-white border-white/20">
          <Users className="h-3 w-3" />
          {viewerCount}
        </Badge>
      </div>

      {/* Bottom-left: barber name */}
      <div className="absolute bottom-6 left-4 z-10">
        <p className="text-white font-bold text-lg drop-shadow-lg">{barberName}</p>
        <p className="text-white/50 text-xs">Live now</p>
      </div>

      {/* Right-side TikTok-style engagement actions */}
      <div className="absolute right-3 bottom-20 z-10 flex flex-col items-center gap-5">
        {/* Like */}
        <button
          onClick={handleToggleLike}
          className="flex flex-col items-center gap-1"
        >
          <div className={`rounded-full p-2.5 backdrop-blur-sm ${isLiked ? 'bg-red-500/80' : 'bg-black/40'}`}>
            <Heart className={`h-6 w-6 ${isLiked ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-[10px] font-medium drop-shadow">Like</span>
        </button>

        {/* Follow */}
        <button
          onClick={handleToggleFollow}
          className="flex flex-col items-center gap-1"
          disabled={followLoading}
        >
          <div className={`rounded-full p-2.5 backdrop-blur-sm ${isFollowing ? 'bg-primary/80' : 'bg-black/40'}`}>
            {isFollowing ? (
              <UserCheck className="h-6 w-6 text-white" />
            ) : (
              <UserPlus className="h-6 w-6 text-white" />
            )}
          </div>
          <span className="text-white text-[10px] font-medium drop-shadow">
            {isFollowing ? 'Following' : 'Follow'}
          </span>
        </button>

        {/* Donate */}
        <button
          onClick={() => {
            if (!user) return toast.error('Sign in to donate');
            setShowDonation(true);
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="rounded-full p-2.5 bg-black/40 backdrop-blur-sm">
            <Gift className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-[10px] font-medium drop-shadow">Donate</span>
        </button>
      </div>

      {/* Donation Modal */}
      {showDonation && barberUserId && (
        <DonationModal
          creatorId={barberUserId}
          creatorName={barberName}
          isOpen={showDonation}
          onClose={() => setShowDonation(false)}
        />
      )}
    </div>
  );
}

export default function BroadcastViewer() {
  const { barberId } = useParams<{ barberId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [barberName, setBarberName] = useState('');
  const [barberUserId, setBarberUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleExitViewer = () => {
    if (user && barberUserId && user.id === barberUserId) {
      navigate('/studio', { replace: true });
      return;
    }

    navigate('/watch', { replace: true });
  };

  // Subscribe to barber's is_live status for instant stream-end detection
  useEffect(() => {
    if (!barberId) return;

    const channel = supabase
      .channel(`barber-live-status-${barberId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'barber_profiles',
          filter: `id=eq.${barberId}`,
        },
        (payload) => {
          if (payload.new && !isFreshLiveBroadcast(payload.new.last_live_check, payload.new.updated_at)) {
            setError('Stream ended');
            setToken(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barberId]);

  useEffect(() => {
    if (!barberId) return;

    (async () => {
      const { data: barber } = await supabase
        .from('barber_profiles')
        .select('name, user_id, is_live, last_live_check, updated_at')
        .eq('id', barberId)
        .single();

      setBarberName(barber?.name || 'Barber');
      setBarberUserId(barber?.user_id || null);

      if (!barber?.is_live || !isFreshLiveBroadcast(barber.last_live_check, barber.updated_at)) {
        setError('This barber is not currently live');
        setIsLoading(false);
        return;
      }

      const roomName = `broadcast-${barberId}`;
      const { data, error: fnError } = await supabase.functions.invoke(
        'get-broadcast-viewer-token',
        { body: { roomName } }
      );

      if (fnError || !data?.token) {
        setError(data?.error || 'Stream is not available');
        setIsLoading(false);
        return;
      }

      setToken(data.token);
      setServerUrl(data.serverUrl);
      setIsLoading(false);
    })();
  }, [barberId]);

  // Polling fallback
  useEffect(() => {
    if (!barberId) return;

    const interval = window.setInterval(async () => {
      const { data: barber } = await supabase
        .from('barber_profiles')
        .select('is_live, last_live_check, updated_at')
        .eq('id', barberId)
        .maybeSingle();

      if (!barber?.is_live || !isFreshLiveBroadcast(barber.last_live_check, barber.updated_at)) {
        setError('Stream ended');
        setToken(null);
      }
    }, 10000);

    return () => window.clearInterval(interval);
  }, [barberId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Radio className="h-10 w-10 text-primary animate-pulse" />
      </div>
    );
  }

  if (error || !token || !serverUrl) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4">
        <WifiOff className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-white/60 text-lg font-medium">{error || 'Stream unavailable'}</p>
        <p className="text-muted-foreground text-sm">{barberName}</p>
        <Button variant="outline" onClick={handleExitViewer}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center px-4 pt-[env(safe-area-inset-top,12px)] pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/80 h-9 w-9"
            onClick={handleExitViewer}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        video={false}
        audio={false}
        onDisconnected={() => {
          setError('Stream ended');
          setToken(null);
        }}
      >
        <ViewerContent
          barberName={barberName}
          barberUserId={barberUserId}
          barberId={barberId || ''}
        />
      </LiveKitRoom>
    </div>
  );
}
