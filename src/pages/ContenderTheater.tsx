import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTwilioStream } from '@/hooks/useTwilioStream';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BattleChat } from '@/components/battles/BattleChat';
import { 
  Video, VideoOff, Mic, MicOff, Radio, Square, 
  ArrowLeft, Users, Clock, MessageCircle, Settings,
  Maximize, Minimize, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ContenderTheater() {
  const { id: battleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [barberPosition, setBarberPosition] = useState<1 | 2 | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Start camera preview automatically when component mounts and user is a participant
  useEffect(() => {
    const startCameraPreview = async () => {
      if (barberPosition && !previewStream && !cameraReady) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
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
      // Cleanup preview stream on unmount (only if not streaming)
      if (previewStream && !isStreaming) {
        previewStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [barberPosition]);

  // Auto-hide controls on mobile after 3 seconds
  useEffect(() => {
    if (isMobile && showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      return () => {
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      };
    }
  }, [isMobile, showControls]);

  // Toggle controls on tap (mobile)
  const handleScreenTap = useCallback(() => {
    if (isMobile) {
      setShowControls(prev => !prev);
    }
  }, [isMobile]);

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
    onStatusChange: (status) => {
      console.log('Stream status changed:', status);
    }
  });

  // Attach stream to video element (prefer localStream when live, otherwise use previewStream)
  useEffect(() => {
    if (videoRef.current) {
      const streamToUse = isStreaming ? localStream : previewStream;
      if (streamToUse) {
        videoRef.current.srcObject = streamToUse;
      }
    }
  }, [localStream, previewStream, isStreaming]);

  // Handle mic toggle
  const toggleMic = () => {
    const activeStream = isStreaming ? localStream : previewStream;
    if (activeStream) {
      activeStream.getAudioTracks().forEach(track => {
        track.enabled = !isMicEnabled;
      });
      setIsMicEnabled(!isMicEnabled);
    }
  };

  // Handle video toggle
  const toggleVideo = () => {
    const activeStream = isStreaming ? localStream : previewStream;
    if (activeStream) {
      activeStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle go live
  const handleGoLive = async () => {
    try {
      await startStream();
    } catch (error) {
      console.error('Failed to start stream:', error);
    }
  };

  // Handle end stream
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

  // Loading state
  if (battleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="w-full max-w-6xl aspect-video" />
      </div>
    );
  }

  // Not a participant
  if (!barberPosition) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground text-center">
          You are not a participant in this battle.
        </p>
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
      className={cn(
        "min-h-screen bg-black text-white",
        isMobile && "theater-mode"
      )}
      onClick={handleScreenTap}
    >
      {/* Top Bar - auto-hide on mobile */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent p-3 pt-safe controls-overlay",
        isMobile && !showControls && "controls-hidden"
      )}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2 md:gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); navigate(-1); }}
              className="text-white hover:bg-white/20 w-10 h-10 md:w-10 md:h-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-bold text-sm md:text-lg truncate">{battle?.title}</h1>
              <p className="text-white/60 text-xs hidden md:block">Contender Theater</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            {isStreaming && (
              <>
                <Badge className="bg-red-600 text-white animate-pulse text-xs">
                  <Radio className="w-3 h-3 mr-1" />
                  LIVE
                </Badge>
                <div className="hidden md:flex items-center gap-2 text-white/80">
                  <Users className="w-4 h-4" />
                  <span className="font-mono text-sm">{viewerCount}</span>
                </div>
                <div className="hidden md:flex items-center gap-2 text-white/80">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono text-sm">{formattedDuration}</span>
                </div>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="text-white hover:bg-white/20 w-10 h-10"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile optimized */}
      <div className={cn(
        "flex items-center justify-center",
        isMobile 
          ? "fixed inset-0 flex-col" 
          : "pt-20 pb-32 px-4 min-h-screen"
      )}>
        <div className={cn(
          "w-full",
          isMobile 
            ? "h-full flex flex-col" 
            : "max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-4"
        )}>
          {/* Your Camera - Large */}
          <div className={cn(
            "relative bg-muted/10 overflow-hidden",
            isMobile 
              ? "flex-[3] border-b border-cyan/20" 
              : "aspect-video rounded-xl border-2 border-primary/50"
          )}>
            {/* Your Side Label */}
            <div className={cn(
              "absolute z-10 bg-primary text-primary-foreground px-2 py-0.5 md:px-3 md:py-1 rounded-full font-bold text-xs md:text-sm",
              isMobile ? "top-16 left-3" : "top-4 left-4"
            )}>
              YOUR CAMERA
            </div>
            
            {/* Live Status */}
            {isStreaming && (
              <div className={cn(
                "absolute z-10 flex items-center gap-1.5 md:gap-2 bg-red-600 text-white px-2 py-0.5 md:px-3 md:py-1 rounded-full",
                isMobile ? "top-16 right-3" : "top-4 right-4"
              )}>
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="font-bold text-xs md:text-sm">LIVE</span>
              </div>
            )}
            
            {/* Video Preview - Full bleed on mobile */}
            {(previewStream || localStream) ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover",
                  !isVideoEnabled && "hidden"
                )}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 md:gap-4">
                <div className={cn(
                  "rounded-full bg-primary/20 flex items-center justify-center animate-pulse",
                  isMobile ? "w-16 h-16" : "w-20 h-20"
                )}>
                  <Video className={cn(isMobile ? "w-8 h-8" : "w-10 h-10", "text-primary")} />
                </div>
                <p className="text-muted-foreground text-sm md:text-base">Starting camera...</p>
              </div>
            )}
            
            {/* Video disabled overlay */}
            {localStream && !isVideoEnabled && (
              <div className="absolute inset-0 bg-muted flex items-center justify-center">
                <VideoOff className={cn(isMobile ? "w-12 h-12" : "w-16 h-16", "text-muted-foreground")} />
              </div>
            )}
            
            {/* Barber name */}
            <div className={cn(
              "absolute bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1.5 md:px-3 md:py-2",
              isMobile ? "bottom-3 left-3" : "bottom-4 left-4"
            )}>
              <p className="font-bold text-sm md:text-base">{currentBarber?.name || 'You'}</p>
              <p className="text-[10px] md:text-xs text-white/60">Barber #{barberPosition}</p>
            </div>
          </div>

          {/* Opponent's Stream */}
          <div className={cn(
            "relative bg-muted/10 overflow-hidden",
            isMobile 
              ? "flex-1 border-t border-border" 
              : "aspect-video rounded-xl border border-border"
          )}>
            {/* Opponent Label */}
            <div className={cn(
              "absolute z-10 bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 md:px-3 md:py-1 rounded-full font-bold text-xs md:text-sm",
              isMobile ? "top-2 left-2" : "top-4 left-4"
            )}>
              OPPONENT
            </div>
            
            {/* Opponent Status */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 md:gap-4">
              <div className={cn(
                "rounded-full bg-white/10 flex items-center justify-center",
                isMobile ? "w-12 h-12" : "w-20 h-20"
              )}>
                <Users className={cn(isMobile ? "w-6 h-6" : "w-10 h-10", "text-white/40")} />
              </div>
              <p className="text-white/60 text-center px-4 text-xs md:text-base">
                {opponentBarber?.name || 'Opponent'} 
                <br />
                <span className="text-[10px] md:text-sm">Waiting for stream...</span>
              </p>
            </div>
            
            {/* Opponent name placeholder */}
            <div className={cn(
              "absolute bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 md:px-3 md:py-2",
              isMobile ? "bottom-2 left-2" : "bottom-4 left-4"
            )}>
              <p className="font-bold text-xs md:text-base">{opponentBarber?.name || 'Opponent'}</p>
              <p className="text-[10px] md:text-xs text-white/60">Barber #{barberPosition === 1 ? 2 : 1}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls - auto-hide on mobile */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black via-black/95 to-transparent controls-overlay",
        isMobile ? "p-4 pb-safe" : "p-6",
        isMobile && !showControls && "controls-hidden"
      )}>
        <div className="max-w-4xl mx-auto">
          <div className={cn(
            "flex items-center justify-center",
            isMobile ? "gap-3" : "gap-4"
          )}>
            {/* Mic Toggle */}
            <Button
              variant="ghost"
              size="lg"
              onClick={(e) => { e.stopPropagation(); toggleMic(); }}
              disabled={!previewStream && !localStream}
              className={cn(
                "rounded-full touch-manipulation",
                isMobile ? "w-12 h-12" : "w-14 h-14",
                isMicEnabled 
                  ? "bg-white/20 text-white hover:bg-white/30" 
                  : "bg-destructive text-white hover:bg-destructive/90"
              )}
            >
              {isMicEnabled ? <Mic className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} /> : <MicOff className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} />}
            </Button>

            {/* Video Toggle */}
            <Button
              variant="ghost"
              size="lg"
              onClick={(e) => { e.stopPropagation(); toggleVideo(); }}
              disabled={!previewStream && !localStream}
              className={cn(
                "rounded-full touch-manipulation",
                isMobile ? "w-12 h-12" : "w-14 h-14",
                isVideoEnabled 
                  ? "bg-white/20 text-white hover:bg-white/30" 
                  : "bg-destructive text-white hover:bg-destructive/90"
              )}
            >
              {isVideoEnabled ? <Video className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} /> : <VideoOff className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} />}
            </Button>

            {/* Go Live / End Stream Button */}
            {!isStreaming ? (
              <Button
                onClick={(e) => { e.stopPropagation(); handleGoLive(); }}
                disabled={!canStart}
                className={cn(
                  "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold rounded-full shadow-lg shadow-red-500/30 touch-manipulation border border-cyan/20",
                  isMobile ? "h-12 px-6 text-sm" : "h-14 px-8 text-lg"
                )}
              >
                <Radio className={cn(isMobile ? "w-4 h-4 mr-1.5" : "w-5 h-5 mr-2")} />
                GO LIVE
              </Button>
            ) : (
              <Button
                onClick={(e) => { e.stopPropagation(); handleEndStream(); }}
                variant="destructive"
                className={cn(
                  "font-bold rounded-full touch-manipulation",
                  isMobile ? "h-12 px-6 text-sm" : "h-14 px-8 text-lg"
                )}
              >
                <Square className={cn(isMobile ? "w-4 h-4 mr-1.5" : "w-5 h-5 mr-2")} />
                END
              </Button>
            )}

            {/* Chat Toggle */}
            <Button
              variant="ghost"
              size="lg"
              onClick={(e) => { e.stopPropagation(); setShowChat(!showChat); }}
              className={cn(
                "rounded-full touch-manipulation",
                isMobile ? "w-12 h-12" : "w-14 h-14",
                showChat 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-white/20 text-white hover:bg-white/30"
              )}
            >
              <MessageCircle className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} />
            </Button>

            {/* Settings - hide on mobile for cleaner look */}
            {!isMobile && (
              <Button
                variant="ghost"
                size="lg"
                onClick={(e) => e.stopPropagation()}
                className="w-14 h-14 rounded-full bg-white/20 text-white hover:bg-white/30"
              >
                <Settings className="w-6 h-6" />
              </Button>
            )}
          </div>

          {/* Stream Status Info - simplified on mobile */}
          {!isMobile && (
            <div className="mt-4 text-center">
              <p className="text-white/60 text-sm">
                {streamStatus === 'idle' && 'Click "GO LIVE" to start broadcasting'}
                {streamStatus === 'connecting' && 'Connecting to stream...'}
                {streamStatus === 'live' && `Broadcasting to ${viewerCount} viewer${viewerCount !== 1 ? 's' : ''}`}
                {streamStatus === 'ended' && 'Stream ended'}
                {streamStatus === 'failed' && 'Stream failed - try again'}
              </p>
            </div>
          )}

          {/* Mobile: Show live stats inline */}
          {isMobile && isStreaming && (
            <div className="flex items-center justify-center gap-4 mt-2 text-white/70 text-xs">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{viewerCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formattedDuration}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
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