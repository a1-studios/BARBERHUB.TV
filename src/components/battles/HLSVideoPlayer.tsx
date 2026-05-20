import { useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Play } from 'lucide-react';
import { CloudflareStreamPlayer } from '@/components/CloudflareStreamPlayer';
import { toCdnUrl } from '@/lib/mediaCdn';

interface HLSVideoPlayerProps {
  src?: string | null;
  poster?: string;
  isLive?: boolean;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  /** Cloudflare Stream UID — when set, renders adaptive HLS via Stream component */
  streamUid?: string | null;
}

export const HLSVideoPlayer = ({
  src: rawSrc,
  poster: rawPoster,
  isLive = false,
  title,
  autoPlay = false,
  muted = true,
  className = '',
  size = 'medium',
  streamUid,
}: HLSVideoPlayerProps) => {
  const src = toCdnUrl(rawSrc);
  const poster = toCdnUrl(rawPoster);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && src && !streamUid) {
      videoRef.current.load();
    }
  }, [src, streamUid]);

  // Cloudflare Stream adaptive player takes priority
  if (streamUid) {
    return (
      <div className={`relative w-full h-full rounded-lg overflow-hidden ${className}`}>
        {isLive && (
          <div className={`absolute ${size === 'large' ? 'top-4 left-4' : 'top-2 left-2'} z-10`}>
            <Badge variant="destructive" className="bg-red-600 text-white font-bold animate-pulse text-xs px-2 py-1">
              🔴 LIVE
            </Badge>
          </div>
        )}
        <CloudflareStreamPlayer
          streamUid={streamUid}
          poster={poster}
          autoPlay={autoPlay || isLive}
          muted={muted}
        />
      </div>
    );
  }

  if (!src) {
    return (
      <div className={`w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center rounded-lg ${className}`}>
        <div className="text-center space-y-3">
          <Play className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No video available</p>
        </div>
      </div>
    );
  }

  const badgeSizeClasses = {
    small: 'text-[8px] px-1.5 py-0.5',
    medium: 'text-xs px-2 py-1',
    large: 'text-sm px-3 py-1.5',
  };

  return (
    <div className={`relative w-full h-full rounded-lg overflow-hidden ${className}`}>
      {isLive && (
        <div className={`absolute ${size === 'large' ? 'top-4 left-4' : 'top-2 left-2'} z-10`}>
          <Badge
            variant="destructive"
            className={`bg-red-600 text-white font-bold animate-pulse ${badgeSizeClasses[size]}`}
          >
            🔴 LIVE
          </Badge>
        </div>
      )}

      {title && size !== 'large' && (
        <div className={`absolute ${size === 'medium' ? 'bottom-2 left-2 right-2' : 'bottom-1 left-1 right-1'} z-10`}>
          <div className="bg-black/70 backdrop-blur-sm rounded text-white truncate text-xs px-2 py-1">
            {title}
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        controls
        autoPlay={autoPlay || isLive}
        muted={muted}
        poster={poster}
        playsInline
        className="w-full h-full object-cover"
        preload="metadata"
      >
        <source src={src} />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};
