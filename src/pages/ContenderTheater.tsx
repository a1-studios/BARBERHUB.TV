import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTwilioStream } from '@/hooks/useTwilioStream';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [barberPosition, setBarberPosition] = useState<1 | 2 | null>(null);

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

  // Attach local stream to video element
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Handle mic toggle
  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMicEnabled;
      });
      setIsMicEnabled(!isMicEnabled);
    }
  };

  // Handle video toggle
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
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
    <div className="min-h-screen bg-black text-white">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">{battle?.title}</h1>
              <p className="text-white/60 text-sm">Contender Theater</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isStreaming && (
              <>
                <Badge className="bg-red-600 text-white animate-pulse">
                  <Radio className="w-3 h-3 mr-1" />
                  LIVE
                </Badge>
                <div className="flex items-center gap-2 text-white/80">
                  <Users className="w-4 h-4" />
                  <span className="font-mono">{viewerCount}</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono">{formattedDuration}</span>
                </div>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-32 px-4 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Your Camera - Large */}
          <Card className="relative aspect-video bg-muted/10 border-2 border-primary/50 overflow-hidden">
            {/* Your Side Label */}
            <div className="absolute top-4 left-4 z-10 bg-primary text-primary-foreground px-3 py-1 rounded-full font-bold text-sm">
              YOUR CAMERA
            </div>
            
            {/* Live Status */}
            {isStreaming && (
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="font-bold text-sm">LIVE</span>
              </div>
            )}
            
            {/* Video Preview */}
            {localStream ? (
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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <Video className="w-10 h-10 text-primary" />
                </div>
                <p className="text-muted-foreground">Camera not active</p>
              </div>
            )}
            
            {/* Video disabled overlay */}
            {localStream && !isVideoEnabled && (
              <div className="absolute inset-0 bg-muted flex items-center justify-center">
                <VideoOff className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            
            {/* Barber name */}
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="font-bold">{currentBarber?.name || 'You'}</p>
              <p className="text-xs text-white/60">Barber #{barberPosition}</p>
            </div>
          </Card>

          {/* Opponent's Stream */}
          <Card className="relative aspect-video bg-muted/10 border border-border overflow-hidden">
            {/* Opponent Label */}
            <div className="absolute top-4 left-4 z-10 bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full font-bold text-sm">
              OPPONENT
            </div>
            
            {/* Opponent Status */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                <Users className="w-10 h-10 text-white/40" />
              </div>
              <p className="text-white/60 text-center px-4">
                {opponentBarber?.name || 'Opponent'} 
                <br />
                <span className="text-sm">Waiting for stream...</span>
              </p>
            </div>
            
            {/* Opponent name placeholder */}
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="font-bold">{opponentBarber?.name || 'Opponent'}</p>
              <p className="text-xs text-white/60">Barber #{barberPosition === 1 ? 2 : 1}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black via-black/95 to-transparent p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4">
            {/* Mic Toggle */}
            <Button
              variant="ghost"
              size="lg"
              onClick={toggleMic}
              disabled={!localStream}
              className={cn(
                "w-14 h-14 rounded-full",
                isMicEnabled 
                  ? "bg-white/20 text-white hover:bg-white/30" 
                  : "bg-destructive text-white hover:bg-destructive/90"
              )}
            >
              {isMicEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </Button>

            {/* Video Toggle */}
            <Button
              variant="ghost"
              size="lg"
              onClick={toggleVideo}
              disabled={!localStream}
              className={cn(
                "w-14 h-14 rounded-full",
                isVideoEnabled 
                  ? "bg-white/20 text-white hover:bg-white/30" 
                  : "bg-destructive text-white hover:bg-destructive/90"
              )}
            >
              {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </Button>

            {/* Go Live / End Stream Button */}
            {!isStreaming ? (
              <Button
                onClick={handleGoLive}
                disabled={!canStart}
                className="h-14 px-8 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold text-lg rounded-full shadow-lg shadow-red-500/30"
              >
                <Radio className="w-5 h-5 mr-2" />
                GO LIVE
              </Button>
            ) : (
              <Button
                onClick={handleEndStream}
                variant="destructive"
                className="h-14 px-8 font-bold text-lg rounded-full"
              >
                <Square className="w-5 h-5 mr-2" />
                END STREAM
              </Button>
            )}

            {/* Chat Toggle */}
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setShowChat(!showChat)}
              className={cn(
                "w-14 h-14 rounded-full",
                showChat 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-white/20 text-white hover:bg-white/30"
              )}
            >
              <MessageCircle className="w-6 h-6" />
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="lg"
              className="w-14 h-14 rounded-full bg-white/20 text-white hover:bg-white/30"
            >
              <Settings className="w-6 h-6" />
            </Button>
          </div>

          {/* Stream Status Info */}
          <div className="mt-4 text-center">
            <p className="text-white/60 text-sm">
              {streamStatus === 'idle' && 'Click "GO LIVE" to start broadcasting'}
              {streamStatus === 'connecting' && 'Connecting to stream...'}
              {streamStatus === 'live' && `Broadcasting to ${viewerCount} viewer${viewerCount !== 1 ? 's' : ''}`}
              {streamStatus === 'ended' && 'Stream ended'}
              {streamStatus === 'failed' && 'Stream failed - try again'}
            </p>
          </div>
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
