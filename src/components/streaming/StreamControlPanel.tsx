import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Radio, 
  Square, 
  Users, 
  Clock,
  AlertCircle,
  Loader2,
  Camera,
} from 'lucide-react';
import { useTwilioStream, StreamStatus } from '@/hooks/useTwilioStream';
import { CameraPermissionPrompt } from '@/components/camera/CameraPermissionPrompt';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { cn } from '@/lib/utils';

interface StreamControlPanelProps {
  battleId: string;
  barberPosition: 1 | 2;
  barberName: string;
  onStreamStatusChange?: (isLive: boolean) => void;
}

export const StreamControlPanel = ({
  battleId,
  barberPosition,
  barberName,
  onStreamStatusChange,
}: StreamControlPanelProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  
  const { status: cameraStatus, requestPermission, isGranted } = useCameraPermission();

  const {
    status,
    localStream,
    error,
    viewerCount,
    formattedDuration,
    startStream,
    endStream,
    isStreaming,
    canStart,
  } = useTwilioStream({
    battleId,
    barberPosition,
    onStatusChange: (newStatus) => {
      onStreamStatusChange?.(newStatus === 'live');
    },
  });

  // Update video preview when stream starts
  useEffect(() => {
    if (videoPreviewRef.current && localStream) {
      videoPreviewRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Toggle audio
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Handle go live click
  const handleGoLive = async () => {
    if (!isGranted) {
      const stream = await requestPermission();
      if (!stream) return;
    }
    
    try {
      await startStream();
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to start stream:', error);
    }
  };

  // Get status color and text
  const getStatusInfo = (status: StreamStatus) => {
    switch (status) {
      case 'live':
        return { color: 'bg-red-500', text: 'LIVE', pulse: true };
      case 'connecting':
        return { color: 'bg-yellow-500', text: 'Connecting...', pulse: true };
      case 'ended':
        return { color: 'bg-muted', text: 'Ended', pulse: false };
      case 'failed':
        return { color: 'bg-destructive', text: 'Failed', pulse: false };
      default:
        return { color: 'bg-muted', text: 'Offline', pulse: false };
    }
  };

  const statusInfo = getStatusInfo(status);

  // Show camera permission prompt if not granted
  if (!isGranted && !isStreaming && cameraStatus !== 'idle') {
    return (
      <Card className="card-gradient border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Camera Access Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CameraPermissionPrompt 
            status={cameraStatus}
            onRequestPermission={() => requestPermission()}
            onUploadInstead={() => {}} // Not applicable for streaming
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-gradient border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Radio className={cn("h-5 w-5", isStreaming && "text-red-500")} />
            Stream Control
          </CardTitle>
          <Badge 
            variant="outline" 
            className={cn(
              "flex items-center gap-1",
              statusInfo.pulse && "animate-pulse",
              isStreaming && "bg-red-500/20 border-red-500 text-red-500"
            )}
          >
            <div className={cn("w-2 h-2 rounded-full", statusInfo.color)} />
            {statusInfo.text}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Video Preview */}
        {(showPreview || isStreaming) && (
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              playsInline
              className={cn(
                "w-full h-full object-cover",
                isVideoOff && "hidden"
              )}
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <VideoOff className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            
            {/* Live indicator overlay */}
            {isStreaming && (
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <Badge variant="destructive" className="animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-white mr-1 animate-pulse" />
                  LIVE
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {viewerCount}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formattedDuration}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Stream info when live */}
        {isStreaming && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">{viewerCount}</div>
              <div className="text-xs text-muted-foreground">Viewers</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{formattedDuration}</div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-green-500">Good</div>
              <div className="text-xs text-muted-foreground">Quality</div>
            </div>
          </div>
        )}

        {/* Control buttons */}
        <div className="flex items-center gap-2">
          {canStart ? (
            <Button 
              onClick={handleGoLive}
              disabled={status === 'connecting'}
              className="flex-1 bg-red-600 hover:bg-red-700"
              size="lg"
            >
              {status === 'connecting' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Radio className="mr-2 h-4 w-4" />
                  Go LIVE
                </>
              )}
            </Button>
          ) : isStreaming ? (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMute}
                className={cn(isMuted && "bg-destructive/20 border-destructive")}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleVideo}
                className={cn(isVideoOff && "bg-destructive/20 border-destructive")}
              >
                {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={endStream}
              >
                <Square className="mr-2 h-4 w-4" />
                End Stream
              </Button>
            </>
          ) : null}
        </div>

        {/* Tips for new streamers */}
        {canStart && status === 'idle' && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 <strong>Tips for a great stream:</strong></p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Ensure good lighting on your work area</li>
              <li>Use a stable internet connection (10+ Mbps upload)</li>
              <li>Position camera to clearly show your cutting technique</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
