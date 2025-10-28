import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Youtube, Flame, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { extractYouTubeVideoId, buildYouTubeWatchUrl } from '@/utils/youtubeHelpers';

export const IssueChallenge = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [videoIdError, setVideoIdError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bountyAmount, setBountyAmount] = useState('');
  const [bountyDescription, setBountyDescription] = useState('');

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

      // Step 1: Create battle immediately (instant go-live)
      const { data: battle, error: battleError } = await supabase
        .from('battles')
        .insert({
          organizer_id: user.id,
          barber1_id: user.id,
          barber1_youtube_video_id: videoId,
          title,
          status: 'waiting_for_opponent',
          prize_amount: bountyAmount ? parseInt(bountyAmount) : 0,
          currency: 'USD'
        })
        .select()
        .single();

      if (battleError) throw battleError;

      // Step 2: Create challenge linked to battle
      const { error: challengeError } = await supabase
        .from('open_challenges')
        .insert({
          challenger_id: user.id,
          challenger_username: username,
          title,
          challenger_stream_url: buildYouTubeWatchUrl(videoId),
          challenger_youtube_video_id: videoId,
          battle_id: battle.id,
          bounty_amount: bountyAmount ? parseInt(bountyAmount) : null,
          bounty_currency: 'USD',
          bounty_description: bountyDescription || null,
          status: 'waiting_for_opponent'
        });

      if (challengeError) throw challengeError;

      toast({
        title: "🔴 LIVE NOW! Challenge Issued! 🔥",
        description: "Your stream is live! Waiting for an opponent to accept..."
      });

      // Reset form
      setTitle('');
      setStreamUrl('');
      setBountyAmount('');
      setBountyDescription('');
      
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

        {/* Bounty Section */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-yellow-500">
            <DollarSign className="w-5 h-5" />
            <h4 className="font-semibold">Add a Bounty (Optional)</h4>
          </div>
          
          <div>
            <Label htmlFor="bountyAmount">Prize Amount ($)</Label>
            <Input
              id="bountyAmount"
              type="number"
              value={bountyAmount}
              onChange={(e) => setBountyAmount(e.target.value)}
              placeholder="250"
              min="0"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="bountyDescription">Challenge Message</Label>
            <Textarea
              id="bountyDescription"
              value={bountyDescription}
              onChange={(e) => setBountyDescription(e.target.value)}
              placeholder="I can beat you doing a flat top!"
              className="mt-1"
              rows={2}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !title || !streamUrl || !!videoIdError}
          className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-600"
        >
          {isSubmitting ? 'Going Live...' : '🔴 Go Live & Issue Challenge'}
        </Button>
      </form>
    </div>
  );
};
