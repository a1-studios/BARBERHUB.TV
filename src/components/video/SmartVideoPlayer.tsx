import { useEffect, useRef, useState, useId } from 'react';
import { Stream, type StreamPlayerApi } from '@cloudflare/stream-react';
import { Loader2, RotateCcw } from 'lucide-react';
import { activeVideoStore, useActiveVideoId } from '@/stores/activeVideoStore';
import { OverlayCanvas, type OverlayPayload } from './OverlayCanvas';

interface SmartVideoPlayerProps {
  streamUid?: string | null;
  fallbackUrl?: string | null;
  poster?: string | null;
  captionsVtt?: string | null;
  autoPlayWhenVisible?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  className?: string;
  onEnded?: () => void;
  forceActive?: boolean;
  /** Saved text overlays (from Camera Studio publish) */
  overlayPayload?: OverlayPayload | null;
  /** Show a replay button + tap-to-restart when the video ends */
  enableReplay?: boolean;
}

/**
 * Robust mobile-first VOD player:
 *  - Single decoder via activeVideoStore + IntersectionObserver
 *  - Loading spinner driven by canplay
 *  - Coalesced play/pause (waits for readyState before calling .play)
 *  - Renders saved text overlays as an HTML layer
 *  - Optional replay UI when not auto-advancing
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
  overlayPayload,
  enableReplay = false,
}: SmartVideoPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamApiRef = useRef<StreamPlayerApi | null>(null);
  const instanceId = useId();
  const activeId = useActiveVideoId();
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ended, setEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [vttUrl, setVttUrl] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  // Sidecar VTT for native fallback
  useEffect(() => {
    if (!captionsVtt) { setVttUrl(null); return; }
    const url = URL.createObjectURL(new Blob([captionsVtt], { type: 'text/vtt' }));
    setVttUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [captionsVtt]);

  // Visibility → "active" coordination
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

  // Native fallback: coalesced play/pause
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let cancelled = false;
    const tryPlay = async () => {
      try {
        if (v.readyState < 2) {
          await new Promise<void>((resolve) => {
            const onReady = () => { v.removeEventListener('loadeddata', onReady); resolve(); };
            v.addEventListener('loadeddata', onReady);
          });
        }
        if (cancelled || !mountedRef.current) return;
        await v.play();
      } catch { /* autoplay block or pause raced — fine */ }
    };
    if (shouldPlay && !ended) {
      tryPlay();
    } else {
      v.pause();
    }
    return () => { cancelled = true; };
  }, [shouldPlay, ended]);

  // Cloudflare Stream play/pause
  useEffect(() => {
    const api = streamApiRef.current;
    if (!api) return;
    if (shouldPlay && !ended) {
      api.play?.()?.catch?.(() => {});
    } else {
      api.pause?.();
    }
  }, [shouldPlay, ended]);

  const handleReplay = () => {
    setEnded(false);
    setCurrentTime(0);
    const v = videoRef.current;
    if (v) { v.currentTime = 0; v.play().catch(() => {}); }
    const api = streamApiRef.current;
    if (api) { try { api.currentTime = 0; api.play?.()?.catch?.(() => {}); } catch {} }
  };

  const handleEnded = () => {
    setEnded(true);
    onEnded?.();
  };

  const renderOverlays = () => (
    <>
      {overlayPayload && <OverlayCanvas payload={overlayPayload} currentTime={currentTime} />}
      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
          <Loader2 className="h-8 w-8 text-white/80 animate-spin" />
        </div>
      )}
      {enableReplay && ended && !loop && (
        <button
          onClick={handleReplay}
          className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10"
          aria-label="Replay"
        >
          <span className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/40">
            <RotateCcw className="h-4 w-4" /> Replay
          </span>
        </button>
      )}
    </>
  );

  // Cloudflare Stream path
  if (streamUid) {
    return (
      <div ref={wrapperRef} className={`relative w-full h-full bg-black ${className}`}>
        <Stream
          src={streamUid}
          controls={controls}
          autoplay={shouldPlay}
          muted={muted}
          loop={loop}
          poster={poster ?? undefined}
          responsive
          streamRef={(api) => { streamApiRef.current = api; }}
          onLoadedData={() => setLoading(false)}
          onWaiting={() => setLoading(true)}
          onPlaying={() => setLoading(false)}
          onTimeUpdate={() => {
            const t = streamApiRef.current?.currentTime;
            if (typeof t === 'number') setCurrentTime(t);
          }}
          onEnded={handleEnded}
          className="w-full h-full"
        />
        {renderOverlays()}
      </div>
    );
  }

  // Native fallback
  if (fallbackUrl) {
    return (
      <div ref={wrapperRef} className={`relative w-full h-full bg-black ${className}`}>
        <video
          ref={videoRef}
          src={fallbackUrl}
          poster={poster ?? undefined}
          muted={muted}
          loop={loop}
          controls={controls}
          playsInline
          preload={shouldPlay ? 'auto' : 'metadata'}
          className="w-full h-full object-cover"
          crossOrigin={vttUrl ? 'anonymous' : undefined}
          onLoadedData={() => setLoading(false)}
          onWaiting={() => setLoading(true)}
          onPlaying={() => setLoading(false)}
          onCanPlay={() => setLoading(false)}
          onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
          onEnded={handleEnded}
        >
          {vttUrl && <track kind="subtitles" srcLang="en" src={vttUrl} default />}
        </video>
        {renderOverlays()}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={`w-full h-full bg-muted flex items-center justify-center ${className}`}>
      <p className="text-xs text-muted-foreground">No video</p>
    </div>
  );
}
