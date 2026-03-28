import { Play, Upload, Loader2 } from 'lucide-react';
import { BrandedVideoPlayer } from '@/components/BrandedVideoPlayer';
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Variants } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { multipartUploadToR2, uploadPortfolioMedia, type UploadProgress, type UploadController } from '@/lib/storage';
import { ChunkedUploadProgress } from '@/components/battles/ChunkedUploadProgress';

interface BarberVideoSectionProps {
  videoId?: string | null;
  isLive?: boolean;
  viewerCount?: number;
  aspectRatio?: 'portrait' | 'landscape';
  className?: string;
  barberUserId?: string;
  isOwner?: boolean;
  onVideoUploaded?: () => void;
}

export const BarberVideoSection = ({ 
  videoId, 
  isLive = false,
  viewerCount = 0,
  aspectRatio = 'landscape',
  className = '',
  barberUserId,
  isOwner = false,
  onVideoUploaded
}: BarberVideoSectionProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadController, setUploadController] = useState<UploadController | null>(null);

  const MULTIPART_THRESHOLD = 50 * 1024 * 1024; // 50MB
  
  const hasExplicitHeight = className.includes('h-full') || className.includes('h-[');
  const aspectClass = hasExplicitHeight
    ? 'w-full h-full'
    : className.includes('aspect-square') 
      ? 'aspect-square' 
      : aspectRatio === 'portrait' 
        ? 'aspect-[9/16]' 
        : 'aspect-video';

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Validate file size (5GB max)
    const maxSize = 5 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Video must be under 5GB');
      return;
    }

    setUploading(true);
    try {
      let publicUrl: string;

      if (file.size >= MULTIPART_THRESHOLD) {
        // Large file: use multipart upload to R2
        const controller = multipartUploadToR2(
          file,
          `featured-${user?.id}`,
          (progress) => setUploadProgress(progress)
        );
        setUploadController(controller);
        publicUrl = await controller.promise;
        setUploadController(null);
        setUploadProgress(null);
      } else {
        // Small file: use R2 presigned URL upload
        publicUrl = await uploadPortfolioMedia(file, user?.id || '');
      }

      // Update barber profile with video URL
      const { error: updateError } = await supabase
        .from('barber_profiles')
        .update({ 
          featured_video_id: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      toast.success('Video uploaded successfully!');
      onVideoUploaded?.();
    } catch (error: any) {
      if (error?.message === 'Upload cancelled') return;
      console.error('Upload error:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploading(false);
      setUploadController(null);
      setUploadProgress(null);
    }
  };
  
  if (!videoId) {
    // Show upload interface if owner
    if (isOwner && user?.id === barberUserId) {
      return (
        <div className={`${aspectClass} bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20 flex items-center justify-center ${className}`}>
          <div className="text-center space-y-3 p-4">
            {uploading ? (
              <>
                {uploadProgress ? (
                  <div className="w-full px-2">
                    <ChunkedUploadProgress progress={uploadProgress} controller={uploadController} />
                  </div>
                ) : (
                  <>
                    <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </>
                )}
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto text-primary/40" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Upload Video</p>
                  <p className="text-xs text-muted-foreground">Max 5GB</p>
                </div>
                <Button
                  size="sm"
                  className="relative"
                  onClick={() => document.getElementById('video-upload')?.click()}
                >
                  Choose File
                </Button>
                <input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </>
            )}
          </div>
        </div>
      );
    }

    // Show animated arena placeholder for non-owners (demo/simulation mode)
    return (
      <div className={`${aspectClass} bg-gradient-to-br from-primary/30 via-black to-cyan/20 rounded-lg border border-primary/30 overflow-hidden relative ${className}`}>
        {/* Radial glow - behind everything */}
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-gradient-radial from-primary/30 to-transparent"
        />
        
        {/* Centered content - absolutely positioned at exact center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Animated rotating barber pole effect - THE PLAY BUTTON */}
          <motion.div
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 4, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-16 h-16 relative"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-white to-cyan opacity-60" />
            <div className="absolute inset-2 rounded-full bg-black/80 flex items-center justify-center">
              <Play className="w-6 h-6 text-primary" />
            </div>
          </motion.div>
          
          {/* Pulsing text - positioned below play button */}
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-center mt-3"
          >
            <p className="text-lg font-bold text-primary drop-shadow-lg">
              🔥 ARENA INCOMING 🔥
            </p>
            <p className="text-xs text-white/70">Battle starting soon...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${aspectClass} ${className}`}>
      <BrandedVideoPlayer
        src={videoId}
        isLive={isLive}
        viewerCount={viewerCount}
        autoPlay={isLive}
        muted={isLive}
      />
    </div>
  );
};
