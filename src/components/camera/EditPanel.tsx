import { useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Scissors, Music, TextCursorInput, Image as ImageIcon, X, Check } from 'lucide-react';
import { TrimSlider } from './TrimSlider';
import { SoundPicker, type SoundChoice } from './SoundPicker';
import { TextOverlayEditor, type TextOverlay } from './TextOverlayEditor';
import { ThumbnailPicker } from './ThumbnailPicker';

export interface EditState {
  trim: { start: number; end: number } | null;
  sound: SoundChoice | null;
  textOverlays: TextOverlay[];
  thumbnail: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  videoUrl: string;
  duration: number;
  state: EditState;
  onCommit: (next: EditState) => void;
}

type Tab = 'trim' | 'sound' | 'text' | 'cover';

const TABS: { id: Tab; label: string; Icon: typeof Scissors }[] = [
  { id: 'text', label: 'Text', Icon: TextCursorInput },
  { id: 'trim', label: 'Trim', Icon: Scissors },
  { id: 'sound', label: 'Sound', Icon: Music },
  { id: 'cover', label: 'Cover', Icon: ImageIcon },
];

export function EditPanel({ open, onClose, videoUrl, duration, state, onCommit }: Props) {
  const [draft, setDraft] = useState<EditState>(state);
  const [tab, setTab] = useState<Tab>('text');

  useEffect(() => {
    if (open) {
      setDraft(state);
      setTab('text');
    }
  }, [open, state]);

  const done = () => {
    onCommit(draft);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[100dvh] w-full max-w-none p-0 border-0 bg-black flex flex-col"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/90 backdrop-blur z-20">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10 h-9 w-9"
          >
            <X className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold text-white tracking-wide uppercase">Edit</span>
          <Button
            size="sm"
            onClick={done}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full px-5"
          >
            <Check className="h-4 w-4 mr-1" /> Done
          </Button>
        </div>

        {/* 9:16 stage — fills available space */}
        <div className="flex-1 min-h-0 flex items-center justify-center bg-black px-2 py-2">
          <div
            className="relative h-full aspect-[9/16] max-w-full bg-black rounded-2xl overflow-hidden ring-1 ring-white/5"
            style={{ maxHeight: '100%' }}
          >
            {tab === 'text' ? (
              <TextOverlayEditor
                videoUrl={videoUrl}
                overlays={draft.textOverlays}
                onChange={(textOverlays) => setDraft((d) => ({ ...d, textOverlays }))}
              />
            ) : (
              <video
                src={videoUrl}
                controls
                playsInline
                className="h-full w-full object-contain bg-black"
              />
            )}
          </div>
        </div>

        {/* Bottom panel: tool content + tab bar */}
        <div className="bg-gradient-to-t from-black via-black/95 to-black/80 border-t border-white/10">
          <div className="px-4 pt-3 pb-2 max-h-[34vh] overflow-y-auto">
            {tab === 'text' && (
              <p className="text-[11px] text-center text-white/60">
                Drag to move · pinch with two fingers to resize
              </p>
            )}
            {tab === 'trim' && (
              <TrimSlider
                videoUrl={videoUrl}
                duration={duration}
                trim={draft.trim}
                onChange={(trim) => setDraft((d) => ({ ...d, trim }))}
              />
            )}
            {tab === 'sound' && (
              <SoundPicker
                sound={draft.sound}
                onChange={(sound) => setDraft((d) => ({ ...d, sound }))}
              />
            )}
            {tab === 'cover' && (
              <ThumbnailPicker
                videoUrl={videoUrl}
                selected={draft.thumbnail}
                onSelect={(thumbnail) => setDraft((d) => ({ ...d, thumbnail }))}
              />
            )}
          </div>

          {/* Tab bar */}
          <div
            className="grid grid-cols-4 border-t border-white/10"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {TABS.map(({ id, label, Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex flex-col items-center justify-center gap-1 py-3 transition ${
                    active ? 'text-primary' : 'text-white/55 hover:text-white/80'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'drop-shadow-[0_0_6px_hsl(var(--primary))]' : ''}`} />
                  <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
