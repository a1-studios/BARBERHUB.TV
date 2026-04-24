import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fbqTrack, getFbp, getFbc } from '@/lib/metaPixel';
import { gtagFireRegistration } from '@/lib/googleAds';
import { readAttribution } from '@/lib/urlParams';
import { triggerCelebration } from '@/utils/celebrationEffects';
import type { LaunchWizardState } from './LaunchWizard';

interface StepRevealProps {
  state: LaunchWizardState;
  onClose: () => void;
}

const haptic = (ms = 25) => {
  try { navigator.vibrate?.(ms); } catch { /* ignore */ }
};

export const StepReveal = ({ state, onClose }: StepRevealProps) => {
  const [saved, setSaved] = useState(false);
  const prize = state.prize;

  useEffect(() => {
    haptic(40);
    // Confetti — best-effort, won't crash if unavailable
    try { triggerCelebration?.('jackpot'); } catch { /* ignore */ }

    const finalize = async () => {
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
        setSaved(true);
      } catch (err) {
        console.warn('[StepReveal] save failed', err);
        setSaved(true);
      }

      // Fire CompleteRegistration on Meta — get back the event_id for cross-platform dedup
      const eventId = await fbqTrack('CompleteRegistration', {
        email: state.email,
        country: state.country ?? undefined,
        user_type: state.role ?? undefined,
        extra: {
          prize_label: prize?.label,
          prize_bb: prize?.bb_value ?? 0,
        },
      });

      // Mirror to Google Ads — same transaction_id for dedup. value = USD equivalent (5 BB = $1).
      gtagFireRegistration({
        transaction_id: eventId,
        value: prize?.bb_value ? prize.bb_value / 5 : undefined,
      });
    };
    void finalize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6 text-center pb-2"
    >
      {/* 3D Coin Pop */}
      <div className="relative h-32 flex items-center justify-center" style={{ perspective: '800px' }}>
        {/* Expanding orange ring */}
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
        {/* The coin */}
        <motion.div
          initial={{ scale: 0, rotateY: 720, y: 80 }}
          animate={{ scale: [0, 1.25, 1], rotateY: 0, y: 0 }}
          transition={{
            scale: { duration: 0.7, times: [0, 0.7, 1], type: 'spring', stiffness: 180, damping: 12 },
            rotateY: { duration: 0.7, ease: 'easeOut' },
            y: { duration: 0.7, ease: 'easeOut' },
          }}
          className="relative w-28 h-28 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #FFE08A 0%, #FFB347 30%, #FF8C00 60%, #C2410C 100%)',
            boxShadow:
              '0 14px 40px rgba(255,95,31,0.6), inset 0 4px 10px rgba(255,255,255,0.5), inset 0 -6px 14px rgba(120,40,0,0.55)',
            transformStyle: 'preserve-3d',
          }}
        >
          <span
            className="text-3xl font-black"
            style={{
              color: '#5a2400',
              textShadow: '0 1px 0 rgba(255,255,255,0.4), 0 -1px 0 rgba(0,0,0,0.3)',
            }}
          >
            BB
          </span>
        </motion.div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
          You're locked in!
        </h2>
        <p className="text-sm text-white/70">
          Prize reserved for{' '}
          <span className="font-mono font-bold text-orange-400">{state.email}</span>
        </p>
      </div>

      {prize && (
        <div
          className="relative px-5 py-4 rounded-[16px] overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,211,122,0.15), rgba(255,140,0,0.1))',
            border: '1px solid rgba(255,211,122,0.45)',
            boxShadow: '0 0 24px rgba(255,140,0,0.35)',
          }}
        >
          {/* Diagonal shimmer sweep */}
          <motion.div
            aria-hidden
            className="absolute inset-y-0 -left-1/3 w-1/3 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              transform: 'skewX(-20deg)',
            }}
            animate={{ x: ['0%', '450%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.3 }}
          />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300/80 font-bold mb-1">
              Your prize
            </div>
            <div
              className="text-2xl font-black"
              style={{
                background: 'linear-gradient(135deg, #FFD37A 0%, #FF8C00 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {prize.label}
            </div>
          </div>
        </div>
      )}

      <div
        className="flex items-center justify-center gap-2 px-4 py-3 rounded-[14px] text-sm text-white/75"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Mail className="w-4 h-4 text-orange-400" />
        <span>We'll email you when the doors open.</span>
      </div>

      {saved && (
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
          <Check className="w-3.5 h-3.5" />
          Spot secured
        </motion.div>
      )}

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
        Done
      </button>
    </motion.div>
  );
};
