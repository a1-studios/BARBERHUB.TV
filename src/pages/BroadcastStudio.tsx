import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Mic, MicOff, Video, VideoOff, Radio, PhoneOff,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LiveKitRoom, VideoTrack, useLocalParticipant, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { LIVE_BROADCAST_HEARTBEAT_MS } from '@/lib/liveBroadcast';

function StudioControls({ onEnd }: { onEnd: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  const toggleMic = useCallback(() => {
    localParticipant.setMicrophoneEnabled(!isMicOn);
    setIsMicOn(!isMicOn);
  }, [localParticipant, isMicOn]);

  const toggleCam = useCallback(() => {
    localParticipant.setCameraEnabled(!isCamOn);
    setIsCamOn(!isCamOn);
  }, [localParticipant, isCamOn]);

  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const localCameraTrack = tracks.find(
    (t) => t.participant.isLocal && t.source === Track.Source.Camera
  );

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Video */}
      <div className="flex-1 relative">
        {localCameraTrack?.publication?.track ? (
          <VideoTrack
            trackRef={localCameraTrack}
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/10">
            <VideoOff className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}

        {/* LIVE badge */}
        <div className="absolute top-[env(safe-area-inset-top,12px)] left-4 z-10 mt-2">
          <Badge className="bg-red-600 text-white font-bold gap-1.5 px-3 py-1">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            LIVE
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gradient-to-t from-black/90 to-transparent px-4 py-6 pb-[env(safe-area-inset-bottom,24px)]">
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
            size="icon"
            className="rounded-full h-14 w-14 bg-red-600 hover:bg-red-700 border-4 border-white/30"
            onClick={onEnd}
          >
            <PhoneOff className="h-5 w-5 text-white" />
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

  // If no token from route state, fetch one
  useEffect(() => {
    if (token && serverUrl) return;

    (async () => {
      const { data, error } = await supabase.functions.invoke(
        'generate-broadcast-token'
      );
      if (error || !data?.token) {
        toast.error(data?.error || 'Failed to start broadcast');
        navigate('/studio');
        return;
      }
      setToken(data.token);
      setServerUrl(data.serverUrl);
    })();
  }, [token, serverUrl, navigate]);

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
      cleanupStartedRef.current = false;
      toast.error('Failed to end broadcast');
      setIsEnding(false);
      return;
    }
    navigate('/studio');
  }, [isEnding, navigate]);

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
      onDisconnected={handleEndStream}
    >
      <StudioControls onEnd={handleEndStream} />
    </LiveKitRoom>
  );
}
