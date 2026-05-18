import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Music, Volume2, X } from 'lucide-react';

export interface SoundChoice {
  id: string;
  originalVolume: number;
  musicVolume: number;
}

const LIBRARY = [
  { id: 'lofi-cut', label: 'Lofi Cut', mood: 'Chill' },
  { id: 'fade-up', label: 'Fade Up', mood: 'Energetic' },
  { id: 'taper-flow', label: 'Taper Flow', mood: 'Smooth' },
  { id: 'fresh-drop', label: 'Fresh Drop', mood: 'Hype' },
  { id: 'clipper-trap', label: 'Clipper Trap', mood: 'Hard' },
];

interface Props {
  sound: SoundChoice | null;
  onChange: (next: SoundChoice | null) => void;
}

export function SoundPicker({ sound, onChange }: Props) {
  const update = (patch: Partial<SoundChoice>) => {
    onChange({
      id: sound?.id ?? LIBRARY[0].id,
      originalVolume: sound?.originalVolume ?? 100,
      musicVolume: sound?.musicVolume ?? 60,
      ...patch,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {LIBRARY.map((s) => {
          const selected = sound?.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => update({ id: s.id })}
              className={`p-3 rounded-md border text-left ${
                selected ? 'border-primary bg-primary/10' : 'border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <Music className="h-3 w-3" />
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{s.mood}</span>
            </button>
          );
        })}
      </div>

      {sound && (
        <>
          <div>
            <label className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Volume2 className="h-3 w-3" /> Original audio · {sound.originalVolume}%
            </label>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[sound.originalVolume]}
              onValueChange={([v]) => update({ originalVolume: v })}
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Music className="h-3 w-3" /> Music · {sound.musicVolume}%
            </label>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[sound.musicVolume]}
              onValueChange={([v]) => update({ musicVolume: v })}
            />
          </div>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange(null)}>
            <X className="h-3 w-3 mr-1" /> Remove sound
          </Button>
        </>
      )}
    </div>
  );
}
