import { useRef, useState, useEffect, type PointerEvent as RPointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
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
}

const FONTS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Bebas Neue', label: 'Bebas Neue' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
  { value: 'DM Serif Display', label: 'DM Serif Display' },
  { value: 'Archivo Black', label: 'Archivo Black' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono' },
];

const COLORS = ['#FFFFFF', '#000000', '#FF6B00', '#00B2FF', '#FF2E63', '#FFD700'];

const uid = () => Math.random().toString(36).slice(2, 10);

export function TextOverlayEditor({ videoUrl, overlays, onChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

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
      font_size: 36,
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

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>, id: string) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const o = overlays.find((x) => x.id === id)!;
    dragRef.current = {
      id,
      offsetX: e.clientX - (rect.left + o.x * rect.width),
      offsetY: e.clientY - (rect.top + o.y * rect.height),
    };
    setSelectedId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const stage = stageRef.current;
    if (!d || !stage) return;
    const rect = stage.getBoundingClientRect();
    const x = (e.clientX - d.offsetX - rect.left) / rect.width;
    const y = (e.clientY - d.offsetY - rect.top) / rect.height;
    update(d.id, {
      x: Math.max(0.02, Math.min(0.98, x)),
      y: Math.max(0.02, Math.min(0.98, y)),
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const visible = (o: TextOverlay) => currentTime >= o.start && currentTime <= o.end;

  return (
    <div className="space-y-4">
      <div
        ref={stageRef}
        className="relative bg-black rounded-lg overflow-hidden aspect-video touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="w-full h-full object-contain pointer-events-auto"
          onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
        />
        {overlays.filter(visible).map((o) => (
          <div
            key={o.id}
            onPointerDown={(e) => onPointerDown(e, o.id)}
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
              textShadow: o.background === 'none' ? '0 1px 3px rgba(0,0,0,0.6)' : 'none',
              maxWidth: '90%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {o.text || 'Your text'}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-mono">{currentTime.toFixed(1)}s</span>
        <Button size="sm" variant="outline" onClick={addOverlay}>
          <Plus className="h-3 w-3 mr-1" /> Add text
        </Button>
      </div>

      {overlays.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4 flex flex-col items-center gap-2">
          <Type className="h-5 w-5 opacity-60" />
          Tap "Add text" to place an overlay on the frame.
        </p>
      )}

      {selected && (
        <div className="space-y-3 bg-muted/40 rounded-md p-3">
          <Input
            value={selected.text}
            onChange={(e) => update(selected.id, { text: e.target.value })}
            placeholder="Overlay text"
            maxLength={60}
            className="h-9"
          />

          <div className="grid grid-cols-2 gap-2">
            <Select
              value={selected.font_family}
              onValueChange={(v) => update(selected.id, { font_family: v })}
            >
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONTS.map((f) => (
                  <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selected.background}
              onValueChange={(v: 'none' | 'solid') => update(selected.id, { background: v })}
            >
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No background</SelectItem>
                <SelectItem value="solid">Solid pill</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground">Size · {selected.font_size}px</label>
            <Slider
              min={12}
              max={72}
              step={1}
              value={[selected.font_size]}
              onValueChange={([v]) => update(selected.id, { font_size: v })}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => update(selected.id, { color: c })}
                className={`h-6 w-6 rounded-full border-2 ${
                  selected.color === c ? 'border-primary' : 'border-border'
                }`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
            <Input
              value={selected.color}
              onChange={(e) => update(selected.id, { color: e.target.value })}
              className="h-7 w-24 font-mono text-[11px]"
              maxLength={7}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">Start (s)</label>
              <Input
                type="number"
                step="0.1"
                value={selected.start.toFixed(1)}
                onChange={(e) => update(selected.id, { start: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">End (s)</label>
              <Input
                type="number"
                step="0.1"
                value={selected.end.toFixed(1)}
                onChange={(e) => update(selected.id, { end: Math.max(selected.start + 0.1, parseFloat(e.target.value) || 0) })}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-destructive"
            onClick={() => onChange(overlays.filter((o) => o.id !== selected.id))}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Remove overlay
          </Button>
        </div>
      )}

      {overlays.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {overlays.map((o, i) => (
            <button
              key={o.id}
              onClick={() => setSelectedId(o.id)}
              className={`shrink-0 px-2 py-1 rounded text-[11px] border ${
                selectedId === o.id ? 'border-primary text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              #{i + 1} {o.text.slice(0, 12) || '…'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
