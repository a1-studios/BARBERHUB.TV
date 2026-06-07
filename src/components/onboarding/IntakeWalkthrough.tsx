import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Coins, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { barberFlow, fanFlow } from './onboardingSteps';

interface Props {
  role: 'barber' | 'fan';
  onComplete: () => void;
  onDismiss?: () => void;
}

/**
 * Step-by-step intake walkthrough shown right after a user picks their role
 * and country. Pays out the +15 BB welcome bonus on the final step.
 */
export const IntakeWalkthrough = ({ role, onComplete, onDismiss }: Props) => {
  const qc = useQueryClient();
  const steps = role === 'barber' ? barberFlow : fanFlow;
  const [index, setIndex] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLast = index === steps.length - 1;
  const step = steps[index];
  const Icon = step.icon;

  const handleNext = async () => {
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    setClaiming(true);
    setError(null);
    try {
      await supabase.rpc('claim_welcome_bonus');
      qc.invalidateQueries({ queryKey: ['profile-incomplete'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['userRoles'] });
      qc.invalidateQueries({ queryKey: ['header-profile'] });
      qc.invalidateQueries({ queryKey: ['barber_bucks'] });
      qc.invalidateQueries({ queryKey: ['barber_bucks_transactions'] });
      setCelebrating(true);
      setTimeout(() => onComplete(), 1600);
    } catch (e: any) {
      setError(e?.message ?? 'Could not claim your bonus. Try again.');
      setClaiming(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all"
            style={{
              background:
                i <= index
                  ? 'linear-gradient(90deg, hsl(20,100%,56%), hsl(35,100%,65%))'
                  : 'hsla(0,0%,100%,0.1)',
            }}
          />
        ))}
      </div>

      <div className="text-center text-[10px] uppercase tracking-[0.2em] text-white/45">
        Step {index + 1} of {steps.length}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col items-center text-center gap-3 py-4"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background:
                'linear-gradient(135deg, hsla(20,100%,56%,0.15), hsla(35,100%,65%,0.05))',
              border: '1px solid hsla(20,100%,56%,0.3)',
              boxShadow: '0 0 30px hsla(20,100%,56%,0.25)',
            }}
          >
            <Icon className={`w-8 h-8 ${step.accent}`} />
          </div>
          <h3 className="text-lg font-black uppercase tracking-tight text-white">
            {step.title}
          </h3>
          <p className="text-sm text-white/65 max-w-xs leading-relaxed">
            {step.description}
          </p>
        </motion.div>
      </AnimatePresence>

      {error && <p className="text-xs text-red-400 text-center">{error}</p>}

      <div className="flex items-center gap-2">
        {index > 0 && !claiming && (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="h-12 px-4 rounded-[14px] text-white/70 hover:text-white text-sm font-bold flex items-center gap-1.5"
            style={{ background: 'hsla(0,0%,100%,0.04)', border: '1px solid hsla(0,0%,100%,0.08)' }}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={claiming}
          className="flex-1 h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60"
          style={{
            background:
              'linear-gradient(135deg, hsl(20,100%,56%) 0%, hsl(28,100%,50%) 50%, hsl(35,100%,65%) 100%)',
            boxShadow: '0 8px 24px hsla(20,100%,56%,0.45)',
          }}
        >
          {claiming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Claiming…
            </>
          ) : isLast ? (
            <>
              <Coins className="w-4 h-4" /> Claim +15 BB
            </>
          ) : (
            <>
              Next <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {onDismiss && role === 'fan' && !claiming && (
        <button
          type="button"
          onClick={onDismiss}
          className="w-full text-[10px] uppercase tracking-wider text-white/40 hover:text-white/70 py-1"
        >
          Finish later (skip bonus)
        </button>
      )}

      {/* Celebration overlay */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="relative">
                <Sparkles className="w-16 h-16 text-amber-300" />
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-16 h-16 text-orange-400/40" />
                </motion.div>
              </div>
              <div className="text-3xl font-black bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
                +15 BB
              </div>
              <div className="text-xs uppercase tracking-[0.3em] text-white/70">
                Welcome bonus claimed
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
