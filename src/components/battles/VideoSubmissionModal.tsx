import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, CheckCircle2, AlertCircle, Loader2, HelpCircle, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SubmissionGuidelines } from './SubmissionGuidelines';
import { z } from 'zod';

interface VideoSubmissionModalProps {
  battleId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const VideoSubmissionModal = ({ battleId, isOpen, onClose, onSuccess }: VideoSubmissionModalProps) => {
  const [activeTab, setActiveTab] = useState('submit');
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlError, setUrlError] = useState('');
  const { toast } = useToast();

  const videoSubmissionSchema = z.object({
    videoUrl: z.string().trim().url({ message: "Please enter a valid video URL" }),
    title: z.string().trim().max(100).optional(),
    description: z.string().trim().max(500).optional(),
  });

  const validateUrl = (url: string) => {
    if (!url) { setUrlError(''); return false; }
    try {
      new URL(url);
      setUrlError('');
      return true;
    } catch {
      setUrlError('Please enter a valid URL');
      return false;
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setVideoUrl(url);
    if (url) validateUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      videoSubmissionSchema.parse({ videoUrl, title: title || undefined, description: description || undefined });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Validation Error", description: error.errors[0].message, variant: "destructive" });
      }
      return;
    }

    if (!validateUrl(videoUrl)) {
      toast({ title: "Invalid URL", description: "Please enter a valid video URL", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('submit-battle-video', {
        body: {
          battleId,
          videoUrl: videoUrl.trim(),
          title: title.trim() || undefined,
          description: description.trim() || undefined,
        },
      });

      if (error) throw error;

      toast({
        title: data.battleStatus === 'voting' ? "🎉 Battle is Live!" : "✅ Video Submitted!",
        description: data.message,
      });

      onSuccess();
      resetForm();
    } catch (error: any) {
      console.error('Error submitting video:', error);
      toast({ title: "Submission Failed", description: error.message || "Failed to submit video.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => { setVideoUrl(''); setTitle(''); setDescription(''); setUrlError(''); };

  const handleClose = () => { if (!isSubmitting) { resetForm(); onClose(); } };

  const isValidUrl = videoUrl && !urlError;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Upload className="h-6 w-6 text-primary" />
            Submit Your Battle Video
          </DialogTitle>
          <DialogDescription>Upload your performance and compete for the win!</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="submit">Submit Video</TabsTrigger>
            <TabsTrigger value="guidelines"><HelpCircle className="h-4 w-4 mr-2" />Guidelines</TabsTrigger>
          </TabsList>

          <TabsContent value="submit" className="space-y-4 mt-4">
            <Card className="bg-primary/5 border-primary/20 p-4">
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  🎬 Battle Submission Process
                </h4>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Record or stream your battle performance</li>
                  <li>Upload the video to your preferred hosting</li>
                  <li>Paste the direct video URL below</li>
                  <li>Submit and let the votes decide!</li>
                </ol>
                <Alert className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Accepted:</strong> Any direct video URL (MP4, HLS, or hosted video link)
                  </AlertDescription>
                </Alert>
              </div>
            </Card>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="videoUrl" className="flex items-center gap-2">
                  Battle Video URL <span className="text-destructive">*</span>
                  {isValidUrl && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </Label>
                <Input
                  id="videoUrl"
                  type="text"
                  placeholder="https://example.com/my-battle-video.mp4"
                  value={videoUrl}
                  onChange={handleUrlChange}
                  disabled={isSubmitting}
                  className={urlError ? 'border-destructive' : isValidUrl ? 'border-green-500' : ''}
                />
                <p className="text-xs text-muted-foreground">Paste your video URL (VOD recording or HLS stream)</p>
                {urlError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{urlError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Video Title <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                <Input id="title" type="text" placeholder="e.g., My Epic Fade Transformation" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} disabled={isSubmitting} />
                <p className="text-xs text-muted-foreground text-right">{title.length}/100 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                <Textarea id="description" placeholder="Tell us about your battle performance..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={4} disabled={isSubmitting} />
                <p className="text-xs text-muted-foreground text-right">{description.length}/500 characters</p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={!isValidUrl || isSubmitting} className="min-w-[180px]">
                  {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>) : (<><Upload className="mr-2 h-4 w-4" />Submit Video</>)}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="guidelines" className="mt-4">
            <SubmissionGuidelines />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
