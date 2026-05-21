import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SwipeableStep } from './SwipeableStep';
import { useStepDirection } from './LaunchWizard';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';
import ScrollMorphHero, { type TierColor } from '@/components/ui/scroll-morph-hero';

interface Result { ticket_code: string; tier_color: TierColor }

interface Props {
  email: string;
  onResult: (result: Result) => void;
  onBack: () => void;
}

const haptic = (ms = 25) => { try { navigator.vibrate?.(ms); } catch { /* */ } };

export const StepRaffleSpin = ({ email, onResult, onBack }: Props) => {
  const direction = useStepDirection();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const spin = async () => {
    if (spinning || result) return;
    setError(null);
    setSpinning(true);
    haptic(80);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('claim-raffle-ticket', {
        body: { email, fingerprint: getDeviceFingerprint() },
      });
      const payload = data as { ok?: boolean; ticket_code?: string; tier_color?: TierColor; error?: string; message?: string } | null;
      if (fnErr || !payload?.ticket_code) {
        setError(payload?.message ?? payload?.error ?? fnErr?.message ?? 'Spin failed. Try again.');
        setSpinning(false);
        return;
      }
      // 3.5s anticipation before the reveal lands
      setTimeout(() => {
        haptic(120);
        setResult({ ticket_code: payload.ticket_code!, tier_color: payload.tier_color ?? 'white' });
      }, 3500);
    } catch (err) {
      setError(String(err));
      setSpinning(false);
    }
  };

  return (
    <SwipeableStep direction={direction} canAdvance={!!result} onSwipeNext={() => result && onResult(result)} onSwipeBack={spinning ? undefined : onBack}>
      <div className="space-y-4">
        <div className="flex items-center justify-between -mt-1 min-h-[20px]">
          <button
            type="button"
            onClick={() => { if (!spinning) { haptic(); onBack(); } }}
            disabled={spinning}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-orange-400 disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">The Vault</span>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            {result ? 'Locked!' : spinning ? 'Spinning…' : 'Spin the vault'}
          </h2>
          <p className="text-xs text-white/60">
            {result ? 'Your tier is sealed.' : spinning ? 'Hold tight — finding your color.' : 'Tap to find your hidden color.'}
          </p>
        </div>

        <div
          className="relative mx-auto w-full max-w-[520px] h-[340px] sm:h-[400px] rounded-[18px] overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at 50% 60%, hsla(195,100%,30%,0.18), transparent 60%), hsl(0,0%,2%)',
            border: '1px solid hsla(195,100%,55%,0.2)',
            boxShadow: 'inset 0 0 60px hsla(0,0%,0%,0.6)',
          }}
        >
          <ScrollMorphHero
            autoSpin={spinning}
            tierColor={result?.tier_color ?? 'white'}
            idleLabel={spinning ? 'Spinning the vault…' : 'Tap below to spin'}
            settledLabel="Color locked"
            centerSlot={null}
          />

          {!spinning && !result && (
            <button
              type="button"
              onClick={spin}
              className="absolute inset-0 z-10 flex items-center justify-center group"
            >
              <motion.div
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.05 }}
                animate={{ boxShadow: ['0 0 24px rgba(255,95,31,0.5)', '0 0 44px rgba(255,95,31,0.9)', '0 0 24px rgba(255,95,31,0.5)'] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="w-32 h-32 rounded-full flex flex-col items-center justify-center text-white"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #FFD27A, #FF8C00 50%, #B84A0E)',
                  border: '3px solid rgba(255,255,255,0.4)',
                }}
              >
                <Sparkles className="w-7 h-7 mb-1" />
                <span className="text-xs font-black uppercase tracking-widest">Tap to spin</span>
              </motion.div>
            </button>
          )}
        </div>

        {error && <p className="text-xs text-red-400 flex items-center justify-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

        {result && (
          <button
            type="button"
            onClick={() => onResult(result)}
            className="relative w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 transition-transform active:scale-95"
            style={{
              background: 'linear-gradient(135deg, hsl(20,100%,56%) 0%, hsl(28,100%,50%) 50%, hsl(35,100%,65%) 100%)',
              border: '1px solid hsla(0,0%,100%,0.3)',
              boxShadow: '0 8px 24px hsla(20,100%,56%,0.45)',
            }}
          >
            Reveal my ticket
          </button>
        )}

        {spinning && !result && (
          <p className="text-[10px] text-center text-white/40 flex items-center justify-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> 3 seconds…
          </p>
        )}
      </div>
    </SwipeableStep>
  );
};
