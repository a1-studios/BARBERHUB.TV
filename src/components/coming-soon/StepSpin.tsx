import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import VaultSpinWheel, { type Prize } from '@/components/vault/VaultSpinWheel';
import type { LaunchRole } from './LaunchWizard';

interface StepSpinProps {
  role: LaunchRole;
  email: string;
  onResult: (prize: Prize) => void;
  onBack: () => void;
  onSkip: () => void;
}

export const StepSpin = ({ role, email, onResult, onBack, onSkip }: StepSpinProps) => {
  const handleResult = (prize: Prize) => {
    // Persist prize keyed to email so it can be claimed only by this email at signup
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between -mt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-white/60 hover:text-orange-400 transition-colors"
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
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
          One free spin
        </h2>
        <p className="text-sm text-white/60">
          Welcome reward. Locked to <span className="text-orange-400 font-semibold">{email}</span>.
        </p>
      </div>

      <VaultSpinWheel
        prizeSet={role === 'barber' ? 'new_barber' : 'new_fan'}
        onResult={handleResult}
        spinLabel="🎰 SPIN FOR YOUR PRIZE"
      />
    </motion.div>
  );
};
