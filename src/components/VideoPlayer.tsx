import { useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';
import { toCdnUrl } from '@/lib/mediaCdn';

interface VideoPlayerProps {
  src?: string;
  poster?: string;
  className?: string;
  isLive?: boolean;
  autoPlay?: boolean;
}

export const VideoPlayer = ({ 
  src: rawSrc, 
  poster: rawPoster, 
  className = '',
  isLive = false,
  autoPlay = false 
}: VideoPlayerProps) => {
  const src = toCdnUrl(rawSrc);
  const poster = toCdnUrl(rawPoster);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && src) {
      videoRef.current.load();
    }
  }, [src]);

  const handlePictureInPicture = async () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (error) {
        console.error('PiP error:', error);
      }
    }
  };

  if (!src) {
    return (
      <div className={`${className} bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20 flex items-center justify-center`}>
        <p className="text-sm text-muted-foreground">No video available</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLive && (
        <Badge variant="destructive" className="absolute top-2 left-2 z-10 bg-red-600 text-white animate-pulse">
          🔴 LIVE
        </Badge>
      )}
      
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        {document.pictureInPictureEnabled && (
          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={handlePictureInPicture}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <video
        ref={videoRef}
        controls
        poster={poster}
        autoPlay={autoPlay || isLive}
        muted={isLive}
        className="w-full h-full rounded-lg"
        preload="metadata"
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};
