import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, X, Coins, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIncomingChallengeOverlay } from '@/hooks/useIncomingChallengeOverlay';
import { supabase } from '@/integrations/supabase/client';
import { differenceInSeconds } from 'date-fns';
import { toast } from 'sonner';

const flagFromCC = (cc?: string | null) => {
  if (!cc || cc.length !== 2) return undefined;
  const A = 0x1f1e6;
  return (
    String.fromCodePoint(A + cc.toUpperCase().charCodeAt(0) - 65) +
    String.fromCodePoint(A + cc.toUpperCase().charCodeAt(1) - 65)
  );
};

export const IncomingChallengeOverlay = () => {
  const { pending, dismiss } = useIncomingChallengeOverlay();
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!pending?.expires_at) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pending?.expires_at]);

  if (!pending) return null;

  const secondsLeft = pending.expires_at
    ? Math.max(0, differenceInSeconds(new Date(pending.expires_at), new Date(now)))
    : null;
  const expired = secondsLeft !== null && secondsLeft <= 0;
  const isFree = !pending.stake_amount || pending.stake_amount === 0;
  const flag = flagFromCC(pending.challenger_country);

  const handleAccept = async () => {
    if (accepting || expired) return;
    setAccepting(true);
    try {
      const { data, error } = await supabase.functions.invoke('match-challenge-stake', {
        body: { challenge_id: pending.challenge_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Challenge Accepted! ⚔️', {
        description: 'Entering the lobby...',
      });

      // Mark notification read so it doesn't re-pop
      await supabase
        .from('notifications')
        .update({ read: true, dismissed_at: new Date().toISOString() })
        .eq('id', pending.notification_id);

      // Resolve battle id from response, or fall back to the pending payload
      let battleId: string | undefined = data?.battle_id || pending.battle_id || undefined;
      if (!battleId) {
        const { data: ch } = await supabase
          .from('open_challenges')
          .select('battle_id')
          .eq('id', pending.challenge_id)
          .maybeSingle();
        battleId = (ch as any)?.battle_id ?? undefined;
      }

      dismiss();
      if (battleId) navigate(`/battle/${battleId}/lobby?source=challenge`);
    } catch (err: any) {
      console.error('[IncomingChallengeOverlay] accept failed', err);
      toast.error(err?.message || 'Failed to accept challenge');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (declining) return;
    setDeclining(true);
    try {
      const nowIso = new Date().toISOString();
      // open_challenges.status check constraint allows only:
      // 'waiting_for_opponent' | 'completed' | 'expired'.
      // Treat a decline as expired-now so cleanup + feed filters drop it instantly.
      const { error: upErr } = await supabase
        .from('open_challenges')
        .update({ status: 'expired', expires_at: nowIso })
        .eq('id', pending.challenge_id);
      if (upErr) console.warn('[IncomingChallengeOverlay] decline status update failed', upErr);

      await supabase
        .from('notifications')
        .update({ read: true, dismissed_at: nowIso })
        .eq('id', pending.notification_id);

      toast('Challenge declined');
      dismiss();
    } catch (err) {
      console.error('[IncomingChallengeOverlay] decline failed', err);
      dismiss();
    } finally {
      setDeclining(false);
    }
  };

  const handleClose = () => {
    // Close-only (overlay stays dismissable for this session) — keep notification unread so user can revisit via bell.
    dismiss();
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="incoming-challenge"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 240 }}
          className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-orange-500/40 bg-gradient-to-b from-zinc-950 to-black shadow-[0_0_60px_rgba(249,115,22,0.35)] ring-1 ring-orange-400/30"
        >
          {/* Animated headline strip */}
          <div className="relative overflow-hidden border-b border-orange-500/30 bg-gradient-to-r from-red-600/30 via-orange-500/30 to-red-600/30 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-orange-300 animate-pulse" />
                <h2 className="text-sm font-black uppercase tracking-[0.25em] text-orange-100">
                  Incoming Challenge
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="rounded-full p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4 p-5">
            {/* Challenger card */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <Avatar className="h-12 w-12 border-2 border-orange-400/60">
                {pending.challenger_avatar ? <AvatarImage src={pending.challenger_avatar} /> : null}
                <AvatarFallback className="bg-orange-500/30 text-orange-100 font-bold">
                  {pending.challenger_username?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-white">
                  {flag && <span className="mr-1">{flag}</span>}
                  {pending.challenger_username}
                </p>
                <p className="truncate text-xs text-white/60">{pending.title}</p>
              </div>
            </div>

            {/* Stake / pot */}
            <div className="flex items-center justify-between rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-4 py-3">
              <div className="flex items-center gap-2 text-yellow-300">
                <Coins className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isFree ? 'Free Challenge' : 'Stake'}
                </span>
              </div>
              <span className="text-lg font-black text-yellow-200">
                {isFree ? 'No BB locked' : `${pending.stake_amount} BB`}
              </span>
            </div>

            {/* Countdown */}
            {secondsLeft !== null && !expired && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-mono uppercase tracking-widest text-white/60">
                <Clock className="h-3 w-3" />
                <span>
                  {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')} to respond
                </span>
              </div>
            )}
            {expired && (
              <p className="text-center text-xs font-bold uppercase tracking-widest text-red-400">
                This challenge has expired
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={handleAccept}
                disabled={accepting || declining || expired}
                className="h-14 w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-base font-black uppercase tracking-wider text-white shadow-[0_0_24px_rgba(16,185,129,0.5)] hover:from-green-400 hover:to-emerald-400"
              >
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entering...
                  </>
                ) : (
                  '⚔️ Accept Challenge'
                )}
              </Button>
              <Button
                onClick={handleDecline}
                disabled={accepting || declining}
                variant="outline"
                className="h-12 w-full rounded-xl border-red-500/40 bg-red-500/10 text-sm font-bold uppercase tracking-widest text-red-200 hover:border-red-400/70 hover:bg-red-500/20 hover:text-red-100"
              >
                {declining ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                Decline
              </Button>
            </div>

            <p className="text-center text-[10px] font-mono uppercase tracking-widest text-white/35">
              Closing the X keeps it unread in your bell
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
