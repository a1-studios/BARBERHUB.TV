import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Mail, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fbqTrack, getFbp, getFbc } from '@/lib/metaPixel';
import { readAttribution } from '@/lib/urlParams';
import type { LaunchWizardState } from './LaunchWizard';

interface StepRevealProps {
  state: LaunchWizardState;
  onClose: () => void;
}

export const StepReveal = ({ state, onClose }: StepRevealProps) => {
  const [saved, setSaved] = useState(false);
  const prize = state.prize;

  useEffect(() => {
    const finalize = async () => {
      const attribution = readAttribution();
      // Upsert lead with full data
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
          } as never,
          { onConflict: 'email' }
        );
        setSaved(true);
      } catch (err) {
        console.warn('[StepReveal] save failed', err);
        setSaved(true);
      }

      // Fire CompleteRegistration (pixel + CAPI)
      void fbqTrack('CompleteRegistration', {
        email: state.email,
        country: state.country ?? undefined,
        user_type: state.role ?? undefined,
        extra: {
          prize_label: prize?.label,
          prize_bb: prize?.bb_value ?? 0,
        },
      });
    };
    void finalize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-6 text-center"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="inline-flex items-center justify-center w-20 h-20 rounded-full mx-auto"
        style={{
          background: 'radial-gradient(circle, rgba(255,140,0,0.4), transparent 70%)',
          boxShadow: '0 0 50px rgba(255,95,31,0.6)',
        }}
      >
        <Trophy className="w-10 h-10 text-orange-400" />
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
          You're locked in!
        </h2>
        <p className="text-sm text-white/70">
          Your prize is reserved for{' '}
          <span className="font-mono font-bold text-orange-400">{state.email}</span>.
        </p>
      </div>

      {prize && (
        <div className="px-5 py-4 rounded-[14px] border border-orange-500/40 bg-orange-500/10 space-y-1">
          <div className="text-[11px] uppercase tracking-wider text-orange-300/80">Your prize</div>
          <div className="text-xl font-black text-orange-400">{prize.label}</div>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-[14px] border border-white/10 bg-white/5 text-sm text-white/70">
        <Mail className="w-4 h-4 text-orange-400" />
        <span>We'll email you when the doors open.</span>
      </div>

      {saved && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-1.5 text-xs text-emerald-400"
        >
          <Check className="w-3.5 h-3.5" />
          Spot saved
        </motion.div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="w-full h-11 rounded-[14px] border border-orange-500/40 bg-background/60 text-orange-400 font-bold uppercase tracking-wider text-sm hover:bg-orange-500/10 transition-colors"
      >
        Done
      </button>
    </motion.div>
  );
};
