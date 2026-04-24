import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { HLSVideoPlayer } from '@/components/battles/HLSVideoPlayer';
import { CloudflareStreamPlayer } from '@/components/CloudflareStreamPlayer';
import { FloatingReactions, ReactionPicker } from '@/components/battles/FloatingReactions';
import { BattleChat } from '@/components/battles/BattleChat';
import { VoteComboIndicator } from '@/components/battles/VoteComboIndicator';
import { PresenceIndicator } from '@/components/battles/PresenceIndicator';
import { BattleSettings } from '@/components/battles/BattleSettings';
import { AnimatedCounter } from '@/components/battles/AnimatedCounter';
import { LiveKitArena } from '@/components/battles/LiveKitArena';
import { DraggableBattleSplit } from '@/components/battles/DraggableBattleSplit';
import { ProcessingArena } from '@/components/battles/ProcessingArena';
import { useVoteCombo } from '@/hooks/useVoteCombo';
import { useRealtimeBattleViewers } from '@/hooks/useRealtimeBattleViewers';
import { HapticFeedback } from '@/utils/hapticFeedback';
import { AudioManager } from '@/utils/audioManager';
import { CelebrationEffects } from '@/utils/celebrationEffects';
import { Button } from '@/components/ui/button';
import { X, MessageSquare, Settings as SettingsIcon, Heart, Volume2, VolumeX, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { DonationModal } from '@/components/DonationModal';

/** VOD player — uses Cloudflare Stream UID when available, falls back to native video */
const VODPlayer = ({ src, streamUid, className }: { src: string; streamUid?: string | null; className?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  if (streamUid) {
    return (
      <CloudflareStreamPlayer
        streamUid={streamUid}
        fallbackUrl={src}
        autoPlay
        muted={isMuted}
        loop
        controls
        className={className}
      />
    );
  }

  return (
    <div className="relative w-full h-full">
      <video ref={videoRef} src={src} controls autoPlay muted playsInline loop className={className} />
      <Button
        variant="secondary"
        size="icon"
        onClick={() => {
          if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
          }
        }}
        className="absolute top-3 right-3 z-20 bg-black/60 hover:bg-black/80 backdrop-blur-sm border-0"
      >
        {isMuted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
      </Button>
    </div>
  );
};

export default function BattleTheater() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localPhase, setLocalPhase] = useState<'live' | 'processing' | 'vod' | null>(null);
  const [liveKitCreds, setLiveKitCreds] = useState<{ token: string; serverUrl: string } | null>(null);

  const { comboCount, bonusEarned, incrementCombo } = useVoteCombo(id || '', user?.id);
  const viewerData = useRealtimeBattleViewers(id || '');

  useEffect(() => { AudioManager.init(); AudioManager.preloadSounds(); }, []);

  // Fetch battle details
  const { data: battle, isLoading, refetch } = useQuery({
    queryKey: ['battle', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battles')
        .select(`
          *,
          barber1:barber_profiles!battles_barber1_id_fkey(id, name, user_id, country_code),
          barber2:barber_profiles!battles_barber2_id_fkey(id, name, user_id, country_code)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Derive phase from battle status
  useEffect(() => {
    if (!battle) return;
    if (battle.status === 'live') setLocalPhase('live');
    else if (battle.status === 'processing') setLocalPhase('processing');
    else setLocalPhase('vod');
  }, [battle?.status]);

  // Realtime subscription for status changes
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`theater-status-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'battles',
        filter: `id=eq.${id}`,
      }, (payload) => {
        const s = (payload.new as any).status;
        if (s === 'processing') setLocalPhase('processing');
        else if (s === 'voting') {
          setLocalPhase('vod');
          refetch();
        } else if (s === 'completed') {
          // Battle is fully over — kick viewers back to the discovery feed.
          toast.success('Battle ended! Back to the feed…');
          setTimeout(() => navigate('/watch', { replace: true }), 1500);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, refetch, navigate]);

  // Request viewer token when phase is live
  useEffect(() => {
    if (localPhase !== 'live' || !user || !id || liveKitCreds) return;

    const fetchToken = async () => {
      try {
        const roomName = `battle-${id}`;
        const { data, error } = await supabase.functions.invoke('get-livekit-viewer-token', {
          body: { battleId: id, roomName },
        });
        if (error) throw error;
        if (data?.token && data?.serverUrl) {
          setLiveKitCreds({ token: data.token, serverUrl: data.serverUrl });
        }
      } catch (err) {
        console.error('Failed to get viewer token:', err);
        toast.error('Could not connect to live stream');
      }
    };
    fetchToken();
  }, [localPhase, user, id, liveKitCreds]);

  // Check if user has voted
  useEffect(() => {
    const checkVote = async () => {
      if (!user || !id) return;
      const { data } = await supabase
        .from('battle_votes')
        .select('submission_id')
        .eq('battle_id', id)
        .eq('voter_id', user.id)
        .maybeSingle();
      if (data) setUserVote(data.submission_id);
    };
    checkVote();
  }, [id, user]);

  // Vote counts
  const { data: voteCounts } = useQuery({
    queryKey: ['battleVotes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battle_votes')
        .select('submission_id')
        .eq('battle_id', id);
      if (error) throw error;
      const barber1Votes = data?.filter(v => v.submission_id === battle?.creation1_id).length || 0;
      const barber2Votes = data?.filter(v => v.submission_id === battle?.creation2_id).length || 0;
      return { barber1Votes, barber2Votes, total: data?.length || 0 };
    },
    enabled: !!id && !!battle && localPhase === 'vod',
    refetchInterval: 2000,
  });

  // Auto-hide controls
  useEffect(() => {
    if (localPhase === 'live') return; // Live mode has its own UI
    let timeout: NodeJS.Timeout;
    const resetTimer = () => {
      setControlsVisible(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setControlsVisible(false), 3000);
    };
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer();
    return () => { window.removeEventListener('mousemove', resetTimer); window.removeEventListener('keydown', resetTimer); clearTimeout(timeout); };
  }, [localPhase]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (settingsOpen || chatOpen) return;
      switch (e.key) {
        case 'c': setChatOpen(prev => !prev); break;
        case 'Escape':
          if (isFullscreen) document.exitFullscreen();
          else navigate(-1);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [settingsOpen, chatOpen, navigate, isFullscreen]);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const handleVote = useCallback(async (barberId: string, submissionId: string) => {
    if (!user || userVote) { if (!user) toast.error('Please sign in to vote'); return; }
    try {
      HapticFeedback.vote();
      AudioManager.play('vote');
      const { error } = await supabase.from('battle_votes').insert({ battle_id: id!, voter_id: user.id, submission_id: submissionId });
      if (error) throw error;
      setUserVote(submissionId);
      const newCombo = await incrementCombo();
      if (newCombo && newCombo >= 2) { AudioManager.play(`combo${Math.min(newCombo, 10)}` as any); HapticFeedback.streak(newCombo); }
      CelebrationEffects.vote(window.innerWidth / 2, window.innerHeight / 2);
      toast.success('Vote cast! 🔥');
    } catch (error) { console.error('Error voting:', error); toast.error('Failed to cast vote'); }
  }, [user, userVote, id, incrementCombo]);

  const handleLike = async () => {
    if (!user) return;
    HapticFeedback.like();
    AudioManager.play('like');
    CelebrationEffects.like(window.innerWidth / 4, window.innerHeight / 2);
    toast.success('Liked! ❤️');
  };

  const handleTimeUp = useCallback(() => {
    setLocalPhase('processing');
    setLiveKitCreds(null);
  }, []);

  const handleProcessingReady = useCallback(() => {
    setLocalPhase('vod');
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading battle...</div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Battle not found</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const barber1 = battle.barber1 as any;
  const barber2 = battle.barber2 as any;

  // ─── LIVE PHASE: LiveKit Arena ───
  if (localPhase === 'live' && liveKitCreds) {
    return (
      <>
        <LiveKitArena
          battleId={id!}
          serverUrl={liveKitCreds.serverUrl}
          token={liveKitCreds.token}
          barber1Id={barber1?.id || ''}
          barber2Id={barber2?.id || ''}
          barber1Name={barber1?.name || 'Barber 1'}
          barber2Name={barber2?.name || 'Barber 2'}
          endsAt={battle.ends_at}
          onTimeUp={handleTimeUp}
          onDisconnected={() => console.log('LiveKit disconnected')}
        />
        {/* Overlay controls for live */}
        <div className="fixed top-4 left-4 z-40">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
            <X className="h-6 w-6" />
          </Button>
        </div>
        <div className="fixed top-4 right-4 z-40 flex gap-2">
          <PresenceIndicator battleId={id!} />
          <Button variant="ghost" size="icon" onClick={() => setChatOpen(!chatOpen)} className="text-white hover:bg-white/20">
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
        {user && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
            <ReactionPicker battleId={id!} userId={user.id} />
          </div>
        )}
        <FloatingReactions battleId={id!} />
        {localStorage.getItem('battleChatEnabled') !== 'false' && (
          <BattleChat battleId={id!} isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        )}
      </>
    );
  }

  // ─── PROCESSING PHASE ───
  if (localPhase === 'processing') {
    // If cloudflare_stream_uid is missing, show transcoding state
    const hasStreamUid = !!(battle as any).cloudflare_stream_uid;
    return (
      <ProcessingArena
        battleId={id!}
        onReady={handleProcessingReady}
        reason={hasStreamUid ? 'battle_processing' : 'transcoding'}
      />
    );
  }

  // ─── VOD PHASE ───
  const battleStreamUid = (battle as any).cloudflare_stream_uid as string | null;
  const barber1VideoSrc = (battle as any).ivs_playback_url || battle.barber_1_video_url || battle.stream_url || null;
  const barber2VideoSrc = battle.barber_2_video_url || null;
  const isMP4 = (url: string | null) => url?.endsWith('.mp4');

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <FloatingReactions battleId={id!} />
      <VoteComboIndicator comboCount={comboCount} bonusEarned={bonusEarned} />

      {/* Top Bar */}
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: controlsVisible ? 0 : -100 }}
        transition={{ duration: 0.3 }}
        className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 to-transparent p-4"
      >
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
            <X className="h-6 w-6" />
          </Button>
          <PresenceIndicator battleId={id!} />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setChatOpen(!chatOpen)} className="text-white hover:bg-white/20">
              <MessageSquare className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} className="text-white hover:bg-white/20">
              <SettingsIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 50/50 Split Screen — vertical stack on mobile, side-by-side on desktop.
          When no VOD is ready, show single "Recording in progress" placeholder. */}
      {!battleStreamUid && !barber1VideoSrc && !barber2VideoSrc ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6 bg-gradient-to-br from-background via-background to-primary/10">
          <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4" />
          <h2 className="text-2xl font-bold mb-2">Recording in progress</h2>
          <p className="text-muted-foreground max-w-md">
            The battle has finished and the recording is being processed. Check back soon — this page will refresh automatically when it's ready.
          </p>
        </div>
      ) : (
      <div className="absolute inset-0">
        <DraggableBattleSplit
          panelOne={
            <>
              {battleStreamUid ? (
                <CloudflareStreamPlayer streamUid={battleStreamUid} fallbackUrl={barber1VideoSrc} autoPlay muted loop />
              ) : isMP4(barber1VideoSrc) ? (
                <VODPlayer src={barber1VideoSrc!} className="w-full h-full object-cover" />
              ) : (
                <HLSVideoPlayer src={barber1VideoSrc} isLive={false} title={barber1?.name} size="large" autoPlay />
              )}
              <div className="absolute bottom-20 left-4 right-4 space-y-3">
                <div className="text-white text-center">
                  <h2 className="text-2xl font-bold mb-2">{barber1?.name}</h2>
                  <div className="flex items-center justify-center gap-4 mb-3">
                    <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                      <AnimatedCounter value={voteCounts?.barber1Votes || 0} className="text-xl font-bold" />
                      <span className="text-sm ml-2">votes</span>
                    </div>
                    <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                      <AnimatedCounter value={viewerData.barber1} className="text-xl font-bold" />
                      <span className="text-sm ml-2">viewers</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => handleVote(barber1?.id, battle.creation1_id || '')}
                    disabled={!!userVote}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-6 px-8 rounded-xl shadow-2xl"
                  >
                    {userVote === battle.creation1_id ? '✓ Voted' : 'VOTE'}
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleLike} className="bg-black/40 backdrop-blur-sm border-white/20 hover:bg-white/20">
                    <Heart className="h-5 w-5 text-white" />
                  </Button>
                </div>
              </div>
            </>
          }
          panelTwo={
            <>
              {battleStreamUid ? (
                <CloudflareStreamPlayer streamUid={battleStreamUid} fallbackUrl={barber2VideoSrc} autoPlay muted loop />
              ) : isMP4(barber2VideoSrc) ? (
                <VODPlayer src={barber2VideoSrc!} className="w-full h-full object-cover" />
              ) : (
                <HLSVideoPlayer src={barber2VideoSrc} isLive={false} title={barber2?.name} size="large" autoPlay />
              )}
              <div className="absolute bottom-20 left-4 right-4 space-y-3">
                <div className="text-white text-center">
                  <h2 className="text-2xl font-bold mb-2">{barber2?.name}</h2>
                  <div className="flex items-center justify-center gap-4 mb-3">
                    <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                      <AnimatedCounter value={voteCounts?.barber2Votes || 0} className="text-xl font-bold" />
                      <span className="text-sm ml-2">votes</span>
                    </div>
                    <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                      <AnimatedCounter value={viewerData.barber2} className="text-xl font-bold" />
                      <span className="text-sm ml-2">viewers</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => handleVote(barber2?.id, battle.creation2_id || '')}
                    disabled={!!userVote}
                    className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-bold py-6 px-8 rounded-xl shadow-2xl"
                  >
                    {userVote === battle.creation2_id ? '✓ Voted' : 'VOTE'}
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleLike} className="bg-black/40 backdrop-blur-sm border-white/20 hover:bg-white/20">
                    <Heart className="h-5 w-5 text-white" />
                  </Button>
                </div>
              </div>
            </>
          }
        />
      </div>
      )}

      {/* Bottom Reaction Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: controlsVisible ? 0 : 100 }}
        transition={{ duration: 0.3 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30"
      >
        {user && <ReactionPicker battleId={id!} userId={user.id} />}
      </motion.div>

      {localStorage.getItem('battleChatEnabled') !== 'false' && (
        <BattleChat battleId={id!} isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      )}
      <BattleSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
