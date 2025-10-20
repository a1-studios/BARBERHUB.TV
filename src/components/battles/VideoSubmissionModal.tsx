import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Upload, CheckCircle2, Youtube, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VideoSubmissionModalProps {
  battleId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const VideoSubmissionModal = ({ battleId, isOpen, onClose, onSuccess }: VideoSubmissionModalProps) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlError, setUrlError] = useState('');
  const { toast } = useToast();

  // YouTube URL validation regex
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

  const validateYouTubeUrl = (url: string) => {
    if (!url) {
      setUrlError('');
      return false;
    }

    if (!youtubeRegex.test(url)) {
      setUrlError('Please enter a valid YouTube URL (e.g., https://youtube.com/watch?v=VIDEO_ID)');
      return false;
    }

    setUrlError('');
    return true;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setVideoUrl(url);
    validateYouTubeUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateYouTubeUrl(videoUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube video URL",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Call the edge function to submit the video
      const { data, error } = await supabase.functions.invoke('submit-battle-video', {
        body: {
          battleId,
          videoUrl,
          title: title || undefined,
          description: description || undefined
        }
      });

      if (error) throw error;

      // Show success message based on response
      toast({
        title: data.battleStatus === 'voting' ? "🎉 Battle is Live!" : "✅ Video Submitted!",
        description: data.message,
      });

      onSuccess();
      resetForm();
    } catch (error: any) {
      console.error('Error submitting video:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit video. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setVideoUrl('');
    setTitle('');
    setDescription('');
    setUrlError('');
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const isValidUrl = videoUrl && !urlError && youtubeRegex.test(videoUrl);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Upload className="h-6 w-6 text-primary" />
            Submit Your Battle Video
          </DialogTitle>
          <DialogDescription>
            Submit your YouTube video for this battle
          </DialogDescription>
        </DialogHeader>

        {/* Instructions Card */}
        <Card className="bg-primary/5 border-primary/20 p-4 mb-4">
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-500" />
              🎬 It's time to battle!
            </h4>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Go live on YouTube for your battle performance</li>
              <li>After your stream ends, YouTube automatically saves it as a VOD (Video on Demand)</li>
              <li>Copy the public URL of your saved video</li>
              <li>Paste the URL below and submit</li>
            </ol>
            <Alert className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Supported formats:</strong><br/>
                • https://youtube.com/watch?v=VIDEO_ID<br/>
                • https://youtu.be/VIDEO_ID
              </AlertDescription>
            </Alert>
          </div>
        </Card>

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video URL Input */}
          <div className="space-y-2">
            <Label htmlFor="videoUrl" className="flex items-center gap-2">
              Battle Video URL <span className="text-destructive">*</span>
              {isValidUrl && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </Label>
            <Input
              id="videoUrl"
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={videoUrl}
              onChange={handleUrlChange}
              disabled={isSubmitting}
              className={urlError ? 'border-destructive' : isValidUrl ? 'border-green-500' : ''}
            />
            {urlError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {urlError}
              </p>
            )}
          </div>

          {/* Optional Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Video Title <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="e.g., My Epic Fade Transformation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground text-right">
              {title.length}/100 characters
            </p>
          </div>

          {/* Optional Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Tell us about your battle performance..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500 characters
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValidUrl || isSubmitting}
              className="min-w-[180px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit Video for Review
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
