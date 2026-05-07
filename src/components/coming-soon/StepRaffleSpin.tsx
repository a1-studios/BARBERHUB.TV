import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertCircle, Ticket } from 'lucide-react';
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

const TIER_STYLE: Record<TierColor, { border: string; glow: string; chip: string; text: string }> = {
  white:  { border: 'hsla(0,0%,100%,0.55)',  glow: 'hsla(0,0%,100%,0.35)',  chip: 'hsla(0,0%,100%,0.10)',  text: 'hsl(0,0%,98%)' },
  blue:   { border: 'hsla(195,100%,55%,0.7)', glow: 'hsla(195,100%,55%,0.55)', chip: 'hsla(195,100%,50%,0.12)', text: 'hsl(195,100%,80%)' },
  orange: { border: 'hsla(20,100%,56%,0.85)', glow: 'hsla(20,100%,56%,0.6)',  chip: 'hsla(20,100%,56%,0.14)',  text: 'hsl(28,100%,70%)' },
};

export const StepRaffleSpin = ({ email, onResult, onBack }: Props) => {
  const direction = useStepDirection();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  // Kick off the claim immediately when the wheel mounts; wheel animates ~2.6s
  // then onSettle reveals the ticket using the server-returned tier color.
  useEffect(() => {
    if (requested) return;
    setRequested(true);
    (async () => {
      const { data, error: fnErr } = await supabase.functions.invoke('claim-raffle-ticket', {
        body: { email, fingerprint: getDeviceFingerprint() },
      });
      const payload = data as { ok?: boolean; ticket_code?: string; tier_color?: TierColor; error?: string; message?: string } | null;
      if (fnErr || !payload?.ticket_code) {
        setError(payload?.message ?? payload?.error ?? fnErr?.message ?? 'Spin failed. Try again.');
        return;
      }
      setResult({ ticket_code: payload.ticket_code, tier_color: payload.tier_color ?? 'white' });
    })();
  }, [email, requested]);

  const onSettle = () => {
    haptic(80);
  };

  const tier = result?.tier_color ?? 'white';
  const style = TIER_STYLE[tier];

  return (
    <SwipeableStep direction={direction} canAdvance={!!result} onSwipeNext={() => result && onResult(result)} onSwipeBack={onBack}>
      <div className="space-y-4">
        <div className="flex items-center justify-between -mt-1 min-h-[20px]">
          <button type="button" onClick={() => { haptic(); onBack(); }} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-orange-400">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Step 3 of 3</span>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            {result ? 'Color locked' : 'Spinning…'}
          </h2>
          <p className="text-xs text-white/60">
            {result ? 'Your tier is sealed. Tune in Sunday.' : 'No prizes shown — only your color.'}
          </p>
        </div>

        {/* Holographic wheel */}
        <div
          className="relative mx-auto w-full max-w-[520px] h-[360px] sm:h-[420px] rounded-[18px] overflow-hidden"
          style={{
            background:
              'radial-gradient(ellipse at 50% 60%, hsla(195,100%,30%,0.18), transparent 60%), hsl(0,0%,2%)',
            border: '1px solid hsla(195,100%,55%,0.2)',
            boxShadow: 'inset 0 0 60px hsla(0,0%,0%,0.6)',
          }}
        >
          <ScrollMorphHero
            autoSpin
            tierColor={tier}
            onSettle={onSettle}
            idleLabel="Spinning the vault…"
            settledLabel="Your color is locked"
            centerSlot={
              result ? (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                  className="rounded-2xl px-5 py-4 text-center"
                  style={{
                    background: 'hsla(0,0%,4%,0.85)',
                    border: `1.5px solid ${style.border}`,
                    boxShadow: `0 0 40px ${style.glow}, inset 0 1px 0 hsla(0,0%,100%,0.15)`,
                    backdropFilter: 'blur(12px)',
                    minWidth: 200,
                  }}
                >
                  <div
                    className="inline-flex items-center gap-1.5 mb-2 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-[0.2em] font-black"
                    style={{ background: style.chip, color: style.text, border: `1px solid ${style.border}` }}
                  >
                    <Ticket className="w-3 h-3" /> Ticket
                  </div>
                  <div className="text-2xl font-black font-mono text-white" style={{ textShadow: `0 0 18px ${style.glow}` }}>
                    {result.ticket_code}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-white/55 mt-1 font-semibold">
                    Tune in Sunday
                  </div>
                </motion.div>
              ) : null
            }
          />
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
            Save my ticket
          </button>
        )}

        {!result && !error && (
          <p className="text-[10px] text-center text-white/40">
            White, blue or orange — your color is your only clue.
          </p>
        )}
      </div>
    </SwipeableStep>
  );
};
