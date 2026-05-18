import { useRef, useState, useEffect, type PointerEvent as RPointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Type } from 'lucide-react';

export interface TextOverlay {
  id: string;
  text: string;
  font_family: string;
  font_size: number;
  color: string;
  background: 'none' | 'solid';
  x: number; // 0..1
  y: number; // 0..1
  start: number;
  end: number;
}

interface Props {
  videoUrl: string;
  overlays: TextOverlay[];
  onChange: (next: TextOverlay[]) => void;
  /** When true, render only the stage (no side controls). Controls float as overlay. */
  fillStage?: boolean;
}

const FONTS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Bebas Neue', label: 'Bebas Neue' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
  { value: 'DM Serif Display', label: 'DM Serif Display' },
  { value: 'Archivo Black', label: 'Archivo Black' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono' },
];

const COLORS = ['#FFFFFF', '#000000', '#FF6B00', '#00D9FF', '#FF2E63', '#FFD700'];

const uid = () => Math.random().toString(36).slice(2, 10);

export function TextOverlayEditor({ videoUrl, overlays, onChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // Pointer tracking for drag + pinch
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<
    | { type: 'drag'; id: string; offsetX: number; offsetY: number }
    | { type: 'pinch'; id: string; startDist: number; startSize: number }
    | null
  >(null);

  useEffect(() => {
    if (!selectedId && overlays.length) setSelectedId(overlays[0].id);
    if (selectedId && !overlays.find((o) => o.id === selectedId)) setSelectedId(null);
  }, [overlays, selectedId]);

  const selected = overlays.find((o) => o.id === selectedId) || null;

  const update = (id: string, patch: Partial<TextOverlay>) =>
    onChange(overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const addOverlay = () => {
    const start = currentTime;
    const end = Math.min(start + 3, videoRef.current?.duration ?? start + 3);
    const next: TextOverlay = {
      id: uid(),
      text: 'Your text',
      font_family: 'Bebas Neue',
      font_size: 42,
      color: '#FFFFFF',
      background: 'none',
      x: 0.5,
      y: 0.5,
      start,
      end,
    };
    onChange([...overlays, next]);
    setSelectedId(next.id);
  };

  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>, id: string) => {
    const stage = stageRef.current;
    if (!stage) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setSelectedId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const o = overlays.find((x) => x.id === id)!;

    if (pointersRef.current.size === 2) {
      // Begin pinch
      const [p1, p2] = Array.from(pointersRef.current.values());
      gestureRef.current = {
        type: 'pinch',
        id,
        startDist: distance(p1, p2),
        startSize: o.font_size,
      };
    } else {
      const rect = stage.getBoundingClientRect();
      gestureRef.current = {
        type: 'drag',
        id,
        offsetX: e.clientX - (rect.left + o.x * rect.width),
        offsetY: e.clientY - (rect.top + o.y * rect.height),
      };
    }
    e.preventDefault();
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const g = gestureRef.current;
    const stage = stageRef.current;
    if (!g || !stage) return;

    if (g.type === 'pinch' && pointersRef.current.size >= 2) {
      const [p1, p2] = Array.from(pointersRef.current.values());
      const dist = distance(p1, p2);
      const scale = dist / Math.max(g.startDist, 1);
      const next = Math.max(12, Math.min(140, Math.round(g.startSize * scale)));
      update(g.id, { font_size: next });
    } else if (g.type === 'drag') {
      const rect = stage.getBoundingClientRect();
      const x = (e.clientX - g.offsetX - rect.left) / rect.width;
      const y = (e.clientY - g.offsetY - rect.top) / rect.height;
      update(g.id, {
        x: Math.max(0.02, Math.min(0.98, x)),
        y: Math.max(0.02, Math.min(0.98, y)),
      });
    }
  };

  const onPointerUp = (e: RPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2 && gestureRef.current?.type === 'pinch') {
      gestureRef.current = null;
    }
    if (pointersRef.current.size === 0) gestureRef.current = null;
  };

  const visible = (o: TextOverlay) => currentTime >= o.start && currentTime <= o.end;

  return (
    <div className="relative h-full w-full bg-black">
      {/* Video stage fills container */}
      <div
        ref={stageRef}
        className="absolute inset-0 touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          playsInline
          className="w-full h-full object-contain pointer-events-auto"
          onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
        />
        {overlays.filter(visible).map((o) => (
          <div
            key={o.id}
            onPointerDown={(e) => onPointerDown(e, o.id)}
            onDoubleClick={() => {
              setSelectedId(o.id);
              setEditing(true);
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move px-2 py-1 rounded ${
              selectedId === o.id ? 'ring-2 ring-primary' : ''
            } ${o.background === 'solid' ? 'bg-black/80' : ''}`}
            style={{
              left: `${o.x * 100}%`,
              top: `${o.y * 100}%`,
              color: o.color,
              fontFamily: `'${o.font_family}', sans-serif`,
              fontSize: `${o.font_size * 0.5}px`,
              lineHeight: 1.1,
              textShadow: o.background === 'none' ? '0 1px 4px rgba(0,0,0,0.7)' : 'none',
              maxWidth: '90%',
              whiteSpace: 'nowrap',
              touchAction: 'none',
            }}
          >
            {o.text || 'Your text'}
          </div>
        ))}
      </div>

      {/* Top-left: Add button */}
      <div className="absolute top-2 left-2 z-10">
        <Button
          size="sm"
          onClick={addOverlay}
          className="h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30"
        >
          <Plus className="h-4 w-4 mr-1" /> Text
        </Button>
      </div>

      {/* Top-right: time */}
      <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-full bg-black/60 backdrop-blur text-[10px] font-mono text-white/80">
        {currentTime.toFixed(1)}s
      </div>

      {/* Empty state hint */}
      {overlays.length === 0 && (
        <div className="absolute inset-x-0 top-1/3 flex flex-col items-center gap-2 pointer-events-none text-white/70">
          <Type className="h-6 w-6" />
          <p className="text-xs">Tap "Text" to add an overlay</p>
        </div>
      )}

      {/* Selected overlay quick toolbar (bottom of stage) */}
      {selected && (
        <div className="absolute bottom-2 left-2 right-2 z-10 rounded-2xl bg-black/75 backdrop-blur border border-white/10 p-2 space-y-2">
          {editing ? (
            <Input
              autoFocus
              value={selected.text}
              onChange={(e) => update(selected.id, { text: e.target.value })}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
              maxLength={60}
              className="h-8 bg-white/10 border-white/20 text-white text-sm"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="w-full text-left text-xs text-white/80 px-2 py-1 rounded bg-white/5 truncate"
            >
              {selected.text || 'Tap to edit text'}
            </button>
          )}

          <div className="flex items-center gap-2">
            <Select
              value={selected.font_family}
              onValueChange={(v) => update(selected.id, { font_family: v })}
            >
              <SelectTrigger className="h-8 text-[11px] bg-white/10 border-white/20 text-white flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map((f) => (
                  <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={() =>
                update(selected.id, {
                  background: selected.background === 'solid' ? 'none' : 'solid',
                })
              }
              className={`h-8 px-3 rounded-md text-[11px] font-semibold border transition ${
                selected.background === 'solid'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white/10 text-white border-white/20'
              }`}
            >
              Pill
            </button>

            <button
              onClick={() => onChange(overlays.filter((o) => o.id !== selected.id))}
              className="h-8 w-8 rounded-md grid place-items-center bg-white/10 border border-white/20 text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => update(selected.id, { color: c })}
                className={`h-6 w-6 shrink-0 rounded-full border-2 ${
                  selected.color === c ? 'border-primary' : 'border-white/30'
                }`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
            <span className="ml-auto text-[10px] text-white/50 font-mono pr-1">
              {selected.font_size}px
            </span>
          </div>
        </div>
      )}

      {/* Layer chips */}
      {overlays.length > 1 && (
        <div className="absolute top-14 left-2 z-10 flex flex-col gap-1 max-h-[40%] overflow-y-auto">
          {overlays.map((o, i) => (
            <button
              key={o.id}
              onClick={() => setSelectedId(o.id)}
              className={`px-2 py-0.5 rounded-full text-[10px] border backdrop-blur ${
                selectedId === o.id
                  ? 'border-primary text-primary bg-black/60'
                  : 'border-white/20 text-white/70 bg-black/40'
              }`}
            >
              #{i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
