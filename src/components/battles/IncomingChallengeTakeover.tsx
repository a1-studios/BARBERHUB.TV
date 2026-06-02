import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Coins, Clock, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { invokeAuthedFunction } from '@/lib/invokeAuthed';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { differenceInSeconds } from 'date-fns';

interface IncomingChallenge {
  id: string;
  notification_id: string;
  challenger_username: string;
  title: string;
  stake_amount: number;
  pot_total: number;
  expires_at: string | null;
}

/**
 * IncomingChallengeTakeover — Full-screen cinematic Accept/Decline overlay.
 * Triggered by realtime INSERT on notifications where type='challenge_received'.
 * Queues multiple challenges so a second arrival doesn't blow away the first.
 */
export const IncomingChallengeTakeover = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<IncomingChallenge[]>([]);
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const current = queue[0] || null;

  const loadChallenge = useCallback(async (notificationId: string, challengeId: string) => {
    const { data, error } = await supabase
      .from('open_challenges')
      .select('id, challenger_username, title, stake_amount, pot_total, expires_at, status')
      .eq('id', challengeId)
      .maybeSingle();
    if (error || !data) return;
    if (data.status !== 'waiting_for_opponent') return;
    setQueue(prev => {
      if (prev.some(c => c.id === data.id)) return prev;
      return [...prev, {
        id: data.id,
        notification_id: notificationId,
        challenger_username: data.challenger_username || 'A barber',
        title: data.title || 'Challenge',
        stake_amount: data.stake_amount || 0,
        pot_total: data.pot_total || 0,
        expires_at: data.expires_at,
      }];
    });
  }, []);

  // Subscribe to incoming challenge notifications
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`incoming-challenges-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const n = payload.new as any;
        if (n.type !== 'challenge_received') return;
        const challengeId = n.data?.challenge_id;
        if (!challengeId) return;
        loadChallenge(n.id, challengeId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, loadChallenge]);

  // Live countdown
  useEffect(() => {
    if (!current?.expires_at) { setCountdown(null); return; }
    const tick = () => {
      const s = Math.max(0, differenceInSeconds(new Date(current.expires_at!), new Date()));
      setCountdown(s);
      if (s <= 0) dismissCurrent();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const dismissCurrent = useCallback(async (markRead = true) => {
    if (!current) return;
    if (markRead && user?.id) {
      await supabase
        .from('notifications')
        .update({ read: true, dismissed_at: new Date().toISOString() })
        .eq('id', current.notification_id);
    }
    setQueue(prev => prev.slice(1));
    setBusy(null);
  }, [current, user?.id]);

  const handleAccept = async () => {
    if (!current) return;
    setBusy('accept');
    try {
      const { data, error } = await invokeAuthedFunction('match-challenge-stake', {
        challenge_id: current.id,
      });
      if (error) { if (error.message !== 'Not signed in' && error.message !== 'Session expired') throw error; setBusy(null); return; }
      if (data?.error) throw new Error(data.error);
      toast.success('Challenge accepted! Entering the arena…');
      const battleId = data?.battle_id;
      await dismissCurrent(true);
      if (battleId) navigate(`/battle/${battleId}/contender`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to accept challenge');
      setBusy(null);
    }
  };

  const handleDecline = async () => {
    if (!current) return;
    setBusy('decline');
    try {
      const nowIso = new Date().toISOString();
      await supabase
        .from('open_challenges')
        .update({ status: 'declined', expires_at: nowIso })
        .eq('id', current.id);
      toast(`You declined ${current.challenger_username}'s challenge.`);
    } catch { /* best-effort */ }
    await dismissCurrent(true);
  };

  if (!current) return null;

  const isFree = current.stake_amount === 0;
  const mm = countdown !== null ? Math.floor(countdown / 60) : null;
  const ss = countdown !== null ? countdown % 60 : null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={current.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
      >
        <button
          onClick={() => dismissCurrent(true)}
          className="absolute top-4 right-4 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
          aria-label="Dismiss"
        >
          <X className="w-6 h-6" />
        </button>

        <motion.div
          initial={{ scale: 0.85, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className="relative w-full max-w-md rounded-3xl border border-primary/40 bg-gradient-to-b from-card to-background shadow-2xl shadow-primary/20 overflow-hidden"
        >
          {/* Glow header */}
          <div className="relative px-6 pt-8 pb-6 text-center bg-gradient-to-b from-red-600/20 via-orange-500/10 to-transparent">
            <motion.div
              animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5 }}
              className="inline-flex p-4 rounded-full bg-gradient-to-br from-red-600 to-orange-500 shadow-lg shadow-red-500/40 mb-3"
            >
              <Swords className="w-9 h-9 text-white" />
            </motion.div>
            <p className="text-[11px] tracking-[0.3em] text-red-400 font-bold mb-1">INCOMING CHALLENGE</p>
            <h2 className="text-2xl font-black text-foreground leading-tight">
              {current.challenger_username}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">wants to battle you</p>
          </div>

          {/* Body */}
          <div className="px-6 pb-6 space-y-4">
            <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Challenge</p>
              <p className="text-sm font-medium text-foreground">{current.title}</p>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              {isFree ? (
                <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
                  🆓 Free · viewer-funded pot
                </Badge>
              ) : (
                <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-xs font-bold">
                  <Coins className="w-3 h-3 mr-1" />
                  {current.stake_amount} BB stake
                </Badge>
              )}
              {countdown !== null && (
                <Badge
                  variant="outline"
                  className={`text-xs ${countdown < 60 ? 'border-destructive/60 text-destructive animate-pulse' : 'border-blue-500/40 text-blue-400'}`}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {mm}:{ss!.toString().padStart(2, '0')}
                </Badge>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={handleAccept}
                disabled={busy !== null}
                size="lg"
                className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-500/30"
              >
                {busy === 'accept' ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Entering arena…</>
                ) : (
                  <>⚔️ Accept{!isFree ? ` · Match ${current.stake_amount} BB` : ''}</>
                )}
              </Button>
              <Button
                onClick={handleDecline}
                disabled={busy !== null}
                variant="outline"
                size="lg"
                className="w-full h-11"
              >
                {busy === 'decline' ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Declining…</>
                ) : (
                  'Decline'
                )}
              </Button>
            </div>

            {queue.length > 1 && (
              <p className="text-[11px] text-center text-muted-foreground pt-1">
                +{queue.length - 1} more challenge{queue.length - 1 > 1 ? 's' : ''} waiting
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default IncomingChallengeTakeover;
