import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Flame, 
  DollarSign, 
  Users, 
  Loader2,
  CheckCircle2,
  Radio,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ChallengeStreamSectionProps {
  className?: string;
}

export const ChallengeStreamSection = ({ className }: ChallengeStreamSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  
  // Challenge state
  const [title, setTitle] = useState('');
  const [bountyAmount, setBountyAmount] = useState('');
  const [bountyDescription, setBountyDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Waiting state
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [challengerJoined, setChallengerJoined] = useState(false);
  const [challengerName, setChallengerName] = useState<string | null>(null);

  // Start camera preview
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true
      });
      
      setLocalStream(stream);
      setIsCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      toast({
        title: "Camera Error",
        description: error.name === 'NotAllowedError' 
          ? "Please allow camera access to go live"
          : "Failed to access camera",
        variant: "destructive"
      });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setIsCameraActive(false);
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle mic
  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicEnabled(audioTrack.enabled);
      }
    }
  };

  // Attach stream to video element when ready
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

  // Poll for challenger
  useEffect(() => {
    if (!activeChallengeId || !isWaiting) return;

    const checkForChallenger = async () => {
      const { data: challenge } = await supabase
        .from('open_challenges')
        .select('status, accepted_by_username, battle_id')
        .eq('id', activeChallengeId)
        .single();

      if (challenge?.status === 'completed' && challenge.battle_id) {
        setChallengerJoined(true);
        setChallengerName(challenge.accepted_by_username);
        setActiveBattleId(challenge.battle_id);
        setIsWaiting(false);
        
        toast({
          title: "🔥 Challenger Joined!",
          description: `${challenge.accepted_by_username} has accepted your challenge!`
        });
      }
    };

    const interval = setInterval(checkForChallenger, 3000);
    return () => clearInterval(interval);
  }, [activeChallengeId, isWaiting, toast]);

  // Also listen for realtime updates
  useEffect(() => {
    if (!activeChallengeId) return;

    const channel = supabase
      .channel(`challenge-${activeChallengeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'open_challenges',
          filter: `id=eq.${activeChallengeId}`
        },
        (payload) => {
          const challenge = payload.new as any;
          if (challenge.status === 'completed' && challenge.battle_id) {
            setChallengerJoined(true);
            setChallengerName(challenge.accepted_by_username);
            setActiveBattleId(challenge.battle_id);
            setIsWaiting(false);
            
            toast({
              title: "🔥 Challenger Joined!",
              description: `${challenge.accepted_by_username} has accepted your challenge!`
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChallengeId, toast]);

  // Issue challenge
  const handleIssueChallenge = async () => {
    if (!user || !title.trim()) return;

    setIsSubmitting(true);

    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', user.id)
        .single();

      const username = profile?.username || profile?.display_name || 'Unknown';

      // Create battle with waiting status
      const { data: battle, error: battleError } = await supabase
        .from('battles')
        .insert({
          organizer_id: user.id,
          barber1_id: user.id,
          title,
          status: 'waiting_for_opponent',
          prize_amount: bountyAmount ? parseInt(bountyAmount) : 0,
          currency: 'USD'
        })
        .select()
        .single();

      if (battleError) throw battleError;

      // Create challenge linked to battle
      const challengeData = {
        challenger_id: user.id,
        challenger_username: username,
        title,
        battle_id: battle.id,
        bounty_amount: bountyAmount ? parseInt(bountyAmount) : null,
        bounty_currency: 'USD',
        bounty_description: bountyDescription || null,
        status: 'waiting_for_opponent'
      };

      const { data: challenge, error: challengeError } = await supabase
        .from('open_challenges')
        .insert(challengeData as any)
        .select()
        .single();

      if (challengeError) throw challengeError;

      setActiveChallengeId(challenge.id);
      setActiveBattleId(battle.id);
      setIsWaiting(true);

      toast({
        title: "🔴 Challenge Issued!",
        description: "Waiting for an opponent to accept..."
      });

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

  // Cancel challenge
  const handleCancelChallenge = async () => {
    if (!activeChallengeId) return;

    try {
      await supabase
        .from('open_challenges')
        .update({ status: 'cancelled' })
        .eq('id', activeChallengeId);

      if (activeBattleId) {
        await supabase
          .from('battles')
          .update({ status: 'cancelled' })
          .eq('id', activeBattleId);
      }

      setActiveChallengeId(null);
      setActiveBattleId(null);
      setIsWaiting(false);
      
      toast({
        title: "Challenge Cancelled",
        description: "Your challenge has been cancelled"
      });
    } catch (error) {
      console.error('Error cancelling challenge:', error);
    }
  };

  // Enter battle when challenger joins
  const handleEnterBattle = () => {
    if (activeBattleId) {
      stopCamera(); // Stop local preview
      navigate(`/battle/${activeBattleId}/contender`);
    }
  };

  return (
    <Card className={cn("bg-card/50 backdrop-blur-sm border-border p-6", className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg">
          <Flame className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Go Live & Challenge</h3>
          <p className="text-sm text-muted-foreground">Preview your camera, then issue a challenge</p>
        </div>
      </div>

      {/* Camera Preview Area */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-6">
        {isCameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover",
                !isVideoEnabled && "opacity-0"
              )}
            />
            
            {/* Video disabled overlay */}
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center">
                  <VideoOff className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Camera Off</p>
                </div>
              </div>
            )}

            {/* Status badges */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              {isWaiting && (
                <Badge variant="secondary" className="animate-pulse bg-accent text-accent-foreground">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Waiting for Challenger
                </Badge>
              )}
              {challengerJoined && (
                <Badge variant="default" className="bg-primary text-primary-foreground">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {challengerName} Joined!
                </Badge>
              )}
              {isCameraActive && !isWaiting && !challengerJoined && (
                <Badge className="bg-primary/90 text-primary-foreground">
                  <Eye className="w-3 h-3 mr-1" />
                  Preview
                </Badge>
              )}
            </div>

            {/* Camera controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <Button
                size="sm"
                variant={isMicEnabled ? "secondary" : "destructive"}
                onClick={toggleMic}
              >
                {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant={isVideoEnabled ? "secondary" : "destructive"}
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={stopCamera}
              >
                Stop Camera
              </Button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Video className="w-16 h-16 text-muted-foreground mb-4" />
            <Button
              onClick={startCamera}
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
            >
              <Radio className="w-5 h-5 mr-2" />
              Start Camera Preview
            </Button>
          </div>
        )}
      </div>

      {/* Challenge Form - Only show when camera is active and not waiting */}
      {isCameraActive && !isWaiting && !challengerJoined && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Challenge Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Best Fade in Miami - Come at me!"
              className="mt-1"
            />
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
            onClick={handleIssueChallenge}
            disabled={isSubmitting || !title.trim()}
            className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Issuing Challenge...
              </>
            ) : (
              <>
                <Flame className="w-4 h-4 mr-2" />
                Issue Challenge & Go Live
              </>
            )}
          </Button>
        </div>
      )}

      {/* Waiting State */}
      {isWaiting && (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-primary">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="font-semibold">Waiting for a challenger...</span>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Users className="w-4 h-4" />
            <span>Other barbers can see your challenge and accept it</span>
          </div>

          <Button
            variant="outline"
            onClick={handleCancelChallenge}
            className="w-full"
          >
            Cancel Challenge
          </Button>
        </div>
      )}

      {/* Challenger Joined - Enter Battle */}
      {challengerJoined && (
        <div className="text-center space-y-4">
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-2" />
            <h4 className="text-lg font-bold text-primary">Challenger Joined!</h4>
            <p className="text-muted-foreground">{challengerName} has accepted your challenge</p>
          </div>

          <Button
            onClick={handleEnterBattle}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-lg"
          >
            <Radio className="w-5 h-5 mr-2" />
            Enter Battle Arena
          </Button>
        </div>
      )}
    </Card>
  );
};
