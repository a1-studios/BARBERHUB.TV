import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

export interface Caption {
  start: number; // seconds
  end: number;
  text: string;
}

interface CaptionEditorProps {
  videoUrl: string;
  captions: Caption[];
  onChange: (captions: Caption[]) => void;
}

const fmt = (s: number) => {
  const ms = Math.floor((s % 1) * 1000)
    .toString()
    .padStart(3, '0');
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, '0');
  const min = Math.floor(s / 60)
    .toString()
    .padStart(2, '0');
  return `00:${min}:${sec}.${ms}`;
};

export function captionsToVtt(captions: Caption[]): string {
  if (!captions.length) return '';
  const cues = captions
    .filter((c) => c.text.trim())
    .map((c, i) => `${i + 1}\n${fmt(c.start)} --> ${fmt(c.end)}\n${c.text.trim()}`)
    .join('\n\n');
  return `WEBVTT\n\n${cues}`;
}

export function CaptionEditor({ videoUrl, captions, onChange }: CaptionEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeCaption, setActiveCaption] = useState<string>('');

  const addAtCurrent = () => {
    const start = currentTime;
    const end = Math.min(start + 2.5, videoRef.current?.duration ?? start + 2.5);
    onChange([...captions, { start, end, text: '' }]);
  };

  // Live preview: caption visible at the current playback time
  const visibleCaption = captions.find(
    (c) => currentTime >= c.start && currentTime <= c.end && c.text.trim()
  );

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="w-full h-full object-contain"
          onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
        />
        {visibleCaption && (
          <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none px-4">
            <span className="px-3 py-1 bg-black/80 text-white text-sm rounded font-medium">
              {visibleCaption.text}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-mono">
          {currentTime.toFixed(1)}s
        </span>
        <Button size="sm" variant="outline" onClick={addAtCurrent}>
          <Plus className="h-3 w-3 mr-1" /> Add at {currentTime.toFixed(1)}s
        </Button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {captions.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No captions yet. Press play, pause at a moment, then tap "Add".
          </p>
        )}
        {captions.map((c, i) => (
          <div key={i} className="flex items-center gap-2 bg-muted rounded-md p-2">
            <span className="text-[10px] text-muted-foreground font-mono w-20 shrink-0">
              {c.start.toFixed(1)}–{c.end.toFixed(1)}s
            </span>
            <Input
              value={c.text}
              onChange={(e) => {
                const next = [...captions];
                next[i] = { ...c, text: e.target.value };
                onChange(next);
              }}
              placeholder="Caption text"
              className="flex-1 h-8 text-sm"
              maxLength={120}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onChange(captions.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
