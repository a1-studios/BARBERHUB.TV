import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Mic, MicOff, Video, VideoOff, Radio, PhoneOff, SwitchCamera, Users, Clock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  LiveKitRoom, VideoTrack, useLocalParticipant, useTracks, useRoomContext,
} from '@livekit/components-react';
import { Track, RoomEvent, facingModeFromLocalTrack, VideoPresets } from 'livekit-client';
import { LIVE_BROADCAST_HEARTBEAT_MS } from '@/lib/liveBroadcast';

function StudioControls({ onEnd }: { onEnd: () => void }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [viewerCount, setViewerCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Viewer count tracking
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

  // Duration timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const formatDuration = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  };

  const toggleMic = useCallback(() => {
    localParticipant.setMicrophoneEnabled(!isMicOn);
    setIsMicOn(!isMicOn);
  }, [localParticipant, isMicOn]);

  const toggleCam = useCallback(() => {
    localParticipant.setCameraEnabled(!isCamOn);
    setIsCamOn(!isCamOn);
  }, [localParticipant, isCamOn]);

  const flipCamera = useCallback(async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    const camPub = localParticipant.getTrackPublication(Track.Source.Camera);
    if (camPub?.track) {
      await (camPub.track as any).restartTrack({ facingMode: newMode });
    } else {
      await localParticipant.setCameraEnabled(true, { facingMode: newMode });
    }
  }, [localParticipant, facingMode]);

  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const localCameraTrack = tracks.find(
    (t) => t.participant.isLocal && t.source === Track.Source.Camera
  );

  return (
    <div className="fixed inset-0 bg-black">
      {/* Video — pinned behind everything */}
      {localCameraTrack?.publication?.track ? (
        <VideoTrack
          trackRef={localCameraTrack}
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : undefined }}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-muted/10 z-0">
          <VideoOff className="h-16 w-16 text-muted-foreground/30" />
        </div>
      )}

      {/* Top metrics overlay */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/70 to-transparent px-4 pt-[env(safe-area-inset-top,12px)] pb-8 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2">
            <Badge className="bg-red-600 text-white font-bold gap-1.5 px-3 py-1">
              <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
              LIVE
            </Badge>
            <Badge variant="secondary" className="gap-1 bg-black/50 text-white border-white/20">
              <Users className="h-3 w-3" />
              {viewerCount}
            </Badge>
          </div>
          <Badge variant="secondary" className="gap-1 bg-black/50 text-white border-white/20 font-mono">
            <Clock className="h-3 w-3" />
            {formatDuration(elapsedSeconds)}
          </Badge>
        </div>
      </div>

      {/* Camera flip button (top-right) */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-[calc(env(safe-area-inset-top,12px)+48px)] right-4 z-50 rounded-full h-11 w-11 bg-black/40 text-white border border-white/20 backdrop-blur-sm"
        onClick={flipCamera}
      >
        <SwitchCamera className="h-5 w-5" />
      </Button>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 to-transparent px-4 py-5 pb-[env(safe-area-inset-bottom,24px)]">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={isMicOn ? 'ghost' : 'destructive'}
            size="icon"
            className="rounded-full h-12 w-12 text-white border border-white/20"
            onClick={toggleMic}
          >
            {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            variant={isCamOn ? 'ghost' : 'destructive'}
            size="icon"
            className="rounded-full h-12 w-12 text-white border border-white/20"
            onClick={toggleCam}
          >
            {isCamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Button
            className="rounded-full h-12 px-6 bg-red-600 hover:bg-red-700 border-2 border-white/30 text-white font-bold gap-2"
            onClick={onEnd}
          >
            <PhoneOff className="h-4 w-4" />
            END STREAM
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BroadcastStudio() {
  const navigate = useNavigate();
  const { barberId } = useParams<{ barberId: string }>();
  const location = useLocation();
  const cleanupStartedRef = useRef(false);
  const accessTokenRef = useRef<string | null>(null);

  const [token, setToken] = useState<string | null>(
    (location.state as any)?.token || null
  );
  const [serverUrl, setServerUrl] = useState<string | null>(
    (location.state as any)?.serverUrl || null
  );
  const [isEnding, setIsEnding] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      accessTokenRef.current = data.session?.access_token || null;
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      accessTokenRef.current = session?.access_token || null;
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigateToStudio = useCallback(() => {
    navigate('/studio', { replace: true });
  }, [navigate]);

  // If no token from route state, fetch one
  useEffect(() => {
    if (token && serverUrl) return;

    (async () => {
      const { data, error } = await supabase.functions.invoke(
        'generate-broadcast-token'
      );
      if (error || !data?.token) {
        toast.error(data?.error || 'Failed to start broadcast');
        navigateToStudio();
        return;
      }
      setToken(data.token);
      setServerUrl(data.serverUrl);
    })();
  }, [token, serverUrl, navigateToStudio]);

  useEffect(() => {
    if (!barberId || !token || !serverUrl) return;

    const sendHeartbeat = async () => {
      await supabase
        .from('barber_profiles')
        .update({ last_live_check: new Date().toISOString() })
        .eq('id', barberId);
    };

    void sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, LIVE_BROADCAST_HEARTBEAT_MS);

    return () => window.clearInterval(interval);
  }, [barberId, token, serverUrl]);

  const sendEndBroadcastKeepalive = useCallback(() => {
    if (cleanupStartedRef.current) return;

    const accessToken = accessTokenRef.current;
    if (!accessToken) return;

    cleanupStartedRef.current = true;

    void fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/end-broadcast`, {
      method: 'POST',
      keepalive: true,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: '{}',
    }).catch(() => {
      cleanupStartedRef.current = false;
    });
  }, []);

  useEffect(() => {
    if (!token || !serverUrl) return;

    const handlePageExit = () => sendEndBroadcastKeepalive();

    window.addEventListener('pagehide', handlePageExit);
    window.addEventListener('beforeunload', handlePageExit);

    return () => {
      window.removeEventListener('pagehide', handlePageExit);
      window.removeEventListener('beforeunload', handlePageExit);
      sendEndBroadcastKeepalive();
    };
  }, [token, serverUrl, sendEndBroadcastKeepalive]);

  const handleEndStream = useCallback(async () => {
    if (isEnding || cleanupStartedRef.current) return;
    cleanupStartedRef.current = true;
    setIsEnding(true);
    try {
      const { error } = await supabase.functions.invoke('end-broadcast');
      if (error) throw error;
      toast.success('Broadcast ended');
    } catch {
      toast.error('Failed to end broadcast — redirecting anyway');
    }
    navigateToStudio();
  }, [isEnding, navigateToStudio]);

  // Separate handler for LiveKit disconnect — only navigate, don't call end-broadcast again
  const handleDisconnected = useCallback(() => {
    if (cleanupStartedRef.current) return; // already ending via button
    cleanupStartedRef.current = true;
    toast.info('Broadcast disconnected');
    navigateToStudio();
  }, [navigateToStudio]);

  if (!token || !serverUrl) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Radio className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-white/60 text-sm">Connecting to broadcast...</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      video={true}
      audio={true}
      options={{
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
          facingMode: 'user',
        },
        publishDefaults: {
          videoCodec: 'h264',
          videoSimulcastLayers: [VideoPresets.h360],
        },
        adaptiveStream: true,
        dynacast: true,
      }}
      onDisconnected={handleDisconnected}
    >
      <StudioControls onEnd={handleEndStream} />
    </LiveKitRoom>
  );
}
