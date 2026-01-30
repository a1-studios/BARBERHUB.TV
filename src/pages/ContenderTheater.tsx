import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBattleVideoRoom } from '@/hooks/useBattleVideoRoom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useAutoHideControls } from '@/hooks/useAutoHideControls';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BattleChat } from '@/components/battles/BattleChat';
import { ContenderTopBar } from '@/components/contender/ContenderTopBar';
import { ContenderControlBar } from '@/components/contender/ContenderControlBar';
import { BattleVideoContainer } from '@/components/streaming/BattleVideoContainer';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ContenderTheater() {
  const { id: battleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [showChat, setShowChat] = useState(false);
  const [barberPosition, setBarberPosition] = useState<1 | 2 | null>(null);
  const [localCountry, setLocalCountry] = useState<string | undefined>();
  const [remoteCountry, setRemoteCountry] = useState<string | undefined>();

  // Use extracted hooks
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);
  const { showControls, handleScreenTap } = useAutoHideControls({ isMobile });

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

  // Fetch barber profiles
  const { data: barberProfiles } = useQuery({
    queryKey: ['battle-barbers', battle?.barber1_id, battle?.barber2_id],
    queryFn: async () => {
      if (!battle?.barber1_id || !battle?.barber2_id) return null;
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('*, profiles:user_id(display_name)')
        .in('id', [battle.barber1_id, battle.barber2_id]);
      if (error) throw error;
      return data;
    },
    enabled: !!battle?.barber1_id && !!battle?.barber2_id
  });

  // Determine which barber position the current user is
  useEffect(() => {
    if (barberProfiles && user) {
      const barber1 = barberProfiles.find(b => b.id === battle?.barber1_id);
      const barber2 = barberProfiles.find(b => b.id === battle?.barber2_id);
      
      if (barber1?.user_id === user.id) {
        setBarberPosition(1);
        setLocalCountry(barber1.country_code || undefined);
        setRemoteCountry(barber2?.country_code || undefined);
      } else if (barber2?.user_id === user.id) {
        setBarberPosition(2);
        setLocalCountry(barber2.country_code || undefined);
        setRemoteCountry(barber1?.country_code || undefined);
      }
    }
  }, [barberProfiles, user, battle]);

  // Initialize Battle Video Room hook with Twilio SDK
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
    onOpponentJoin: (participant) => {
      console.log('Opponent joined:', participant.identity);
    },
    onOpponentLeave: () => {
      console.log('Opponent left the battle');
    },
    onDisconnect: (error) => {
      if (error) {
        toast.error('Connection lost. Please rejoin.');
      }
    }
  });

  const handleGoLive = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect to battle room:', error);
    }
  };

  const handleEndStream = async () => {
    try {
      disconnect();
      toast.success('Stream ended successfully');
    } catch (error) {
      console.error('Failed to end stream:', error);
    }
  };

  // Get barber info
  const currentBarber = barberProfiles?.find(b => 
    barberPosition === 1 ? b.id === battle?.barber1_id : b.id === battle?.barber2_id
  );
  const opponentBarber = barberProfiles?.find(b => 
    barberPosition === 1 ? b.id === battle?.barber2_id : b.id === battle?.barber1_id
  );

  // Get display names - profiles is the joined table result
  const getDisplayName = (barber: typeof currentBarber) => {
    if (!barber) return 'Unknown';
    const profileData = barber.profiles as { display_name: string | null } | null;
    return profileData?.display_name || barber.name || 'Barber';
  };
  
  const currentBarberName = currentBarber ? getDisplayName(currentBarber) : 'You';
  const opponentBarberName = opponentBarber ? getDisplayName(opponentBarber) : 'Opponent';

  if (battleLoading) {
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

  return (
    <div 
      ref={containerRef}
      className={cn("min-h-screen bg-black text-white", isMobile && "theater-mode")}
      onClick={handleScreenTap}
    >
      <ContenderTopBar
        title={battle?.title || 'Battle'}
        isStreaming={isConnected}
        viewerCount={0} // Will be updated with real viewer count
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
          remoteBarberName={opponentBarberName}
          localCountry={localCountry}
          remoteCountry={remoteCountry}
          isConnecting={isConnecting}
          isConnected={isConnected}
          hasOpponent={hasOpponent}
          duration={formattedDuration}
          viewerCount={0}
          layout={isMobile ? 'pip' : (hasOpponent ? 'split' : 'preview')}
          className="w-full h-full"
        />
      </div>

      <ContenderControlBar
        isMobile={isMobile}
        showControls={showControls}
        isMicEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isStreaming={isConnected}
        canStart={!isConnected && !isConnecting}
        streamStatus={streamStatus}
        viewerCount={0}
        formattedDuration={formattedDuration}
        showChat={showChat}
        hasStream={!!localVideoTrack}
        onToggleMic={toggleAudio}
        onToggleVideo={toggleVideo}
        onGoLive={handleGoLive}
        onEndStream={handleEndStream}
        onToggleChat={() => setShowChat(!showChat)}
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
