import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Scissors, Users } from 'lucide-react';
import VaultSpinWheel, { Prize, PrizeSet } from '@/components/vault/VaultSpinWheel';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type Step = 'role-select' | 'confirm-spin' | 'spinning' | 'result';

interface SpinWheelOverlayProps {
  open: boolean;
  onClose: () => void;
}

const SPIN_COST = 5;

export const SpinWheelOverlay = ({ open, onClose }: SpinWheelOverlayProps) => {
  const { user } = useAuth();
  const { isBarber } = useUserRole();
  const { barberBucks } = useBarberBucks();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isAuthenticated = !!user;
  const detectedRole: 'barber' | 'fan' = isBarber ? 'barber' : 'fan';

  const [step, setStep] = useState<Step>('role-select');
  const [selectedRole, setSelectedRole] = useState<'barber' | 'fan' | null>(null);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [spinning, setSpinning] = useState(false);

  // When auth loads, skip role-select for authenticated users
  useEffect(() => {
    if (isAuthenticated && step === 'role-select') {
      setSelectedRole(detectedRole);
      setStep('confirm-spin');
    }
  }, [isAuthenticated, detectedRole]);

  const handleRoleSelect = (role: 'barber' | 'fan') => {
    setSelectedRole(role);
    if (isAuthenticated) {
      setStep('confirm-spin');
    } else {
      setStep('spinning');
    }
  };

  const handleConfirmSpin = async () => {
    if (!user || barberBucks < SPIN_COST) {
      toast.error(`You need at least ${SPIN_COST} BB to spin!`);
      return;
    }
    setSpinning(true);
    setStep('spinning');
  };

  const handleResult = async (prize: Prize) => {
    setWonPrize(prize);
    setStep('result');

    if (isAuthenticated && user) {
      try {
        const { data, error } = await supabase.functions.invoke('spin-wheel', {
          body: {
            role: selectedRole,
            prize_id: prize.id,
            prize_bb: prize.bb_value || 0,
            prize_type: prize.prize_type || 'bb',
            prize_label: prize.label,
            duration_months: prize.duration_months || 0,
          },
        });
        if (error) throw error;
        if (data?.success) {
          queryClient.invalidateQueries({ queryKey: ['barber_bucks'] });
          queryClient.invalidateQueries({ queryKey: ['barber_bucks_transactions'] });
          queryClient.invalidateQueries({ queryKey: ['user_prizes'] });
          toast.success(`🎉 Prize awarded: ${prize.label}`);
        }
      } catch (err) {
        console.error('Spin-wheel error:', err);
        toast.error('Failed to process spin. Please contact support.');
      }
    } else {
      // Guest user — save prize to localStorage for auto-claim after signup
      try {
        localStorage.setItem('pending_spin_prize', JSON.stringify({
          prize_id: prize.id,
          prize_bb: prize.bb_value || 0,
          prize_type: prize.prize_type || 'bb',
          prize_label: prize.label,
          role: selectedRole,
          duration_months: prize.duration_months || 0,
          timestamp: Date.now(),
        }));
      } catch {
        // localStorage unavailable, silently fail
      }
    }
    setSpinning(false);
  };

  const handleClose = () => {
    setStep(isAuthenticated ? 'confirm-spin' : 'role-select');
    setSelectedRole(isAuthenticated ? detectedRole : null);
    setWonPrize(null);
    setSpinning(false);
    onClose();
  };

  const handleCreateAccount = () => {
    handleClose();
    navigate('/auth?tab=signup');
  };

  const getPrizeSet = (): PrizeSet => {
    if (!isAuthenticated) {
      return selectedRole === 'barber' ? 'new_barber' : 'new_fan';
    }
    return selectedRole === 'barber' ? 'existing_barber' : 'existing_fan';
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <button
          onClick={handleClose}
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
          {step === 'role-select' && (
            <div className="flex flex-col items-center space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-white tracking-wide">🎰 SPIN TO WIN</h2>
                <p className="text-sm text-gray-400">
                  {isAuthenticated
                    ? `Costs ${SPIN_COST} BB per spin — win big prizes!`
                    : 'Free spin! Win prizes to get started.'}
                </p>
              </div>

              <p className="text-white font-semibold text-center">I am a...</p>

              <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleRoleSelect('barber')}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-primary/40 bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <Scissors className="w-10 h-10 text-primary" />
                  <span className="text-white font-bold text-lg">Barber</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleRoleSelect('fan')}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-accent/40 bg-accent/10 hover:bg-accent/20 transition-colors"
                >
                  <Users className="w-10 h-10 text-accent" />
                  <span className="text-white font-bold text-lg">Fan</span>
                </motion.button>
              </div>

              {isAuthenticated && (
                <p className="text-xs text-gray-500">
                  Your balance: <span className="text-primary font-bold">{barberBucks} BB</span>
                </p>
              )}

              <button
                onClick={handleClose}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Skip for now
              </button>
            </div>
          )}

          {step === 'confirm-spin' && isAuthenticated && (
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
                  onClick={() => setStep('role-select')}
                  className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold"
                >
                  Back
                </motion.button>
                <motion.button
                  whileHover={{ scale: barberBucks >= SPIN_COST ? 1.03 : 1 }}
                  whileTap={{ scale: barberBucks >= SPIN_COST ? 0.97 : 1 }}
                  onClick={handleConfirmSpin}
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
              prizeSet={getPrizeSet()}
              onResult={handleResult}
              spinLabel={isAuthenticated ? `🎰 SPIN (−${SPIN_COST} BB)` : '🎰 FREE SPIN'}
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

              {isAuthenticated ? (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleClose}
                  className="px-8 py-3 rounded-xl font-black text-black"
                  style={{
                    background: 'linear-gradient(135deg, #FF5F1F, #FF8C00)',
                    boxShadow: '0 0 20px rgba(255,95,31,0.4)',
                  }}
                >
                  ✅ COLLECT & CLOSE
                </motion.button>
              ) : (
                <div className="space-y-3 w-full max-w-xs">
                  <p className="text-sm text-gray-400">
                    Create an account to claim your <span className="text-primary font-bold">{wonPrize.label}</span>!
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCreateAccount}
                    className="w-full px-8 py-4 rounded-xl font-black text-black text-lg"
                    style={{
                      background: 'linear-gradient(135deg, #FF5F1F, #FF8C00)',
                      boxShadow: '0 0 30px rgba(255,95,31,0.5)',
                    }}
                  >
                    🚀 CREATE ACCOUNT
                  </motion.button>
                  <button
                    onClick={handleClose}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Maybe later
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
