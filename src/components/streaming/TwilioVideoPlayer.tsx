import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, VideoOff, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TwilioVideoPlayerProps {
  stream: MediaStream | null;
  barberName: string;
  isLive: boolean;
  viewerCount?: number;
  className?: string;
  showOverlay?: boolean;
  muted?: boolean;
}

export const TwilioVideoPlayer = ({
  stream,
  barberName,
  isLive,
  viewerCount = 0,
  className,
  showOverlay = true,
  muted = false,
}: TwilioVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      setIsLoading(false);
      setHasError(false);
    } else if (!stream) {
      setIsLoading(true);
    }
  }, [stream]);

  const handleVideoError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleVideoLoaded = () => {
    setIsLoading(false);
  };

  return (
    <div className={cn("relative bg-black rounded-lg overflow-hidden", className)}>
      {/* Loading state */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/90 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">
            {isLive ? 'Connecting to stream...' : 'Waiting for stream...'}
          </p>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/90 z-10">
          <WifiOff className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Stream unavailable</p>
        </div>
      )}

      {/* Offline state */}
      {!isLive && !isLoading && !stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted z-10">
          <VideoOff className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-lg font-medium">{barberName}</p>
          <p className="text-sm text-muted-foreground">Waiting to go live...</p>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        onLoadedData={handleVideoLoaded}
        onError={handleVideoError}
        className="w-full h-full object-cover"
      />

      {/* Overlay with info */}
      {showOverlay && isLive && (
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <Badge variant="destructive" className="animate-pulse">
            <div className="w-2 h-2 rounded-full bg-white mr-1" />
            LIVE
          </Badge>
          {viewerCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {viewerCount}
            </Badge>
          )}
        </div>
      )}

      {/* Barber name overlay */}
      {showOverlay && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <p className="text-white font-semibold">{barberName}</p>
        </div>
      )}
    </div>
  );
};
