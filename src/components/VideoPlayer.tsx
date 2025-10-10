import { useRef, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Maximize2, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VideoPlayerProps {
  src?: string;
  youtubeVideoId?: string;
  poster?: string;
  className?: string;
  isLive?: boolean;
  autoPlay?: boolean;
}

export const VideoPlayer = ({ 
  src, 
  youtubeVideoId,
  poster, 
  className = '',
  isLive = false,
  autoPlay = false 
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [quality, setQuality] = useState<'auto' | 'hd720' | 'hd1080'>('auto');

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

  // YouTube embed mode
  if (youtubeVideoId) {
    const embedUrl = new URL(`https://www.youtube.com/embed/${youtubeVideoId}`);
    embedUrl.searchParams.set('autoplay', autoPlay || isLive ? '1' : '0');
    embedUrl.searchParams.set('mute', isLive ? '1' : '0');
    embedUrl.searchParams.set('controls', '1');
    embedUrl.searchParams.set('modestbranding', '1');
    embedUrl.searchParams.set('rel', '0');
    
    if (quality !== 'auto') {
      embedUrl.searchParams.set('vq', quality);
    }

    return (
      <div className={`relative ${className}`}>
        {isLive && (
          <Badge 
            variant="destructive" 
            className="absolute top-2 left-2 z-10 bg-red-600 text-white animate-pulse"
          >
            🔴 LIVE
          </Badge>
        )}
        
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="secondary" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setQuality('auto')}>
                {quality === 'auto' && '✓ '}Auto Quality
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setQuality('hd720')}>
                {quality === 'hd720' && '✓ '}720p HD
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setQuality('hd1080')}>
                {quality === 'hd1080' && '✓ '}1080p HD
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <iframe
          src={embedUrl.toString()}
          className="w-full h-full rounded-lg border border-primary/20"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  // Standard video player mode
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
        <Badge 
          variant="destructive" 
          className="absolute top-2 left-2 z-10 bg-red-600 text-white animate-pulse"
        >
          🔴 LIVE
        </Badge>
      )}
      
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        {document.pictureInPictureEnabled && (
          <Button 
            size="icon" 
            variant="secondary" 
            className="h-8 w-8"
            onClick={handlePictureInPicture}
          >
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
