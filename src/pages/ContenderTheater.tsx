import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTwilioStream } from '@/hooks/useTwilioStream';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMediaControls } from '@/hooks/useMediaControls';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useAutoHideControls } from '@/hooks/useAutoHideControls';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BattleChat } from '@/components/battles/BattleChat';
import { ContenderTopBar } from '@/components/contender/ContenderTopBar';
import { ContenderControlBar } from '@/components/contender/ContenderControlBar';
import { ContenderVideoPreview } from '@/components/contender/ContenderVideoPreview';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ContenderTheater() {
  const { id: battleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [showChat, setShowChat] = useState(false);
  const [barberPosition, setBarberPosition] = useState<1 | 2 | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Use extracted hooks
  const { isMicEnabled, isVideoEnabled, toggleMic, toggleVideo } = useMediaControls();
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
        .select('*')
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
      } else if (barber2?.user_id === user.id) {
        setBarberPosition(2);
      }
    }
  }, [barberProfiles, user, battle]);

  // Initialize Twilio stream hook
  const {
    status: streamStatus,
    localStream,
    formattedDuration,
    viewerCount,
    startStream,
    endStream,
    isStreaming,
    canStart
  } = useTwilioStream({
    battleId: battleId || '',
    barberPosition: barberPosition || 1,
    onStatusChange: (status) => console.log('Stream status:', status)
  });

  // Start camera preview automatically
  useEffect(() => {
    const startCameraPreview = async () => {
      if (barberPosition && !previewStream && !cameraReady) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          setPreviewStream(stream);
          setCameraReady(true);
        } catch (error) {
          console.error('Camera access error:', error);
          toast.error('Please allow camera access to participate');
        }
      }
    };
    
    startCameraPreview();
    
    return () => {
      if (previewStream && !isStreaming) {
        previewStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [barberPosition]);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current) {
      const streamToUse = isStreaming ? localStream : previewStream;
      if (streamToUse) {
        videoRef.current.srcObject = streamToUse;
      }
    }
  }, [localStream, previewStream, isStreaming]);

  // Handle media toggle with active stream
  const handleToggleMic = useCallback(() => {
    const activeStream = isStreaming ? localStream : previewStream;
    toggleMic(activeStream);
  }, [isStreaming, localStream, previewStream, toggleMic]);

  const handleToggleVideo = useCallback(() => {
    const activeStream = isStreaming ? localStream : previewStream;
    toggleVideo(activeStream);
  }, [isStreaming, localStream, previewStream, toggleVideo]);

  const handleGoLive = async () => {
    try {
      await startStream();
    } catch (error) {
      console.error('Failed to start stream:', error);
    }
  };

  const handleEndStream = async () => {
    try {
      await endStream();
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

  const hasStream = !!(previewStream || localStream);

  return (
    <div 
      ref={containerRef}
      className={cn("min-h-screen bg-black text-white", isMobile && "theater-mode")}
      onClick={handleScreenTap}
    >
      <ContenderTopBar
        title={battle?.title || 'Battle'}
        isStreaming={isStreaming}
        viewerCount={viewerCount}
        formattedDuration={formattedDuration}
        isFullscreen={isFullscreen}
        showControls={showControls}
        isMobile={isMobile}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Main Content */}
      <div className={cn(
        "flex items-center justify-center",
        isMobile ? "fixed inset-0 flex-col" : "pt-20 pb-32 px-4 min-h-screen"
      )}>
        <div className={cn(
          "w-full",
          isMobile ? "h-full flex flex-col" : "max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-4"
        )}>
          {/* Your Camera */}
          <ContenderVideoPreview
            ref={videoRef}
            isYourCamera={true}
            hasStream={hasStream}
            isVideoEnabled={isVideoEnabled}
            isStreaming={isStreaming}
            barberName={currentBarber?.name || 'You'}
            barberPosition={barberPosition}
            isMobile={isMobile}
          />

          {/* Opponent's Stream */}
          <ContenderVideoPreview
            isYourCamera={false}
            hasStream={false}
            isVideoEnabled={true}
            isStreaming={false}
            barberName={opponentBarber?.name || 'Opponent'}
            barberPosition={barberPosition === 1 ? 2 : 1}
            isMobile={isMobile}
          />
        </div>
      </div>

      <ContenderControlBar
        isMobile={isMobile}
        showControls={showControls}
        isMicEnabled={isMicEnabled}
        isVideoEnabled={isVideoEnabled}
        isStreaming={isStreaming}
        canStart={canStart}
        streamStatus={streamStatus}
        viewerCount={viewerCount}
        formattedDuration={formattedDuration}
        showChat={showChat}
        hasStream={hasStream}
        onToggleMic={handleToggleMic}
        onToggleVideo={handleToggleVideo}
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
