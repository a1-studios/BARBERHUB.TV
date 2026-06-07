import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBattleVideoRoom } from '@/hooks/useBattleVideoRoom';
import { useLocalCameraPreview } from '@/hooks/useLocalCameraPreview';
import { useContenderReadiness } from '@/hooks/useContenderReadiness';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useAutoHideControls } from '@/hooks/useAutoHideControls';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BattleChat } from '@/components/battles/BattleChat';
import { ContenderTopBar } from '@/components/contender/ContenderTopBar';
import { ContenderControlBar } from '@/components/contender/ContenderControlBar';
import { ContenderPreviewOverlay } from '@/components/contender/ContenderPreviewOverlay';
import { BattleVideoContainer } from '@/components/streaming/BattleVideoContainer';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Phase = 'preview' | 'standby' | 'countdown' | 'live';

const COUNTDOWN_SECONDS = 5;

export default function ContenderTheater() {
  const { id: battleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [showChat, setShowChat] = useState(false);
  const [barberPosition, setBarberPosition] = useState<1 | 2 | null>(null);
  const [barberId, setBarberId] = useState<string>('');
  const [localCountry, setLocalCountry] = useState<string | undefined>();
  const [remoteCountry, setRemoteCountry] = useState<string | undefined>();
  
  // Phase state machine
  const [phase, setPhase] = useState<Phase>('preview');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  // Use extracted hooks
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);
  const { showControls, handleScreenTap } = useAutoHideControls({ isMobile });

  // Local camera preview (starts immediately)
  const {
    stream: previewStream,
    isVideoEnabled: previewVideoEnabled,
    isAudioEnabled: previewAudioEnabled,
    toggleVideo: togglePreviewVideo,
    toggleAudio: togglePreviewAudio,
    switchCamera,
    startPreview,
    stopPreview,
    isPreviewActive,
    error: previewError,
  } = useLocalCameraPreview();

  // Fetch battle details
  const { data: battle, isLoading: battleLoading } = useQuery({
    queryKey: ['battle-contender', battleId],
    queryFn: async () => {
      if (!battleId) return null;
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .eq('id', battleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!battleId
  });

  // Realtime: refetch battle when barber2_id / status flips (opponent accepted)
  useEffect(() => {
    if (!battleId) return;
    const channel = supabase
      .channel(`battle-contender-${battleId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'battles', filter: `id=eq.${battleId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['battle-contender', battleId] });
          queryClient.invalidateQueries({ queryKey: ['battle-barbers'] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [battleId, queryClient]);


  // Fetch barber profiles — load whichever barber IDs exist (challenger arrives
  // before opponent accepts, so barber2_id may be null in Quick Play mode).
  const { data: barberProfiles, isLoading: barberProfilesLoading, isFetched: barberProfilesFetched } = useQuery({
    queryKey: ['battle-barbers', battle?.barber1_id, battle?.barber2_id],
    queryFn: async () => {
      const ids = [battle?.barber1_id, battle?.barber2_id].filter(Boolean) as string[];
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('*, profiles:user_id(display_name)')
        .in('id', ids);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!battle && (!!battle.barber1_id || !!battle.barber2_id),
  });

  // Also resolve the current user's OWN barber_profiles row directly — this
  // is the acceptor's lifeline against any timing gap between the battle row
  // realtime update and the joined query above.
  const { data: myBarberProfile, isLoading: myBarberLoading } = useQuery({
    queryKey: ['my-barber-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('id, country_code')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Determine which barber position the current user is.
  useEffect(() => {
    if (!user || !battle) return;
    const barber1 = barberProfiles?.find(b => b.id === battle?.barber1_id);
    const barber2 = barberProfiles?.find(b => b.id === battle?.barber2_id);

    if (barber1?.user_id === user.id) {
      setBarberPosition(1);
      setBarberId(barber1.id);
      setLocalCountry(barber1.country_code || undefined);
      setRemoteCountry(barber2?.country_code || undefined);
      return;
    }
    if (barber2?.user_id === user.id) {
      setBarberPosition(2);
      setBarberId(barber2.id);
      setLocalCountry(barber2.country_code || undefined);
      setRemoteCountry(barber1?.country_code || undefined);
      return;
    }
    // Acceptor fallback: my own barber_profile matches barber2_id on the battle,
    // but the joined query hasn't returned yet.
    if (myBarberProfile?.id && battle.barber2_id === myBarberProfile.id) {
      setBarberPosition(2);
      setBarberId(myBarberProfile.id);
      setLocalCountry(myBarberProfile.country_code || undefined);
      setRemoteCountry(barber1?.country_code || undefined);
      return;
    }
    if (myBarberProfile?.id && battle.barber1_id === myBarberProfile.id) {
      setBarberPosition(1);
      setBarberId(myBarberProfile.id);
      setLocalCountry(myBarberProfile.country_code || undefined);
      setRemoteCountry(barber2?.country_code || undefined);
      return;
    }
    // Challenger waiting for an opponent — let them stage in the room.
    if (battle?.organizer_id === user.id) {
      setBarberPosition(1);
      setBarberId(battle?.barber1_id || '');
    }
  }, [barberProfiles, user, battle, myBarberProfile]);


  // Get barber info
  const currentBarber = barberProfiles?.find(b => 
    barberPosition === 1 ? b.id === battle?.barber1_id : b.id === battle?.barber2_id
  );
  const opponentBarber = barberProfiles?.find(b => 
    barberPosition === 1 ? b.id === battle?.barber2_id : b.id === battle?.barber1_id
  );

  // Get display names
  const getDisplayName = (barber: typeof currentBarber) => {
    if (!barber) return 'Unknown';
    const profileData = barber.profiles as { display_name: string | null } | null;
    return profileData?.display_name || barber.name || 'Barber';
  };
  
  const currentBarberName = currentBarber ? getDisplayName(currentBarber) : 'You';
  const opponentBarberName = opponentBarber ? getDisplayName(opponentBarber) : 'Opponent';

  // Presence & readiness tracking
  const {
    localReady,
    opponentReady,
    opponentPresence,
    isOpponentPresent,
    setReady,
    bothReady,
  } = useContenderReadiness({
    battleId: battleId || '',
    barberId: barberId,
    barberPosition: barberPosition || 1,
    displayName: currentBarberName,
    countryCode: localCountry,
    hasCamera: isPreviewActive,
  });

  // Initialize Battle Video Room hook with LiveKit
  const {
    status: streamStatus,
    localVideoTrack,
    remoteVideoTrack,
    formattedDuration,
    opponentIdentity,
    connect,
    disconnect,
    toggleVideo,
    toggleAudio,
    isVideoEnabled,
    isAudioEnabled,
    isConnected,
    isConnecting,
    hasOpponent,
  } = useBattleVideoRoom({
    battleId: battleId || '',
    // Derive opponent identity DIRECTLY from the battle record (barber_profile
    // ids) — never from the optional barber_profiles query, which can be
    // momentarily null during refetches and would otherwise widen the matcher
    // to "any remote participant" and let viewer churn fire opponent-left.
    opponentIdentity:
      barberPosition === 1
        ? battle?.barber2_id ?? null
        : barberPosition === 2
          ? battle?.barber1_id ?? null
          : null,
    barberPosition: barberPosition ?? null,
    onOpponentJoin: (participant) => {
      console.log('Opponent joined:', participant.identity);
    },
    onOpponentLeave: () => {
      console.log('Opponent left the battle');
    },
    onDisconnect: (error) => {
      // Only navigate away on a confirmed unrecoverable failure.
      // Transient drops auto-rejoin inside the hook — do NOT leave the theater.
      if (error && error.message === 'reconnect-failed') {
        toast.error('Connection lost. Returning to feed…');
        setTimeout(() => navigate('/watch', { replace: true }), 800);
      }
    }
  });

  // Start camera preview on mount
  useEffect(() => {
    if (barberPosition !== null) {
      startPreview();
    }
    return () => {
      stopPreview();
    };
  }, [barberPosition, startPreview, stopPreview]);

  // Handle ready button click
  const handleReady = useCallback(async () => {
    await setReady(true);
    setPhase('standby');
    toast.success('You are ready! Waiting for opponent...');
  }, [setReady]);

  // Watch for both ready to start countdown
  useEffect(() => {
    if (bothReady && phase === 'standby') {
      setPhase('countdown');
      setCountdown(COUNTDOWN_SECONDS);
    }
  }, [bothReady, phase]);

  // Handle countdown complete - connect to LiveKit
  const handleCountdownComplete = useCallback(async () => {
    try {
      // Stop preview and connect to LiveKit room
      stopPreview();
      await connect();
      setPhase('live');
    } catch (error) {
      console.error('Failed to connect to battle room:', error);
      setPhase('preview');
      startPreview();
    }
  }, [connect, stopPreview, startPreview]);

  const handleEndStream = async () => {
    try {
      disconnect();
      toast.success('Stream ended — heading to the feed');
      navigate('/watch', { replace: true });
    } catch (error) {
      console.error('Failed to end stream:', error);
      navigate('/watch', { replace: true });
    }
  };

  // Determine which video/audio controls to use based on phase
  const currentVideoEnabled = phase === 'live' ? isVideoEnabled : previewVideoEnabled;
  const currentAudioEnabled = phase === 'live' ? isAudioEnabled : previewAudioEnabled;
  const handleToggleVideo = phase === 'live' ? toggleVideo : togglePreviewVideo;
  const handleToggleAudio = phase === 'live' ? toggleAudio : togglePreviewAudio;

  // Wait for all participant data to settle before deciding access.
  const participantQueriesPending =
    battleLoading || barberProfilesLoading || myBarberLoading || !barberProfilesFetched;

  if (battleLoading || (!barberPosition && participantQueriesPending)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="w-full max-w-6xl aspect-video" />
      </div>
    );
  }

  if (!barberPosition) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground text-center">You are not a participant in this battle.</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }


  // Show error if camera permission denied
  if (previewError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Camera Access Required</h1>
        <p className="text-muted-foreground text-center max-w-md">{previewError}</p>
        <Button onClick={() => startPreview()} variant="default">
          Try Again
        </Button>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  // Determine layout based on phase
  const getLayout = () => {
    if (phase === 'live') {
      return hasOpponent ? 'split' : 'preview';
    }
    return 'standby';
  };

  return (
    <div 
      ref={containerRef}
      className={cn("min-h-screen bg-black text-white", isMobile && "theater-mode")}
      onClick={handleScreenTap}
    >
      <ContenderTopBar
        title={battle?.title || 'Battle'}
        isStreaming={isConnected}
        viewerCount={0}
        formattedDuration={formattedDuration}
        isFullscreen={isFullscreen}
        showControls={showControls}
        isMobile={isMobile}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Main Content - Battle Video Container */}
      <div className={cn(
        "flex items-center justify-center",
        isMobile 
          ? "fixed inset-0 flex-col pt-12 pb-20" 
          : "fixed inset-0 pt-14 pb-24 px-2"
      )}>
        <BattleVideoContainer
          localTrack={localVideoTrack}
          remoteTrack={remoteVideoTrack}
          localBarberName={currentBarberName}
          remoteBarberName={opponentPresence?.display_name || opponentBarberName}
          localCountry={localCountry}
          remoteCountry={opponentPresence?.country_code || remoteCountry}
          isConnecting={isConnecting}
          isConnected={isConnected}
          hasOpponent={hasOpponent}
          duration={formattedDuration}
          viewerCount={0}
          layout={getLayout()}
          previewStream={previewStream}
          localReady={localReady}
          opponentReady={opponentReady}
          isOpponentPresent={isOpponentPresent}
          className="w-full h-full"
        />
      </div>

      {/* Preview Overlay */}
      <ContenderPreviewOverlay
        phase={phase}
        isReady={localReady}
        opponentReady={opponentReady}
        opponentName={opponentPresence?.display_name || opponentBarberName}
        isOpponentPresent={isOpponentPresent}
        countdown={countdown}
        onCountdownComplete={handleCountdownComplete}
      />

      <ContenderControlBar
        isMobile={isMobile}
        showControls={showControls}
        isMicEnabled={currentAudioEnabled}
        isVideoEnabled={currentVideoEnabled}
        isStreaming={isConnected}
        canStart={!isConnected && !isConnecting}
        streamStatus={streamStatus}
        viewerCount={0}
        formattedDuration={formattedDuration}
        showChat={showChat}
        hasStream={isPreviewActive || !!localVideoTrack}
        onToggleMic={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onGoLive={() => {}}
        onEndStream={handleEndStream}
        onToggleChat={() => setShowChat(!showChat)}
        phase={phase}
        isReady={localReady}
        opponentReady={opponentReady}
        isOpponentPresent={isOpponentPresent}
        onReady={handleReady}
        onSwitchCamera={switchCamera}
      />

      {battleId && (
        <BattleChat 
          battleId={battleId} 
          isOpen={showChat} 
          onClose={() => setShowChat(false)} 
        />
      )}
    </div>
  );
}
