import { useEffect, useRef, useState } from 'react';

interface Props {
  videoUrl: string;
  duration: number;
  trim: { start: number; end: number } | null;
  onChange: (next: { start: number; end: number } | null) => void;
}

/** Dual-handle trim slider over a video timeline. */
export function TrimSlider({ videoUrl, duration, trim, onChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const start = trim?.start ?? 0;
  const end = trim?.end ?? duration;
  const [active, setActive] = useState<'start' | 'end' | null>(null);

  const pct = (v: number) => (duration > 0 ? (v / duration) * 100 : 0);

  const fromClientX = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  useEffect(() => {
    if (!active) return;
    const move = (e: PointerEvent) => {
      const t = fromClientX(e.clientX);
      if (active === 'start') onChange({ start: Math.min(t, end - 0.5), end });
      else onChange({ start, end: Math.max(t, start + 0.5) });
      if (videoRef.current) videoRef.current.currentTime = t;
    };
    const up = () => setActive(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [active, start, end, duration, onChange]);

  return (
    <div className="space-y-3">
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" muted playsInline />
      </div>

      <div
        ref={trackRef}
        className="relative h-10 bg-muted/50 rounded-md select-none touch-none"
      >
        <div
          className="absolute top-0 bottom-0 bg-primary/20 border-y-2 border-primary"
          style={{ left: `${pct(start)}%`, right: `${100 - pct(end)}%` }}
        />
        <button
          aria-label="Trim start"
          onPointerDown={(e) => {
            e.preventDefault();
            setActive('start');
          }}
          className="absolute top-0 bottom-0 w-3 -ml-1.5 bg-primary rounded cursor-ew-resize"
          style={{ left: `${pct(start)}%` }}
        />
        <button
          aria-label="Trim end"
          onPointerDown={(e) => {
            e.preventDefault();
            setActive('end');
          }}
          className="absolute top-0 bottom-0 w-3 -ml-1.5 bg-primary rounded cursor-ew-resize"
          style={{ left: `${pct(end)}%` }}
        />
      </div>

      <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
        <span>{start.toFixed(1)}s</span>
        <span>{(end - start).toFixed(1)}s clip</span>
        <span>{end.toFixed(1)}s</span>
      </div>
    </div>
  );
}
