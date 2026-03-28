import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { HLSVideoPlayer } from '@/components/battles/HLSVideoPlayer';
import { FloatingReactions, ReactionPicker } from '@/components/battles/FloatingReactions';
import { BattleChat } from '@/components/battles/BattleChat';
import { VoteComboIndicator } from '@/components/battles/VoteComboIndicator';
import { PresenceIndicator } from '@/components/battles/PresenceIndicator';
import { BattleSettings } from '@/components/battles/BattleSettings';
import { AnimatedCounter } from '@/components/battles/AnimatedCounter';
import { useVoteCombo } from '@/hooks/useVoteCombo';
import { useRealtimeBattleViewers } from '@/hooks/useRealtimeBattleViewers';
import { HapticFeedback } from '@/utils/hapticFeedback';
import { AudioManager } from '@/utils/audioManager';
import { CelebrationEffects } from '@/utils/celebrationEffects';
import { Button } from '@/components/ui/button';
import { X, MessageSquare, Settings as SettingsIcon, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function BattleTheater() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const { comboCount, bonusEarned, incrementCombo } = useVoteCombo(id || '', user?.id);
  const viewerData = useRealtimeBattleViewers(id || '');

  useEffect(() => { AudioManager.init(); AudioManager.preloadSounds(); }, []);

  // Fetch battle details
  const { data: battle, isLoading } = useQuery({
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
    enabled: !!id && !!battle,
    refetchInterval: 2000,
  });

  // Auto-hide controls
  useEffect(() => {
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
  }, []);

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

  // Resolve video source: IVS playback > VOD video URL > null
  const barber1VideoSrc = (battle as any).ivs_playback_url || battle.barber_1_video_url || battle.stream_url || null;
  const barber2VideoSrc = battle.barber_2_video_url || null;

  // Detect if source is a direct MP4 (R2 recording) vs HLS stream
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

      {/* 50/50 Split Screen */}
      <div className="h-full flex">
        {/* Left Side - Barber 1 */}
        <div className="flex-1 relative">
          {isMP4(barber1VideoSrc) ? (
            <video
              src={barber1VideoSrc!}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <HLSVideoPlayer
              src={barber1VideoSrc}
              isLive={battle.status === 'voting'}
              title={barber1?.name}
              size="large"
              autoPlay
            />
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
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-6 px-8 rounded-xl shadow-2xl"
              >
                {userVote === battle.creation1_id ? '✓ Voted' : 'VOTE'}
              </Button>
              <Button variant="outline" size="icon" onClick={handleLike} className="bg-black/40 backdrop-blur-sm border-white/20 hover:bg-white/20">
                <Heart className="h-5 w-5 text-white" />
              </Button>
            </div>
          </div>
        </div>

        <div className="w-px bg-white/30" />

        {/* Right Side - Barber 2 */}
        <div className="flex-1 relative">
          {isMP4(barber2VideoSrc) ? (
            <video
              src={barber2VideoSrc!}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <HLSVideoPlayer
              src={barber2VideoSrc}
              isLive={battle.status === 'voting'}
              title={barber2?.name}
              size="large"
              autoPlay
            />
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
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-6 px-8 rounded-xl shadow-2xl"
              >
                {userVote === battle.creation2_id ? '✓ Voted' : 'VOTE'}
              </Button>
              <Button variant="outline" size="icon" onClick={handleLike} className="bg-black/40 backdrop-blur-sm border-white/20 hover:bg-white/20">
                <Heart className="h-5 w-5 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </div>

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
