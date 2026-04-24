import { ArrowLeft } from 'lucide-react';
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

const haptic = () => {
  try { navigator.vibrate?.(10); } catch { /* ignore */ }
};

export const StepSpin = ({ role, email, onResult, onBack, onSkip }: StepSpinProps) => {
  const direction = useStepDirection();

  const handleResult = (prize: Prize) => {
    try {
      localStorage.setItem(
        'pending_spin_prize',
        JSON.stringify({
          email,
          role,
          prize_id: prize.id,
          prize_label: prize.label,
          prize_bb: prize.bb_value ?? 0,
          prize_type: prize.prize_type ?? 'bb',
          duration_months: prize.duration_months ?? 0,
          timestamp: Date.now(),
        })
      );
    } catch {
      /* ignore */
    }
    setTimeout(() => onResult(prize), 800);
  };

  return (
    <SwipeableStep direction={direction} canAdvance={false} onSwipeBack={onBack}>
      <div className="space-y-5">
        <div className="flex items-center justify-between -mt-1">
          <button
            type="button"
            onClick={() => { haptic(); onBack(); }}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-orange-400 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-white/60 hover:text-orange-400 transition-colors"
          >
            Skip
          </button>
        </div>

        <div className="text-center space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            One free spin
          </h2>
          <p className="text-sm text-white/65">
            Welcome reward. Locked to <span className="text-orange-400 font-semibold">{email}</span>.
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
      </div>
    </SwipeableStep>
  );
};
