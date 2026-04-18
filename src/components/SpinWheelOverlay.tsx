import { useEffect, useMemo, useState as useStateLocal } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import VaultSpinWheel, { Prize, PrizeSet } from '@/components/vault/VaultSpinWheel';
import { X } from 'lucide-react';

import {
  useGateState,
  markGateCompleted,
  isGateCompleted,
} from '@/components/promotion-gate/useGateState';
import { EmailGateStep } from '@/components/promotion-gate/EmailGateStep';
import { IdentifyStep } from '@/components/promotion-gate/IdentifyStep';
import { VaultWheelStep } from '@/components/promotion-gate/VaultWheelStep';
import { RewardStep } from '@/components/promotion-gate/RewardStep';
import { FinalizeStep } from '@/components/promotion-gate/FinalizeStep';

interface SpinWheelOverlayProps {
  open: boolean;
  onClose: () => void;
}

const SPIN_COST = 5;

/**
 * SpinWheelOverlay
 *
 * For GUESTS: 5-state Cyber-Industrial Promotion Gate
 *   INITIAL → IDENTIFY → ENGAGE → REWARD → FINALIZE
 *   - Mandatory: no skip button
 *   - localStorage persistence (hydrates on refresh)
 *   - Incremental lead capture
 *
 * For AUTHENTICATED users: original confirm-spin → spin → result paid flow
 */
export const SpinWheelOverlay = ({ open, onClose }: SpinWheelOverlayProps) => {
  const { user } = useAuth();
  const { isBarber } = useUserRole();
  const { barberBucks } = useBarberBucks();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isAuthenticated = !!user;
  const detectedRole: 'barber' | 'fan' = isBarber ? 'barber' : 'fan';

  const { state, update, reset, handleLeadUpdate } = useGateState();

  // Once gate is completed, never show again for guests
  useEffect(() => {
    if (open && !isAuthenticated && isGateCompleted()) {
      onClose();
    }
  }, [open, isAuthenticated, onClose]);

  if (!open) return null;

  // ============================================================
  // AUTHENTICATED USER FLOW (paid spin — preserved from original)
  // ============================================================
  if (isAuthenticated) {
    return (
      <AuthenticatedSpinFlow
        role={detectedRole}
        barberBucks={barberBucks}
        userId={user.id}
        onClose={onClose}
        invalidate={() => {
          queryClient.invalidateQueries({ queryKey: ['barber_bucks'] });
          queryClient.invalidateQueries({ queryKey: ['barber_bucks_transactions'] });
          queryClient.invalidateQueries({ queryKey: ['user_prizes'] });
        }}
      />
    );
  }

  // ============================================================
  // GUEST FLOW — 5-state Promotion Gate (NO skip)
  // ============================================================
  const handleEmail = async (email: string) => {
    update({ email, step: 'IDENTIFY' });
    handleLeadUpdate('email', { email });
  };

  const handleSignIn = () => {
    onClose();
    navigate('/auth');
  };

  const handleRole = async (role: 'barber' | 'fan') => {
    update({ role, step: 'ENGAGE' });
    handleLeadUpdate('role', { role });
  };

  const handleSpinResult = async (prize: Prize) => {
    const next = {
      prizeId: prize.id,
      prizeLabel: prize.label,
      prizeBb: prize.bb_value || 0,
      prizeColor: prize.color,
      prizeType: prize.prize_type || 'bb',
      durationMonths: prize.duration_months || 0,
      step: 'REWARD' as const,
    };
    update(next);
    handleLeadUpdate('prize', { prizeId: prize.id, prizeLabel: prize.label });
  };

  const goFinalize = () => update({ step: 'FINALIZE' });

  const handleFinalized = () => {
    handleLeadUpdate('converted', {});
    markGateCompleted();
    update({ step: 'SUCCESS' });
    // Allow user to read "check your email" before closing
    setTimeout(() => {
      reset();
      onClose();
    }, 6000);
  };

  const guestPrizeSet: PrizeSet = state.role === 'barber' ? 'new_barber' : 'new_fan';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center cyber-scanlines"
        style={{
          background:
            'radial-gradient(circle at center, #0a0a0a 0%, #050505 70%, #000 100%)',
        }}
      >
        {/* No close button during gate — mandatory funnel */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 30 }}
          className="w-full max-w-md mx-auto py-8 max-h-[100dvh] overflow-y-auto"
        >
          <AnimatePresence mode="wait">
            {state.step === 'INITIAL' && (
              <div key="INITIAL">
                <EmailGateStep
                  initialEmail={state.email}
                  onContinue={handleEmail}
                  onSignIn={handleSignIn}
                />
              </div>
            )}
            {state.step === 'IDENTIFY' && (
              <div key="IDENTIFY">
                <IdentifyStep email={state.email} onSelect={handleRole} />
              </div>
            )}
            {state.step === 'ENGAGE' && state.role && (
              <div key="ENGAGE">
                <VaultWheelStep prizeSet={guestPrizeSet} onResult={handleSpinResult} />
              </div>
            )}
            {state.step === 'REWARD' && state.prizeLabel && (
              <div key="REWARD">
                <RewardStep
                  prizeLabel={state.prizeLabel}
                  prizeColor={state.prizeColor}
                  onContinue={goFinalize}
                />
              </div>
            )}
            {state.step === 'FINALIZE' && state.role && state.prizeLabel && (
              <div key="FINALIZE">
                <FinalizeStep
                  email={state.email}
                  role={state.role}
                  prizeLabel={state.prizeLabel}
                  prizeData={{
                    prize_id: state.prizeId,
                    prize_label: state.prizeLabel,
                    prize_bb: state.prizeBb,
                    prize_type: state.prizeType,
                    duration_months: state.durationMonths,
                    role: state.role,
                  }}
                  onSubmitted={handleFinalized}
                  onBack={() => update({ step: 'REWARD' })}
                  onSkip={() => {
                    markGateCompleted();
                    reset();
                    onClose();
                  }}
                />
              </div>
            )}
            {state.step === 'SUCCESS' && (
              <motion.div
                key="SUCCESS"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 px-6"
              >
                <p className="text-[10px] uppercase tracking-[0.4em] font-mono mb-3" style={{ color: '#00F0FF' }}>
                  ◢ Vault sealed
                </p>
                <h2 className="text-2xl font-black uppercase tracking-wider text-white">
                  Welcome aboard
                </h2>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step indicator */}
          {state.step !== 'SUCCESS' && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {(['INITIAL', 'IDENTIFY', 'ENGAGE', 'REWARD', 'FINALIZE'] as const).map((s, i) => {
                const order = ['INITIAL', 'IDENTIFY', 'ENGAGE', 'REWARD', 'FINALIZE'];
                const currentIdx = order.indexOf(state.step);
                const active = i <= currentIdx;
                return (
                  <span
                    key={s}
                    className="h-1 transition-all"
                    style={{
                      width: i === currentIdx ? 24 : 12,
                      background: active ? '#00F0FF' : 'rgba(255,255,255,0.15)',
                      boxShadow: active ? '0 0 8px rgba(0,240,255,0.6)' : 'none',
                    }}
                  />
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================
// Authenticated paid-spin sub-flow (preserved behavior)
// ============================================================
const AuthenticatedSpinFlow = ({
  role,
  barberBucks,
  userId,
  onClose,
  invalidate,
}: {
  role: 'barber' | 'fan';
  barberBucks: number;
  userId: string;
  onClose: () => void;
  invalidate: () => void;
}) => {
  type Step = 'confirm' | 'spinning' | 'result';
  const [step, setStep] = useStateLocal<Step>('confirm');
  const [wonPrize, setWonPrize] = useStateLocal<Prize | null>(null);

  const prizeSet: PrizeSet = role === 'barber' ? 'existing_barber' : 'existing_fan';

  const handleConfirm = () => {
    if (barberBucks < SPIN_COST) {
      toast.error(`You need at least ${SPIN_COST} BB to spin!`);
      return;
    }
    setStep('spinning');
  };

  const handleResult = async (prize: Prize) => {
    setWonPrize(prize);
    setStep('result');
    try {
      const { data, error } = await supabase.functions.invoke('spin-wheel', {
        body: {
          role,
          prize_id: prize.id,
          prize_bb: prize.bb_value || 0,
          prize_type: prize.prize_type || 'bb',
          prize_label: prize.label,
          duration_months: prize.duration_months || 0,
        },
      });
      if (error) throw error;
      if (data?.success) {
        invalidate();
        toast.success(`🎉 Prize awarded: ${prize.label}`);
      }
    } catch (err) {
      console.error('Spin-wheel error:', err);
      toast.error('Failed to process spin. Please contact support.');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md mx-4"
        >
          {step === 'confirm' && (
            <div className="flex flex-col items-center space-y-6">
              <h2 className="text-xl font-black text-white">Ready to Spin?</h2>
              <p className="text-gray-400 text-center">
                This spin costs <span className="text-primary font-bold">{SPIN_COST} BB</span>.
                <br />Your balance: <span className="text-white font-bold">{barberBucks} BB</span>
              </p>
              {barberBucks < SPIN_COST && (
                <p className="text-red-400 text-sm font-semibold">
                  Insufficient BB. You need at least {SPIN_COST} BB.
                </p>
              )}
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: barberBucks >= SPIN_COST ? 1.03 : 1 }}
                  whileTap={{ scale: barberBucks >= SPIN_COST ? 0.97 : 1 }}
                  onClick={handleConfirm}
                  disabled={barberBucks < SPIN_COST}
                  className="px-6 py-3 rounded-xl font-black text-black disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #FF5F1F, #FF8C00)',
                    boxShadow: '0 0 20px rgba(255,95,31,0.4)',
                  }}
                >
                  🎰 SPIN FOR {SPIN_COST} BB
                </motion.button>
              </div>
            </div>
          )}

          {step === 'spinning' && (
            <VaultSpinWheel
              prizeSet={prizeSet}
              onResult={handleResult}
              spinLabel={`🎰 SPIN (−${SPIN_COST} BB)`}
            />
          )}

          {step === 'result' && wonPrize && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center space-y-6 text-center"
            >
              <div className="text-5xl">🎉</div>
              <h2 className="text-2xl font-black text-white">YOU WON!</h2>
              <div
                className="px-8 py-4 rounded-2xl text-xl font-black text-black"
                style={{
                  background: `linear-gradient(135deg, ${wonPrize.color}, #FFD700)`,
                  boxShadow: `0 0 30px ${wonPrize.color}80`,
                }}
              >
                {wonPrize.label}
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="px-8 py-3 rounded-xl font-black text-black"
                style={{
                  background: 'linear-gradient(135deg, #FF5F1F, #FF8C00)',
                  boxShadow: '0 0 20px rgba(255,95,31,0.4)',
                }}
              >
                ✅ COLLECT & CLOSE
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
