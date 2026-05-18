import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Scissors, Music, TextCursorInput, Image as ImageIcon } from 'lucide-react';
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

export function EditPanel({ open, onClose, videoUrl, duration, state, onCommit }: Props) {
  const [draft, setDraft] = useState<EditState>(state);

  useEffect(() => {
    if (open) setDraft(state);
  }, [open, state]);

  const done = () => {
    onCommit(draft);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto p-0">
        <SheetHeader className="px-4 py-3 border-b sticky top-0 bg-background z-10 flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-base">Edit</SheetTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={done}>Done</Button>
          </div>
        </SheetHeader>

        <div className="p-4">
          <Tabs defaultValue="trim">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="trim"><Scissors className="h-3 w-3 mr-1" /> Trim</TabsTrigger>
              <TabsTrigger value="sound"><Music className="h-3 w-3 mr-1" /> Sound</TabsTrigger>
              <TabsTrigger value="text"><TextCursorInput className="h-3 w-3 mr-1" /> Text</TabsTrigger>
              <TabsTrigger value="cover"><ImageIcon className="h-3 w-3 mr-1" /> Cover</TabsTrigger>
            </TabsList>

            <TabsContent value="trim" className="mt-4">
              <TrimSlider
                videoUrl={videoUrl}
                duration={duration}
                trim={draft.trim}
                onChange={(trim) => setDraft((d) => ({ ...d, trim }))}
              />
            </TabsContent>

            <TabsContent value="sound" className="mt-4">
              <SoundPicker
                sound={draft.sound}
                onChange={(sound) => setDraft((d) => ({ ...d, sound }))}
              />
            </TabsContent>

            <TabsContent value="text" className="mt-4">
              <TextOverlayEditor
                videoUrl={videoUrl}
                overlays={draft.textOverlays}
                onChange={(textOverlays) => setDraft((d) => ({ ...d, textOverlays }))}
              />
            </TabsContent>

            <TabsContent value="cover" className="mt-4">
              <ThumbnailPicker
                videoUrl={videoUrl}
                selected={draft.thumbnail}
                onSelect={(thumbnail) => setDraft((d) => ({ ...d, thumbnail }))}
              />
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                Pick the frame that grabs attention
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
