import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Youtube, Swords, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extractYouTubeVideoId, buildYouTubeWatchUrl } from '@/utils/youtubeHelpers';

interface Challenge {
  id: string;
  challenger_username: string;
  title: string;
}

interface AcceptChallengeModalProps {
  challenge: Challenge;
  isOpen: boolean;
  onClose: () => void;
}

export const AcceptChallengeModal = ({ challenge, isOpen, onClose }: AcceptChallengeModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [streamUrl, setStreamUrl] = useState('');
  const [videoIdError, setVideoIdError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStreamUrlChange = (value: string) => {
    setStreamUrl(value);
    if (value) {
      const videoId = extractYouTubeVideoId(value);
      if (videoId) {
        setVideoIdError('');
      } else {
        setVideoIdError('Invalid YouTube URL or Video ID');
      }
    } else {
      setVideoIdError('');
    }
  };

  const handleAccept = async () => {
    const videoId = extractYouTubeVideoId(streamUrl);
    if (!videoId) {
      setVideoIdError('Please enter a valid YouTube URL or Video ID');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('complete-open-challenge', {
        body: {
          challenge_id: challenge.id,
          accepter_stream_url: buildYouTubeWatchUrl(videoId),
          accepter_youtube_video_id: videoId
        }
      });

      if (error) throw error;

      if (data?.battle_id) {
        toast({
          title: "Challenge Accepted! 🎉",
          description: "The battle is now live! Redirecting..."
        });

        // Redirect to battle details
        setTimeout(() => {
          navigate(`/battles/${data.battle_id}`);
        }, 1000);
      }

    } catch (error: any) {
      console.error('Error accepting challenge:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept challenge",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" />
            Accept Challenge
          </DialogTitle>
          <DialogDescription>
            You're accepting <span className="font-bold text-foreground">{challenge.challenger_username}'s</span> challenge: "{challenge.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <p className="text-sm text-muted-foreground mb-3">
              To battle, go live on YouTube, then paste your stream URL below.
            </p>
            <a
              href="https://www.youtube.com/upload?livestream=1"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button 
                type="button"
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
              >
                <Youtube className="w-5 h-5 mr-2" />
                Go Live on YouTube Now
              </Button>
            </a>
          </div>

          <div>
            <Label htmlFor="accept-stream-url">Your YouTube Stream URL or Video ID</Label>
            <Input
              id="accept-stream-url"
              value={streamUrl}
              onChange={(e) => handleStreamUrlChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or video ID"
              className="mt-1"
            />
            {videoIdError && (
              <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {videoIdError}
              </div>
            )}
            {streamUrl && !videoIdError && (
              <div className="flex items-center gap-2 mt-2 text-green-500 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Valid YouTube URL
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Paste your YouTube Live Stream URL or just the video ID
            </p>
          </div>

          <Button
            onClick={handleAccept}
            disabled={isSubmitting || !streamUrl || !!videoIdError}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {isSubmitting ? 'Starting Battle...' : 'Start the Battle!'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
