import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, Camera, ArrowRight, Loader2 } from 'lucide-react';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BarberHeroStreamControlsProps {
  battleId: string;
  barberName: string;
  onEnterBattle?: () => void;
  className?: string;
}

export const BarberHeroStreamControls = ({
  battleId,
  barberName,
  onEnterBattle,
  className
}: BarberHeroStreamControlsProps) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isEntering, setIsEntering] = useState(false);
  
  const { 
    status: cameraStatus, 
    stream: cameraStream, 
    requestPermission, 
    stopStream 
  } = useCameraPermission();

  // Attach video stream to video element
  useEffect(() => {
    if (videoRef.current && cameraStream && isCameraActive) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, isCameraActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stopStream, audioStream]);

  const handleStartCamera = async () => {
    const stream = await requestPermission();
    if (stream) {
      setIsCameraActive(true);
      // Also request audio
      try {
        const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(audio);
      } catch (e) {
        console.log('Audio permission not granted');
      }
    }
  };

  const handleStopCamera = () => {
    stopStream();
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    setIsCameraActive(false);
  };

  const toggleMic = () => {
    if (audioStream) {
      audioStream.getAudioTracks().forEach(track => {
        track.enabled = !isMicEnabled;
      });
      setIsMicEnabled(!isMicEnabled);
    }
  };

  const toggleVideo = () => {
    if (cameraStream) {
      cameraStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Not active - show start camera overlay (50% smaller)
  if (!isCameraActive) {
    return (
      <div className={cn(
        "relative w-full aspect-[4/3] rounded-md overflow-hidden bg-black/40 backdrop-blur-sm border border-dashed border-cyan/40 ring-cyan-glow",
        className
      )}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <Camera className="w-3 h-3 text-primary" />
          </div>
          <p className="text-white text-[10px] font-medium text-center px-1">
            Your Battle Station
          </p>
          <Button
            onClick={handleStartCamera}
            className="h-6 px-2.5 text-[10px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1"
          >
            <Video className="w-3 h-3" />
            STREAM
          </Button>
        </div>
        
        {/* Your side indicator */}
        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full">
          YOUR SIDE
        </div>
      </div>
    );
  }

  // Camera active - show live preview with controls (50% smaller)
  return (
    <div className={cn(
      "relative w-full aspect-[4/3] rounded-md overflow-hidden bg-black shadow-lg ring-cyan-glow",
      className
    )}>
      {/* Video Preview */}
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
      
      {/* Video disabled placeholder */}
      {!isVideoEnabled && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <VideoOff className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      
      {/* Live indicator */}
      <div className="absolute top-1 left-1 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-1.5 py-0.5">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[8px] text-white font-bold">READY</span>
      </div>
      
      {/* Your side indicator */}
      <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full">
        YOUR SIDE
      </div>
      
      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-1.5">
        {/* Mini controls */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMic}
              className={cn(
                "w-5 h-5 rounded-full",
                isMicEnabled 
                  ? "bg-white/20 text-white hover:bg-white/30" 
                  : "bg-destructive/80 text-white hover:bg-destructive"
              )}
            >
              {isMicEnabled ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVideo}
              className={cn(
                "w-5 h-5 rounded-full",
                isVideoEnabled 
                  ? "bg-white/20 text-white hover:bg-white/30" 
                  : "bg-destructive/80 text-white hover:bg-destructive"
              )}
            >
              {isVideoEnabled ? <Video className="w-2.5 h-2.5" /> : <VideoOff className="w-2.5 h-2.5" />}
            </Button>
          </div>
          
          <Button
            variant="ghost"
            onClick={handleStopCamera}
            className="text-white/70 hover:text-white text-[8px] h-5 px-1.5"
          >
            Stop
          </Button>
        </div>
        
        {/* Enter Battle Button */}
        <Button
          onClick={() => {
            setIsEntering(true);
            // Stop preview streams before navigating - they'll be recreated in ContenderTheater
            stopStream();
            if (audioStream) {
              audioStream.getTracks().forEach(track => track.stop());
            }
            // Navigate to contender theater for full battle experience
            if (onEnterBattle) {
              onEnterBattle();
            } else {
              navigate(`/battle/${battleId}/contender`);
            }
          }}
          disabled={isEntering}
          className="w-full h-6 text-[10px] bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-600 text-white font-bold gap-1 shadow-md"
        >
          {isEntering ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              ENTERING...
            </>
          ) : (
            <>
              ENTER BATTLE
              <ArrowRight className="w-3 h-3" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};