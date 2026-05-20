import { useEffect, useRef, useState, useId } from 'react';
import Hls from 'hls.js';
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
  overlayPayload?: OverlayPayload | null;
  enableReplay?: boolean;
  /**
   * Smart preloading mode (applied only when this player is NOT the active one).
   * - 'none'     : zero bytes, decoder released (default)
   * - 'metadata' : fetch manifest + headers only
   * - 'auto'     : warm the pipe — fetch manifest + first segment so swipe-to-active is instant
   */
  preloadMode?: 'none' | 'metadata' | 'auto';
}

const CF_STREAM_CUSTOMER =
  (import.meta.env.VITE_CF_STREAM_CUSTOMER_CODE as string | undefined) ||
  'q3djo7byzgo7v0c1';

const streamHlsUrl = (uid: string) =>
  `https://customer-${CF_STREAM_CUSTOMER}.cloudflarestream.com/${uid}/manifest/video.m3u8`;
const streamPosterUrl = (uid: string) =>
  `https://customer-${CF_STREAM_CUSTOMER}.cloudflarestream.com/${uid}/thumbnails/thumbnail.jpg`;

/**
 * Single-decoder, single-<video> player.
 * - Cloudflare Stream UIDs play via hls.js (or native HLS on Safari) — no iframe.
 * - R2/MP4 falls back to direct <video src>.
 * - activeVideoStore guarantees only one instance plays at a time.
 * - preload="none" when not active; metadata only when current.
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
  preloadMode = 'none',
}: SmartVideoPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const instanceId = useId();
  const activeId = useActiveVideoId();
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ended, setEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [vttUrl, setVttUrl] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  // Sidecar VTT
  useEffect(() => {
    if (!captionsVtt) { setVttUrl(null); return; }
    const url = URL.createObjectURL(new Blob([captionsVtt], { type: 'text/vtt' }));
    setVttUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [captionsVtt]);

  // Visibility coordination — skip when forceActive is driven externally (e.g. WatchFeed)
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || forceActive) return;
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
  }, [instanceId, autoPlayWhenVisible, forceActive]);

  const shouldPlay = forceActive || (isVisible && activeId === instanceId);

  // Resolve the canonical src for this player
  const src = streamUid ? streamHlsUrl(streamUid) : fallbackUrl || '';
  const effectivePoster = poster || (streamUid ? streamPosterUrl(streamUid) : undefined);
  const isHls = !!streamUid;

  // Reset loading whenever the underlying source changes
  useEffect(() => { setLoading(true); setEnded(false); }, [src]);

  // Attach source when active OR prefetching. Release decoder when fully idle.
  const shouldAttach = shouldPlay || preloadMode !== 'none';

  // Effect A — lifecycle: create/destroy hls based on shouldAttach ONLY.
  // Do NOT depend on shouldPlay here, otherwise the prefetched HLS gets
  // destroyed the moment it becomes active (throwing away the warmed buffer).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;

    if (!shouldAttach) {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      try { v.pause(); v.removeAttribute('src'); v.load(); } catch { /* ignore */ }
      return;
    }

    if (isHls && !v.canPlayType('application/vnd.apple.mpegurl') && Hls.isSupported()) {
      // Start with prefetch-friendly config; Effect B raises caps on activation.
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 4,
        maxMaxBufferLength: 6,
        backBufferLength: 0,
        startLevel: 0,           // lowest rendition first → instant first frame on mobile
        testBandwidth: false,
        capLevelToPlayerSize: true,
        capLevelOnFPSDrop: true,
        autoStartLoad: false,    // we trigger loading manually
      });
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        hls.startLoad();
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) hls.recoverMediaError();
      });
      hlsRef.current = hls;
    } else {
      // Native (Safari HLS or MP4): the <video preload> attribute does the work.
      v.src = src;
      try { v.load(); } catch { /* ignore */ }
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      try { v.removeAttribute('src'); v.load(); } catch { /* ignore */ }
    };
  }, [src, isHls, shouldAttach]);

  // Effect B — reconfigure the existing hls instance when active state flips.
  // No destroy; just raise buffer caps so the warmed prefetch survives.
  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls) return;
    if (shouldPlay) {
      hls.config.maxBufferLength = 30;
      hls.config.maxMaxBufferLength = 60;
      hls.config.backBufferLength = 10;
      try { hls.startLoad(); } catch { /* already loading */ }
    } else {
      hls.config.maxBufferLength = 4;
      hls.config.maxMaxBufferLength = 6;
      hls.config.backBufferLength = 0;
    }
  }, [shouldPlay]);

  // Play / pause coalesced
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let cancelled = false;
    let timeoutId: number | undefined;
    const tryPlay = async () => {
      try {
        if (v.readyState < 2) {
          await new Promise<void>((resolve, reject) => {
            const onReady = () => { cleanup(); resolve(); };
            const cleanup = () => {
              v.removeEventListener('loadeddata', onReady);
              v.removeEventListener('canplay', onReady);
              if (timeoutId) window.clearTimeout(timeoutId);
            };
            v.addEventListener('loadeddata', onReady);
            v.addEventListener('canplay', onReady);
            timeoutId = window.setTimeout(() => { cleanup(); reject(new Error('load-timeout')); }, 6000);
          });
        }
        if (cancelled || !mountedRef.current) return;
        await v.play();
      } catch { /* autoplay block, pause race, or timeout — leave paused */ }
    };
    if (shouldPlay && !ended) tryPlay();
    else v.pause();
    return () => { cancelled = true; if (timeoutId) window.clearTimeout(timeoutId); };
  }, [shouldPlay, ended]);

  const handleReplay = () => {
    setEnded(false);
    setCurrentTime(0);
    const v = videoRef.current;
    if (v) { v.currentTime = 0; v.play().catch(() => {}); }
  };

  const handleEnded = () => {
    setEnded(true);
    onEnded?.();
  };

  if (!src) {
    return (
      <div ref={wrapperRef} className={`w-full h-full bg-black flex items-center justify-center ${className}`}>
        <p className="text-xs text-muted-foreground">No video</p>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={`relative w-full h-full bg-black ${className}`}>
      <video
        ref={videoRef}
        poster={effectivePoster ?? undefined}
        muted={muted}
        loop={loop}
        controls={controls}
        playsInline
        preload={shouldPlay ? 'metadata' : preloadMode}
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

      {overlayPayload && <OverlayCanvas payload={overlayPayload} currentTime={currentTime} />}

      {loading && shouldPlay && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
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
    </div>
  );
}
