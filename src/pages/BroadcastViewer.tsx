import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Radio, Users, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useRoomContext,
} from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';
import { isFreshLiveBroadcast } from '@/lib/liveBroadcast';

function ViewerContent({ barberName }: { barberName: string }) {
  const room = useRoomContext();
  const [viewerCount, setViewerCount] = useState(0);

  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });
  const remoteVideoTrack = tracks.find((t) => !t.participant.isLocal);

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

      {/* Overlays */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <Badge className="bg-red-600 text-white font-bold gap-1.5 px-3 py-1">
          <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
          LIVE
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" />
          {viewerCount}
        </Badge>
      </div>

      <div className="absolute bottom-4 left-4">
        <p className="text-white font-bold text-lg drop-shadow-lg">{barberName}</p>
      </div>
    </div>
  );
}

export default function BroadcastViewer() {
  const { barberId } = useParams<{ barberId: string }>();
  const navigate = useNavigate();

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [barberName, setBarberName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      // Fetch barber info
      const { data: barber } = await supabase
        .from('barber_profiles')
        .select('name, is_live, last_live_check, updated_at')
        .eq('id', barberId)
        .single();

      setBarberName(barber?.name || 'Barber');

      if (!barber?.is_live || !isFreshLiveBroadcast(barber.last_live_check, barber.updated_at)) {
        setError('This barber is not currently live');
        setIsLoading(false);
        return;
      }

      // Get viewer token
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
        <Button variant="outline" onClick={() => navigate(-1)}>
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
            onClick={() => navigate(-1)}
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
        <ViewerContent barberName={barberName} />
      </LiveKitRoom>
    </div>
  );
}
