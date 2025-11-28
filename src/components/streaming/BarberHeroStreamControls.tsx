import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, Camera, ArrowRight } from 'lucide-react';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { cn } from '@/lib/utils';

interface BarberHeroStreamControlsProps {
  battleId: string;
  barberName: string;
  onEnterBattle: () => void;
  className?: string;
}

export const BarberHeroStreamControls = ({
  battleId,
  barberName,
  onEnterBattle,
  className
}: BarberHeroStreamControlsProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  
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

  // Not active - show start camera overlay
  if (!isCameraActive) {
    return (
      <div className={cn(
        "relative w-full aspect-square rounded-lg overflow-hidden bg-black/40 backdrop-blur-sm border-2 border-dashed border-primary/50",
        className
      )}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <Camera className="w-6 h-6 text-primary" />
          </div>
          <p className="text-white text-xs font-medium text-center px-2">
            Your Battle Station
          </p>
          <Button
            onClick={handleStartCamera}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2"
          >
            <Video className="w-4 h-4" />
            START CAMERA
          </Button>
        </div>
        
        {/* Your side indicator */}
        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
          YOUR SIDE
        </div>
      </div>
    );
  }

  // Camera active - show live preview with controls
  return (
    <div className={cn(
      "relative w-full aspect-square rounded-lg overflow-hidden bg-black shadow-xl",
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
          <VideoOff className="w-12 h-12 text-muted-foreground" />
        </div>
      )}
      
      {/* Live indicator */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] text-white font-bold">CAMERA READY</span>
      </div>
      
      {/* Your side indicator */}
      <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
        YOUR SIDE
      </div>
      
      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3">
        {/* Mini controls */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMic}
              className={cn(
                "w-8 h-8 rounded-full",
                isMicEnabled 
                  ? "bg-white/20 text-white hover:bg-white/30" 
                  : "bg-destructive/80 text-white hover:bg-destructive"
              )}
            >
              {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVideo}
              className={cn(
                "w-8 h-8 rounded-full",
                isVideoEnabled 
                  ? "bg-white/20 text-white hover:bg-white/30" 
                  : "bg-destructive/80 text-white hover:bg-destructive"
              )}
            >
              {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStopCamera}
            className="text-white/70 hover:text-white text-xs h-8 px-2"
          >
            Stop
          </Button>
        </div>
        
        {/* Enter Battle Button */}
        <Button
          onClick={onEnterBattle}
          className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-600 text-white font-bold gap-2 shadow-lg"
        >
          ENTER BATTLE
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
