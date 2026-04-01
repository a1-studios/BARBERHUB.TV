import { Stream } from '@cloudflare/stream-react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface CloudflareStreamPlayerProps {
  /** Cloudflare Stream video UID — renders adaptive HLS player when set */
  streamUid?: string | null;
  /** Fallback direct URL (R2 / legacy) — native <video> when no streamUid */
  fallbackUrl?: string | null;
  /** Custom poster image */
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  className?: string;
  /** Reason shown when neither UID nor fallback is available */
  processingMessage?: string;
  /** Called when the video finishes playing */
  onEnded?: () => void;
}

/**
 * Unified VOD player:
 *  1. Cloudflare Stream <Stream> component (adaptive HLS) when streamUid is set
 *  2. Native <video> fallback for R2 URLs
 *  3. Polished transcoding/processing state when neither is available
 */
export const CloudflareStreamPlayer = ({
  streamUid,
  fallbackUrl,
  poster,
  autoPlay = true,
  muted = true,
  loop = false,
  controls = true,
  className = '',
  processingMessage = 'Optimizing for high-quality playback…',
}: CloudflareStreamPlayerProps) => {
  // Priority 1: Cloudflare Stream adaptive player
  if (streamUid) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        <Stream
          src={streamUid}
          controls={controls}
          autoplay={autoPlay}
          muted={muted}
          loop={loop}
          poster={poster}
          responsive
          className="w-full h-full"
        />
      </div>
    );
  }

  // Priority 2: Legacy R2 / direct URL fallback
  if (fallbackUrl) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        <video
          src={fallbackUrl}
          poster={poster}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          controls={controls}
          playsInline
          className="w-full h-full object-cover"
          preload="metadata"
        />
      </div>
    );
  }

  // Priority 3: Transcoding / processing state
  return (
    <div className={`w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center rounded-lg ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4 px-6"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 mx-auto"
        >
          <Loader2 className="w-12 h-12 text-primary" />
        </motion.div>

        <div>
          <p className="text-foreground font-semibold text-sm">Video Processing</p>
          <p className="text-muted-foreground text-xs mt-1">{processingMessage}</p>
        </div>

        <motion.div className="w-48 h-1 bg-muted rounded-full mx-auto overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '40%' }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};
