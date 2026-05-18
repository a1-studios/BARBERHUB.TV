import { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RotateCcw, Send, Pencil } from 'lucide-react';
import { type TextOverlay } from './TextOverlayEditor';
import { EditPanel, type EditState } from './EditPanel';
import type { SoundChoice } from './SoundPicker';

export interface ReviewResult {
  publish: boolean;
  title: string;
  aspect: '9:16' | '16:9';
  trim: { start: number; end: number } | null;
  sound: SoundChoice | null;
  textOverlays: TextOverlay[];
  thumbnailDataUrl: string | null;
}

interface Props {
  blob: Blob | null;
  defaultTitle?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  onRetake: () => void;
  onSubmit: (result: ReviewResult) => Promise<void> | void;
  onClose: () => void;
}

export function RecordingReviewSheet({
  blob,
  defaultTitle = '',
  isUploading = false,
  uploadProgress = 0,
  onRetake,
  onSubmit,
  onClose,
}: Props) {
  const videoUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [title, setTitle] = useState(defaultTitle);
  const [aspect, setAspect] = useState<'9:16' | '16:9'>('9:16');
  const [editOpen, setEditOpen] = useState(false);

  const [edit, setEdit] = useState<EditState>({
    trim: null,
    sound: null,
    textOverlays: [],
    thumbnail: null,
  });

  const handle = async (publish: boolean) => {
    await onSubmit({
      publish,
      title: title || defaultTitle,
      aspect,
      trim: edit.trim,
      sound: edit.sound,
      textOverlays: edit.textOverlays,
      thumbnailDataUrl: edit.thumbnail,
    });
  };

  const aspectClass = aspect === '9:16' ? 'aspect-[9/16]' : 'aspect-video';
  const visibleOverlays = edit.textOverlays.filter(
    (o) => currentTime >= o.start && currentTime <= o.end
  );

  return (
    <Drawer open={!!blob} onOpenChange={(open) => !open && !isUploading && onClose()}>
      <DrawerContent className="max-h-[95vh]">
        <DrawerHeader className="py-3">
          <DrawerTitle className="text-center text-base">Review</DrawerTitle>
        </DrawerHeader>

        {videoUrl && (
          <div className="px-4 pb-4 overflow-y-auto">
            {/* Aspect toggle */}
            <div className="flex justify-center mb-3">
              <div className="inline-flex rounded-full bg-muted p-1">
                {(['9:16', '16:9'] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAspect(a)}
                    className={`px-3 py-1 text-xs rounded-full transition ${
                      aspect === a ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Video preview with live overlays */}
            <div className="flex justify-center">
              <div
                className={`relative bg-black rounded-lg overflow-hidden ${aspectClass}`}
                style={{ maxHeight: '55vh', width: 'auto' }}
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  playsInline
                  className="h-full w-full object-contain"
                  onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration || 0)}
                  onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
                />
                {visibleOverlays.map((o) => (
                  <div
                    key={o.id}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded pointer-events-none ${
                      o.background === 'solid' ? 'bg-black/80' : ''
                    }`}
                    style={{
                      left: `${o.x * 100}%`,
                      top: `${o.y * 100}%`,
                      color: o.color,
                      fontFamily: `'${o.font_family}', sans-serif`,
                      fontSize: `${o.font_size * 0.5}px`,
                      lineHeight: 1.1,
                      textShadow: o.background === 'none' ? '0 1px 3px rgba(0,0,0,0.6)' : 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {o.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="mt-4">
              <Input
                placeholder="Add a title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                className="text-center"
              />
            </div>

            {isUploading && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading… {uploadProgress}%
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2 mt-4 sticky bottom-0 pb-2 bg-background">
              <Button variant="outline" onClick={onRetake} disabled={isUploading}>
                <RotateCcw className="h-4 w-4 mr-1" /> Retake
              </Button>
              <Button variant="secondary" onClick={() => setEditOpen(true)} disabled={isUploading}>
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button
                onClick={() => handle(true)}
                disabled={isUploading}
                className="bg-gradient-to-r from-primary to-primary/80"
              >
                <Send className="h-4 w-4 mr-1" /> Publish
              </Button>
            </div>
          </div>
        )}

        {videoUrl && (
          <EditPanel
            open={editOpen}
            onClose={() => setEditOpen(false)}
            videoUrl={videoUrl}
            duration={duration}
            state={edit}
            onCommit={setEdit}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
