import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Upload, CheckCircle2, AlertCircle, Loader2, HelpCircle, Video, FileVideo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SubmissionGuidelines } from './SubmissionGuidelines';
import { uploadBattleVideo } from '@/lib/storage';
import { z } from 'zod';

interface VideoSubmissionModalProps {
  battleId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const VideoSubmissionModal = ({ battleId, isOpen, onClose, onSuccess }: VideoSubmissionModalProps) => {
  const [activeTab, setActiveTab] = useState('upload');
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      toast({ title: "File too large", description: "Maximum file size is 500MB", variant: "destructive" });
      return;
    }
    
    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload MP4, MOV, WebM, or AVI files", variant: "destructive" });
      return;
    }
    
    setSelectedFile(file);
  };

  const submitWithUrl = async (url: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('submit-battle-video', {
      body: {
        battleId,
        videoUrl: url,
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
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({ title: "No file selected", description: "Please select a video file", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);

    try {
      const publicUrl = await uploadBattleVideo(selectedFile, battleId, (pct) => {
        setUploadProgress(Math.min(pct, 90));
      });
      setUploadProgress(95);
      await submitWithUrl(publicUrl);
      setUploadProgress(100);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: "Upload Failed", description: error.message || "Failed to upload video.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
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
      await submitWithUrl(videoUrl.trim());
    } catch (error: any) {
      console.error('Error submitting video:', error);
      toast({ title: "Submission Failed", description: error.message || "Failed to submit video.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setVideoUrl(''); setTitle(''); setDescription('');
    setUrlError(''); setSelectedFile(null); setUploadProgress(0);
  };

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload"><FileVideo className="h-4 w-4 mr-2" />Upload</TabsTrigger>
            <TabsTrigger value="url">Paste URL</TabsTrigger>
            <TabsTrigger value="guidelines"><HelpCircle className="h-4 w-4 mr-2" />Guidelines</TabsTrigger>
          </TabsList>

          {/* FILE UPLOAD TAB */}
          <TabsContent value="upload" className="space-y-4 mt-4">
            <Card className="bg-primary/5 border-primary/20 p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                <Video className="h-5 w-5 text-primary" />
                Direct Video Upload
              </h4>
              <p className="text-sm text-muted-foreground">
                Upload your video directly. Supports MP4, MOV, WebM (max 500MB).
              </p>
            </Card>

            <form onSubmit={handleUploadSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Select Video File <span className="text-destructive">*</span></Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                >
                  {selectedFile ? (
                    <div className="text-center">
                      <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-1" />
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to select video</p>
                    </div>
                  )}
                </Button>
              </div>

              {uploadProgress > 0 && (
                <div className="space-y-1">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">{uploadProgress}%</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="upload-title">Video Title <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                <Input id="upload-title" placeholder="e.g., My Epic Fade Transformation" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} disabled={isSubmitting} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="upload-desc">Description <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                <Textarea id="upload-desc" placeholder="Tell us about your battle performance..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} disabled={isSubmitting} />
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={!selectedFile || isSubmitting} className="min-w-[180px]">
                  {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>) : (<><Upload className="mr-2 h-4 w-4" />Upload & Submit</>)}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* URL SUBMIT TAB */}
          <TabsContent value="url" className="space-y-4 mt-4">
            <Card className="bg-primary/5 border-primary/20 p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                <Video className="h-5 w-5 text-primary" />
                Paste Video URL
              </h4>
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Accepted:</strong> Any direct video URL (MP4, HLS, or hosted video link)
                </AlertDescription>
              </Alert>
            </Card>

            <form onSubmit={handleUrlSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="videoUrl" className="flex items-center gap-2">
                  Video URL <span className="text-destructive">*</span>
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
                {urlError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{urlError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="url-title">Video Title <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                <Input id="url-title" placeholder="e.g., My Epic Fade" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} disabled={isSubmitting} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url-desc">Description <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                <Textarea id="url-desc" placeholder="Tell us about your performance..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} disabled={isSubmitting} />
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
