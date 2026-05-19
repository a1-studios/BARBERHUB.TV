import { useEffect, useRef, useState } from 'react';

export interface SavedOverlay {
  id: string;
  type?: string;
  text: string;
  style?: {
    font_family?: string;
    font_size?: number;
    color?: string;
    background?: 'none' | 'solid';
  };
  position?: { x?: number; y?: number; anchor?: string };
  timing?: { start?: number; end?: number };
}

export interface OverlayPayload {
  version?: number;
  reference_resolution?: { width: number; height: number };
  aspect?: '9:16' | '16:9' | string;
  overlays?: SavedOverlay[];
}

interface Props {
  payload?: OverlayPayload | null;
  /** Current playback time in seconds, driven by the host player */
  currentTime: number;
  className?: string;
}

/**
 * Renders saved text overlays from a Camera Studio publish on top of any video player.
 * Pure presentation — no <video> ownership. Scales font size based on container width
 * relative to the payload's reference resolution.
 */
export function OverlayCanvas({ payload, currentTime, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const overlays = payload?.overlays ?? [];
  if (!overlays.length) {
    return <div ref={ref} className={`pointer-events-none absolute inset-0 ${className}`} />;
  }

  const refWidth = payload?.reference_resolution?.width ?? 1080;
  // Fallback ratio matches the review sheet's *0.5 visual when refWidth ≈ 1080 and stage ≈ 540
  const scale = width > 0 ? width / refWidth : 0.5;

  return (
    <div
      ref={ref}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {overlays.map((o) => {
        const start = o.timing?.start ?? 0;
        const end = o.timing?.end ?? Number.POSITIVE_INFINITY;
        if (currentTime < start || currentTime > end) return null;

        const x = o.position?.x ?? 0.5;
        const y = o.position?.y ?? 0.5;
        const fontSize = (o.style?.font_size ?? 42) * scale;
        const color = o.style?.color ?? '#FFFFFF';
        const fontFamily = `'${o.style?.font_family ?? 'Inter'}', sans-serif`;
        const solid = o.style?.background === 'solid';

        return (
          <div
            key={o.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded ${
              solid ? 'bg-black/80' : ''
            }`}
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              color,
              fontFamily,
              fontSize: `${fontSize}px`,
              lineHeight: 1.1,
              textShadow: solid ? 'none' : '0 1px 3px rgba(0,0,0,0.7)',
              maxWidth: '92%',
              whiteSpace: 'pre-wrap',
              textAlign: 'center',
            }}
          >
            {o.text}
          </div>
        );
      })}
    </div>
  );
}
