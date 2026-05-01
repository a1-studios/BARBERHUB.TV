import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SwipeableStep } from './SwipeableStep';
import { useStepDirection } from './LaunchWizard';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';

interface Props {
  email: string;
  onResult: (result: { ticket_code: string; bb_awarded: number }) => void;
  onBack: () => void;
}

const haptic = (ms = 25) => { try { navigator.vibrate?.(ms); } catch { /* */ } };

export const StepRaffleSpin = ({ email, onResult, onBack }: Props) => {
  const direction = useStepDirection();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ ticket_code: string; bb_awarded: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const spin = async () => {
    setSpinning(true);
    setError(null);
    haptic(40);
    const { data, error: fnErr } = await supabase.functions.invoke('claim-raffle-ticket', {
      body: { email, fingerprint: getDeviceFingerprint() },
    });
    const payload = data as { ok?: boolean; ticket_code?: string; bb_awarded?: number; error?: string; message?: string } | null;
    if (fnErr || !payload?.ok || !payload.ticket_code) {
      setError(payload?.message ?? payload?.error ?? fnErr?.message ?? 'Spin failed. Try again.');
      setSpinning(false);
      return;
    }
    // Visual delay so the wheel feels real
    setTimeout(() => {
      setResult({ ticket_code: payload.ticket_code!, bb_awarded: payload.bb_awarded! });
      setSpinning(false);
      haptic(60);
    }, 2200);
  };

  return (
    <SwipeableStep direction={direction} canAdvance={!!result} onSwipeNext={() => result && onResult(result)} onSwipeBack={onBack}>
      <div className="space-y-5">
        <div className="flex items-center justify-between -mt-1 min-h-[20px]">
          <button type="button" onClick={() => { haptic(); onBack(); }} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-orange-400">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Step 4 of 5</span>
        </div>

        <div className="text-center space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            {result ? 'Ticket secured!' : 'Spin the vault'}
          </h2>
          <p className="text-sm text-white/65">
            {result ? 'Your raffle ticket is locked in for Sunday.' : 'One spin per email. 15–50 BB + a unique ticket.'}
          </p>
        </div>

        {/* Wheel visual */}
        <div className="relative mx-auto w-64 h-64 flex items-center justify-center">
          <motion.div
            animate={spinning ? { rotate: 1440 } : result ? { rotate: 720 } : { rotate: 0 }}
            transition={{ duration: spinning ? 2.2 : 0.6, ease: spinning ? 'easeOut' : 'easeOut' }}
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(#FF5F1F 0deg, #FF8C00 60deg, #FFD37A 120deg, #FF5F1F 180deg, #FFB347 240deg, #FF8C00 300deg, #FF5F1F 360deg)',
              boxShadow: '0 0 40px rgba(255,95,31,0.5), inset 0 0 30px rgba(0,0,0,0.4)',
              border: '4px solid rgba(255,255,255,0.15)',
            }}
          />
          <div className="absolute inset-6 rounded-full bg-[#0a0a0f] flex items-center justify-center" style={{ border: '2px solid rgba(255,95,31,0.5)' }}>
            {result ? (
              <div className="text-center px-3">
                <div className="text-[10px] uppercase tracking-wider text-orange-300 font-bold">Ticket</div>
                <div className="text-2xl font-black font-mono text-white drop-shadow-[0_0_12px_rgba(255,140,0,0.6)]">{result.ticket_code}</div>
                <div className="text-sm font-black mt-1" style={{ background: 'linear-gradient(135deg,#FFD37A,#FF8C00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  +{result.bb_awarded} BB
                </div>
              </div>
            ) : (
              <Sparkles className="w-10 h-10 text-orange-400/70" />
            )}
          </div>
          {/* Pointer */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '16px solid #FF5F1F' }} />
        </div>

        {error && <p className="text-xs text-red-400 flex items-center justify-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

        {!result ? (
          <button
            type="button"
            onClick={spin}
            disabled={spinning}
            className="relative w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 overflow-hidden transition-transform active:scale-95 disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 8px 24px rgba(255,95,31,0.45)',
            }}
          >
            {spinning ? <><Loader2 className="w-4 h-4 animate-spin" /> Spinning...</> : '🎰 Spin for your ticket'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onResult(result)}
            className="relative w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 overflow-hidden transition-transform active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 8px 24px rgba(255,95,31,0.45)',
            }}
          >
            Save my ticket
          </button>
        )}
      </div>
    </SwipeableStep>
  );
};
