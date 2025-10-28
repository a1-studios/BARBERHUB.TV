import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Youtube, Flame, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { extractYouTubeVideoId } from '@/utils/youtubeHelpers';

export const IssueChallenge = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    const videoId = extractYouTubeVideoId(streamUrl);
    if (!videoId) {
      setVideoIdError('Please enter a valid YouTube URL or Video ID');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', user.id)
        .single();

      const username = profile?.username || profile?.display_name || 'Unknown';

      // Create challenge
      const { error } = await supabase
        .from('open_challenges')
        .insert({
          challenger_id: user.id,
          challenger_username: username,
          title,
          challenger_stream_url: streamUrl,
          challenger_youtube_video_id: videoId,
          status: 'waiting_for_opponent'
        });

      if (error) throw error;

      toast({
        title: "Challenge Issued! 🔥",
        description: "Your challenge is now live. Waiting for an opponent..."
      });

      // Reset form
      setTitle('');
      setStreamUrl('');
      
    } catch (error: any) {
      console.error('Error issuing challenge:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to issue challenge",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg">
          <Flame className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Issue a Challenge</h3>
          <p className="text-sm text-muted-foreground">Go live and challenge the arena</p>
        </div>
      </div>

      {/* Go Live Button */}
      <a
        href="https://www.youtube.com/upload?livestream=1"
        target="_blank"
        rel="noopener noreferrer"
        className="block mb-6"
      >
        <Button 
          type="button"
          className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-6 text-lg"
        >
          <Youtube className="w-6 h-6 mr-2" />
          Go Live on YouTube Now
        </Button>
      </a>

      {/* Challenge Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Challenge Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Best Fade in Miami - Come at me!"
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="streamUrl">Your YouTube Stream URL or Video ID</Label>
          <Input
            id="streamUrl"
            value={streamUrl}
            onChange={(e) => handleStreamUrlChange(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or video ID"
            required
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
          type="submit"
          disabled={isSubmitting || !title || !streamUrl || !!videoIdError}
          className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-600"
        >
          {isSubmitting ? 'Issuing Challenge...' : 'Issue My Challenge'}
        </Button>
      </form>
    </div>
  );
};
