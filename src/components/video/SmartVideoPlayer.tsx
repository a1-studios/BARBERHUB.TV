import { useEffect, useRef, useState, useCallback, useId } from 'react';
import { activeVideoStore, useActiveVideoId } from '@/stores/activeVideoStore';
import { CloudflareStreamPlayer } from '@/components/CloudflareStreamPlayer';

interface SmartVideoPlayerProps {
  /** Cloudflare Stream UID (preferred — adaptive HLS) */
  streamUid?: string | null;
  /** Direct video URL fallback (R2 MP4) */
  fallbackUrl?: string | null;
  poster?: string | null;
  captionsVtt?: string | null;
  /** When true, video is allowed to autoplay when visible. */
  autoPlayWhenVisible?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  className?: string;
  onEnded?: () => void;
  /** Force-play override (e.g. for active TikTok-feed item) */
  forceActive?: boolean;
}

/**
 * Enterprise-grade video player wrapper:
 *  - IntersectionObserver: pauses off-screen videos (frees GPU decoder)
 *  - Single-decoder guard via activeVideoStore (mobile-friendly)
 *  - Poster-first paint (no black flash)
 *  - Prefers Cloudflare Stream (ABR HLS) over raw R2 MP4
 *  - Sidecar WebVTT captions for the native fallback path
 */
export function SmartVideoPlayer({
  streamUid,
  fallbackUrl,
  poster,
  captionsVtt,
  autoPlayWhenVisible = true,
  muted = true,
  loop = false,
  controls = false,
  className = '',
  onEnded,
  forceActive = false,
}: SmartVideoPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const instanceId = useId();
  const activeId = useActiveVideoId();
  const [isVisible, setIsVisible] = useState(false);
  const [vttUrl, setVttUrl] = useState<string | null>(null);

  // Build a blob URL for sidecar VTT captions (native fallback only)
  useEffect(() => {
    if (!captionsVtt) {
      setVttUrl(null);
      return;
    }
    const blob = new Blob([captionsVtt], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    setVttUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [captionsVtt]);

  // IntersectionObserver — only the most-visible video is "active"
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.6;
        setIsVisible(visible);
        if (visible && autoPlayWhenVisible) activeVideoStore.set(instanceId);
        else if (activeVideoStore.get() === instanceId) activeVideoStore.set(null);
      },
      { threshold: [0, 0.6, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [instanceId, autoPlayWhenVisible]);

  const shouldPlay = forceActive || (isVisible && activeId === instanceId);

  // Apply play/pause to native fallback video imperatively
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (shouldPlay) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [shouldPlay]);

  // Cloudflare Stream path
  if (streamUid) {
    return (
      <div ref={wrapperRef} className={`relative w-full h-full ${className}`}>
        <CloudflareStreamPlayer
          streamUid={streamUid}
          fallbackUrl={fallbackUrl ?? undefined}
          poster={poster ?? undefined}
          autoPlay={shouldPlay}
          muted={muted}
          loop={loop}
          controls={controls}
          onEnded={onEnded}
        />
      </div>
    );
  }

  // Native fallback path
  if (fallbackUrl) {
    return (
      <div ref={wrapperRef} className={`relative w-full h-full ${className}`}>
        <video
          ref={videoRef}
          src={fallbackUrl}
          poster={poster ?? undefined}
          muted={muted}
          loop={loop}
          controls={controls}
          playsInline
          preload={shouldPlay ? 'auto' : 'metadata'}
          onEnded={onEnded}
          className="w-full h-full object-cover"
          crossOrigin={vttUrl ? 'anonymous' : undefined}
        >
          {vttUrl && <track kind="subtitles" srcLang="en" src={vttUrl} default />}
        </video>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`w-full h-full bg-muted flex items-center justify-center ${className}`}
    >
      <p className="text-xs text-muted-foreground">No video</p>
    </div>
  );
}
