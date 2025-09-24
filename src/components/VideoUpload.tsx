import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Video, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface VideoUploadProps {
  battleId: string;
  onVideoUploaded?: () => void;
  existingSubmission?: {
    id: string;
    media_url: string;
    title?: string;
    description?: string;
  };
}

export const VideoUpload = ({ battleId, onVideoUploaded, existingSubmission }: VideoUploadProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(existingSubmission?.title || '');
  const [description, setDescription] = useState(existingSubmission?.description || '');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingSubmission?.media_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a video file');
        return;
      }
      
      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        toast.error('File size must be less than 100MB');
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile && !existingSubmission) {
      toast.error('Please select a video file');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsUploading(true);

    try {
      let mediaUrl = existingSubmission?.media_url;

      // Only upload new file if one was selected
      if (selectedFile) {
        // Upload to Supabase Storage
        const fileName = `${Date.now()}-${selectedFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('creations')
          .upload(`battle-submissions/${fileName}`, selectedFile);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('creations')
          .getPublicUrl(uploadData.path);

        mediaUrl = urlData.publicUrl;
      }

      // Create or update battle submission
      const submissionData = {
        battle_id: battleId,
        user_id: user?.id,
        media_url: mediaUrl,
        title: title.trim(),
        description: description.trim() || null,
        status: 'submitted'
      };

      if (existingSubmission) {
        // Update existing submission
        const { error } = await supabase
          .from('battle_submissions')
          .update(submissionData)
          .eq('id', existingSubmission.id);
        
        if (error) throw error;
        toast.success('Video updated successfully!');
      } else {
        // Create new submission
        const { error } = await supabase
          .from('battle_submissions')
          .insert(submissionData);
        
        if (error) throw error;
        toast.success('Video uploaded successfully!');
      }

      // Reset form if it's a new submission
      if (!existingSubmission) {
        setTitle('');
        setDescription('');
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }

      onVideoUploaded?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl && !existingSubmission) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          {existingSubmission ? 'Update Your Submission' : 'Upload Battle Video'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Area */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            Video File {!existingSubmission && <span className="text-red-400">*</span>}
          </Label>
          
          {previewUrl ? (
            <div className="relative">
              <video 
                src={previewUrl} 
                controls 
                className="w-full max-h-60 rounded-lg"
                poster={previewUrl}
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={clearSelection}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Click to select video file</p>
              <p className="text-sm text-gray-500">MP4, WebM, AVI (Max 100MB)</p>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Title */}
        <div>
          <Label htmlFor="title" className="text-sm font-medium mb-2 block">
            Title <span className="text-red-400">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title..."
            disabled={isUploading}
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description" className="text-sm font-medium mb-2 block">
            Description (Optional)
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your creation..."
            disabled={isUploading}
            rows={3}
            maxLength={500}
          />
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={isUploading || (!selectedFile && !existingSubmission) || !title.trim()}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {existingSubmission ? 'Updating...' : 'Uploading...'}
            </>
          ) : (
            existingSubmission ? 'Update Submission' : 'Upload Video'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};