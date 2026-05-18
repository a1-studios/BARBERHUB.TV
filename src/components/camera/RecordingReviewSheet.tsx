import { useEffect, useMemo, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, RotateCcw, Save, Send, Type, Image as ImageIcon, Eye, TextCursorInput } from 'lucide-react';
import { ThumbnailPicker } from './ThumbnailPicker';
import { CaptionEditor, captionsToVtt, type Caption } from './CaptionEditor';
import { TextOverlayEditor, type TextOverlay } from './TextOverlayEditor';

export interface ReviewResult {
  textOverlays: TextOverlay[];
  publish: boolean;
  title: string;
  description: string;
  captionsVtt: string | null;
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

  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);

  const handle = async (publish: boolean) => {
    await onSubmit({
      publish,
      title: title || defaultTitle,
      description,
      captionsVtt: captions.length ? captionsToVtt(captions) : null,
      thumbnailDataUrl: thumbnail,
      textOverlays,
    });
  };

  return (
    <Drawer open={!!blob} onOpenChange={(open) => !open && !isUploading && onClose()}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>Review your recording</DrawerTitle>
        </DrawerHeader>

        {videoUrl && (
          <div className="px-4 pb-4 overflow-y-auto">
            <Tabs defaultValue="preview">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="preview"><Eye className="h-3 w-3 mr-1" /> Preview</TabsTrigger>
                <TabsTrigger value="captions"><Type className="h-3 w-3 mr-1" /> Captions</TabsTrigger>
                <TabsTrigger value="thumb"><ImageIcon className="h-3 w-3 mr-1" /> Cover</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="space-y-3 mt-4">
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video src={videoUrl} controls className="w-full h-full object-contain" />
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={80}
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={280}
                    rows={2}
                  />
                </div>
              </TabsContent>

              <TabsContent value="captions" className="mt-4">
                <CaptionEditor videoUrl={videoUrl} captions={captions} onChange={setCaptions} />
              </TabsContent>

              <TabsContent value="thumb" className="mt-4">
                <ThumbnailPicker
                  videoUrl={videoUrl}
                  onSelect={setThumbnail}
                  selected={thumbnail}
                />
                <p className="text-[11px] text-muted-foreground mt-2 text-center">
                  Pick the frame that grabs attention
                </p>
              </TabsContent>
            </Tabs>

            {isUploading && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading… {uploadProgress}%
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mt-4 sticky bottom-0 pb-2 bg-background">
              <Button
                variant="outline"
                onClick={onRetake}
                disabled={isUploading}
              >
                <RotateCcw className="h-4 w-4 mr-1" /> Retake
              </Button>
              <Button
                variant="secondary"
                onClick={() => handle(false)}
                disabled={isUploading}
              >
                <Save className="h-4 w-4 mr-1" /> Save Draft
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
      </DrawerContent>
    </Drawer>
  );
}
