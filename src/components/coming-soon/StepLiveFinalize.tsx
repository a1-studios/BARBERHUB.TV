import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Check, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { fbqTrack, getFbp, getFbc } from '@/lib/metaPixel';
import { gtagFireRegistration } from '@/lib/googleAds';
import { readAttribution } from '@/lib/urlParams';
import { CelebrationEffects } from '@/utils/celebrationEffects';
import { AnimatedCounter } from '@/components/battles/AnimatedCounter';
import { markGateCompleted } from '@/components/promotion-gate/useGateState';
import type { LaunchWizardState } from './LaunchWizard';

interface StepLiveFinalizeProps {
  state: LaunchWizardState;
  onClose: () => void;
}

const haptic = (ms = 25) => {
  try { navigator.vibrate?.(ms); } catch { /* ignore */ }
};

const passwordSchema = z.string().min(8, 'At least 8 characters');

export const StepLiveFinalize = ({ state, onClose }: StepLiveFinalizeProps) => {
  const prize = state.prize;
  const prizeBb = prize?.bb_value ?? 0;
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [counterValue, setCounterValue] = useState(0);

  // Coin pop + confetti + delayed counter tick
  useEffect(() => {
    haptic(40);
    try {
      const fx = CelebrationEffects as Record<string, unknown>;
      const fn = (fx.jackpot ?? fx.fireworks ?? fx.burst ?? fx.victory) as
        | (() => void)
        | undefined;
      fn?.();
    } catch { /* ignore */ }
    if (prizeBb > 0) {
      const t = setTimeout(() => setCounterValue(prizeBb), 900);
      return () => clearTimeout(t);
    }
  }, [prizeBb]);

  const handleSignUp = async () => {
    const pw = passwordSchema.safeParse(password);
    if (!pw.success) {
      setError(pw.error.errors[0].message);
      return;
    }
    setError(null);
    setSubmitting(true);
    haptic(15);

    try {
      // Persist prize for auto-claim post-signup (Index.tsx recovery effect)
      try {
        localStorage.setItem(
          'pending_spin_prize',
          JSON.stringify({
            email: state.email,
            role: state.role,
            prize_id: prize?.id,
            prize_label: prize?.label,
            prize_bb: prize?.bb_value ?? 0,
            prize_type: prize?.prize_type ?? 'bb',
            duration_months: prize?.duration_months ?? 0,
            timestamp: Date.now(),
          })
        );
      } catch { /* ignore quota */ }

      const { error: signUpError } = await supabase.auth.signUp({
        email: state.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            user_type: state.role ?? 'fan',
            display_name: state.email.split('@')[0],
            country_code: state.country ?? null,
          },
        },
      });

      if (signUpError) {
        // Common case: user already exists — still mark gate complete so they aren't blocked.
        if (/already|exists|registered/i.test(signUpError.message)) {
          setError('Account exists — sign in to claim your prize.');
        } else {
          setError(signUpError.message);
        }
        setSubmitting(false);
        return;
      }

      // Save attribution + lead row (best-effort)
      const attribution = readAttribution();
      try {
        await supabase.from('marketing_leads').upsert(
          {
            email: state.email,
            user_role: state.role,
            country_code: state.country,
            prize_label: prize?.label ?? null,
            prize_bb: prize?.bb_value ?? 0,
            prize_id: prize?.id ?? null,
            converted: true,
            fbp: getFbp(),
            fbc: getFbc(),
            source_url: attribution.source_url,
            utm_source: attribution.utm_source,
            utm_medium: attribution.utm_medium,
            utm_campaign: attribution.utm_campaign,
            gclid: attribution.gclid,
            gbraid: attribution.gbraid,
            wbraid: attribution.wbraid,
          } as never,
          { onConflict: 'email' }
        );
      } catch (err) {
        console.warn('[StepLiveFinalize] lead upsert failed', err);
      }

      // Fire CompleteRegistration on Meta + Google Ads (shared event_id)
      const eventId = await fbqTrack('CompleteRegistration', {
        email: state.email,
        country: state.country ?? undefined,
        user_type: state.role ?? undefined,
        extra: { prize_label: prize?.label, prize_bb: prizeBb },
      });
      gtagFireRegistration({
        transaction_id: eventId,
        value: prizeBb ? prizeBb / 5 : undefined,
      });

      markGateCompleted();
      setDone(true);
      setSubmitting(false);
    } catch (err) {
      console.error('[StepLiveFinalize] signup failed', err);
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-5 text-center pb-2"
    >
      {/* 3D Coin Pop */}
      <div className="relative h-28 flex items-center justify-center" style={{ perspective: '800px' }}>
        <motion.div
          aria-hidden
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.85, ease: 'easeOut', delay: 0.05 }}
          className="absolute w-24 h-24 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,140,0,0.5), transparent 70%)',
            border: '2px solid rgba(255,95,31,0.7)',
          }}
        />
        <motion.div
          initial={{ scale: 0, rotateY: 720, y: 80 }}
          animate={{ scale: [0, 1.25, 1], rotateY: 0, y: 0 }}
          transition={{
            scale: { duration: 0.7, times: [0, 0.7, 1], type: 'spring', stiffness: 180, damping: 12 },
            rotateY: { duration: 0.7, ease: 'easeOut' },
            y: { duration: 0.7, ease: 'easeOut' },
          }}
          className="relative w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #FFE08A 0%, #FFB347 30%, #FF8C00 60%, #C2410C 100%)',
            boxShadow:
              '0 14px 40px rgba(255,95,31,0.6), inset 0 4px 10px rgba(255,255,255,0.5), inset 0 -6px 14px rgba(120,40,0,0.55)',
            transformStyle: 'preserve-3d',
          }}
        >
          <span
            className="text-2xl font-black"
            style={{ color: '#5a2400', textShadow: '0 1px 0 rgba(255,255,255,0.4), 0 -1px 0 rgba(0,0,0,0.3)' }}
          >
            BB
          </span>
        </motion.div>
      </div>

      {/* +N BB animated counter (delayed for dopamine timing) */}
      {prizeBb > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.4 }}
          className="text-center"
        >
          <span
            className="text-2xl font-black"
            style={{
              background: 'linear-gradient(135deg, #FFD37A 0%, #FF8C00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            +<AnimatedCounter value={counterValue} duration={900} /> BB
          </span>
        </motion.div>
      )}

      <div className="space-y-1.5">
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
          {done ? 'Welcome to the Arena!' : 'Finish to claim'}
        </h2>
        <p className="text-xs text-white/65">
          {done ? (
            <>Check <span className="font-mono font-bold text-orange-400">{state.email}</span> to verify.</>
          ) : (
            <>Set a password to unlock <span className="text-orange-400 font-semibold">{prize?.label ?? 'your prize'}</span></>
          )}
        </p>
      </div>

      {!done && (
        <form
          onSubmit={(e) => { e.preventDefault(); handleSignUp(); }}
          className="space-y-4"
        >
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400/70 pointer-events-none" />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Choose a password (min 8)"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
              disabled={submitting}
              className="w-full h-14 pl-11 pr-4 rounded-[14px] bg-black/40 text-white text-base font-medium focus:outline-none transition-all"
              style={{
                border: '1px solid rgba(255,95,31,0.35)',
                boxShadow: 'inset 0 0 0 1px rgba(255,95,31,0)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = '1px solid rgb(255,95,31)';
                e.currentTarget.style.boxShadow = '0 0 22px rgba(255,95,31,0.55), 0 0 0 2px rgba(255,95,31,0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = '1px solid rgba(255,95,31,0.35)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
          {error && (
            <p className="text-xs text-red-400 flex items-center justify-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="relative w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 overflow-hidden transition-transform active:scale-95 disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 8px 24px rgba(255,95,31,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
            }}
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Securing...</>
            ) : (
              <>Claim & Enter Arena <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      )}

      {done && (
        <>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{
              color: '#00F0FF',
              background: 'rgba(0,240,255,0.08)',
              border: '1px solid rgba(0,240,255,0.3)',
              boxShadow: '0 0 12px rgba(0,240,255,0.25)',
            }}
          >
            <Check className="w-3.5 h-3.5" /> Spot secured
          </motion.div>
          <button
            type="button"
            onClick={() => { haptic(); onClose(); }}
            className="relative w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 overflow-hidden transition-transform active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 8px 24px rgba(255,95,31,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
            }}
          >
            Enter the Arena
          </button>
        </>
      )}
    </motion.div>
  );
};
