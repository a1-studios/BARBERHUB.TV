import { useState } from 'react';
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import VaultSpinWheel, { type Prize } from '@/components/vault/VaultSpinWheel';
import { SwipeableStep } from './SwipeableStep';
import { useStepDirection } from './LaunchWizard';
import type { LaunchRole } from './LaunchWizard';

interface StepSpinProps {
  role: LaunchRole;
  email: string;
  onResult: (prize: Prize) => void;
  onBack: () => void;
  onSkip: () => void;
}

const haptic = (ms = 10) => {
  try { navigator.vibrate?.(ms); } catch { /* ignore */ }
};

export const StepSpin = ({ role, email, onResult, onBack, onSkip }: StepSpinProps) => {
  const direction = useStepDirection();
  const [revealedPrize, setRevealedPrize] = useState<Prize | null>(null);

  const handleResult = (prize: Prize) => {
    // Note: pending_prize key is written by LaunchWizard once intake completes,
    // so the prize is only escrowed AFTER the user commits identity info.
    haptic(35);
    setRevealedPrize(prize);
  };

  const handleClaim = () => {
    if (!revealedPrize) return;
    haptic(15);
    onResult(revealedPrize);
  };

  return (
    <SwipeableStep direction={direction} canAdvance={false} onSwipeBack={onBack}>
      <div className="space-y-5">
        <div className="flex items-center justify-between -mt-1 min-h-[20px]">
          <button
            type="button"
            onClick={() => { haptic(); onBack(); }}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-orange-400 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {/* Once a prize is revealed, the user must continue to claim — no escape hatch. */}
          {!revealedPrize && (
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-white/60 hover:text-orange-400 transition-colors"
            >
              Skip
            </button>
          )}
        </div>

        <div className="text-center space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            {revealedPrize ? 'You won!' : 'One free spin'}
          </h2>
          <p className="text-sm text-white/65">
            {revealedPrize ? (
              <>Reserved for <span className="text-orange-400 font-semibold">{email}</span></>
            ) : (
              <>Welcome reward. Locked to <span className="text-orange-400 font-semibold">{email}</span>.</>
            )}
          </p>
        </div>

        {/* Glass frame around the wheel */}
        <div
          className="relative rounded-[18px] p-3 overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1.5px solid rgba(255,95,31,0.4)',
            boxShadow: '0 0 30px rgba(255,95,31,0.25), inset 0 0 30px rgba(255,140,0,0.06)',
          }}
        >
          {/* Charging pulse — slow energy gather around the ring */}
          {!revealedPrize && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[18px] animate-pulse"
              style={{
                boxShadow: 'inset 0 0 40px rgba(255,95,31,0.35), 0 0 24px rgba(255,140,0,0.4)',
                animationDuration: '1.8s',
              }}
            />
          )}
          {/* Subtle scanlines */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,140,0,0.6) 2px, rgba(255,140,0,0.6) 3px)',
            }}
          />
          <VaultSpinWheel
            prizeSet={role === 'barber' ? 'new_barber' : 'new_fan'}
            onResult={handleResult}
            spinLabel="🎰 SPIN FOR YOUR PRIZE"
          />
        </div>

        {revealedPrize && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-3"
          >
            <div
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-full text-[11px] font-semibold mx-auto w-fit"
              style={{
                background: 'rgba(255,140,0,0.1)',
                border: '1px solid rgba(255,140,0,0.4)',
                color: 'rgba(255,211,122,0.95)',
              }}
            >
              <Lock className="w-3 h-3" />
              Locked until you finish your profile
            </div>

            <button
              type="button"
              onClick={handleClaim}
              className="relative w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 overflow-hidden transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 8px 24px rgba(255,95,31,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
              }}
            >
              Continue to claim <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    </SwipeableStep>
  );
};
