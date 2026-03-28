import { useRef, useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Pause, Maximize2, Users, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BrandedVideoPlayerProps {
  src?: string | null;
  poster?: string;
  isLive?: boolean;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  className?: string;
  viewerCount?: number;
  showBranding?: boolean;
  onEnded?: () => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

export const BrandedVideoPlayer = ({
  src,
  poster,
  isLive = false,
  title,
  autoPlay = false,
  muted = true,
  loop = true,
  className = '',
  viewerCount,
  showBranding = true,
  onEnded,
  videoRef: externalRef,
}: BrandedVideoPlayerProps) => {
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoElement = externalRef || internalRef;
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [showControls, setShowControls] = useState(true);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const vid = videoElement.current;
    if (!vid || !src) return;
    vid.load();

    const onPlay = () => { setIsPlaying(true); setHasStarted(true); };
    const onPause = () => setIsPlaying(false);
    const onEnd = () => { setIsPlaying(false); onEnded?.(); };

    vid.addEventListener('play', onPlay);
    vid.addEventListener('pause', onPause);
    vid.addEventListener('ended', onEnd);
    return () => {
      vid.removeEventListener('play', onPlay);
      vid.removeEventListener('pause', onPause);
      vid.removeEventListener('ended', onEnd);
    };
  }, [src]);

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimeout.current);
    setShowControls(true);
    if (isPlaying) {
      hideTimeout.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  useEffect(() => { scheduleHide(); }, [isPlaying]);

  const togglePlay = () => {
    const vid = videoElement.current;
    if (!vid) return;
    if (vid.paused) { vid.play(); } else { vid.pause(); }
    scheduleHide();
  };

  const toggleMute = () => {
    const vid = videoElement.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  };

  const handlePiP = async () => {
    const vid = videoElement.current;
    if (!vid || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await vid.requestPictureInPicture();
      }
    } catch (e) {
      console.error('PiP error:', e);
    }
  };

  if (!src) {
    return (
      <div className={`w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center rounded-lg ${className}`}>
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
            <Play className="w-7 h-7 text-primary/40 ml-0.5" />
          </div>
          <p className="text-muted-foreground text-sm">No video available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full rounded-lg overflow-hidden bg-black group ${className}`}
      onMouseMove={scheduleHide}
      onTouchStart={scheduleHide}
    >
      {/* Small pill watermark at top-center */}
      {showBranding && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none px-3 py-1 rounded-full border border-white/30 bg-black/20 backdrop-blur-sm">
          <span className="text-[10px] font-black tracking-[0.2em] uppercase">
            <span className="text-white/40">BARBER</span>
            <span className="text-primary/50">-HUB</span>
          </span>
        </div>
      )}

      {/* Live badge */}
      {isLive && (
        <div className="absolute top-3 right-3 z-20">
          <Badge variant="destructive" className="bg-red-600 text-white font-bold animate-pulse text-xs px-2 py-1">
            🔴 LIVE
          </Badge>
        </div>
      )}

      {/* Viewer count */}
      {viewerCount != null && viewerCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-3 right-3 z-20 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/20"
          style={isLive ? { top: '2.75rem' } : {}}
        >
          <Users className="w-3.5 h-3.5 text-red-500" />
          <span className="text-white font-bold text-xs">{viewerCount.toLocaleString()}</span>
        </motion.div>
      )}

      {/* Custom play button overlay — shown before first play or when paused */}
      <AnimatePresence>
        {(!hasStarted || (!isPlaying && showControls)) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={togglePlay}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/30"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-110 transition-transform">
              <Play className="w-7 h-7 text-primary-foreground ml-1" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      <AnimatePresence>
        {hasStarted && isPlaying && showControls && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center gap-2"
          >
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            {title && (
              <span className="text-white text-xs truncate flex-1 ml-1">{title}</span>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20 ml-auto" onClick={handlePiP}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Native video element */}
      <video
        ref={videoElement}
        poster={poster}
        autoPlay={autoPlay || isLive}
        muted={isMuted}
        playsInline
        loop={loop}
        controls={false}
        className="w-full h-full object-cover"
        preload="metadata"
        onClick={togglePlay}
      >
        <source src={src} />
      </video>
    </div>
  );
};
