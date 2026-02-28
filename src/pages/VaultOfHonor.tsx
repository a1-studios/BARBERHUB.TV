import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';
import { useAuth } from '@/hooks/useAuth';
import VaultEntry from '@/components/vault/VaultEntry';
import VaultViralGate from '@/components/vault/VaultViralGate';
import VaultSpinWheel from '@/components/vault/VaultSpinWheel';
import VaultVictory from '@/components/vault/VaultVictory';
import type { Prize } from '@/components/vault/VaultSpinWheel';
import { X } from 'lucide-react';

type VaultStep = 'loading' | 'already-played' | 'entry' | 'viral-gate' | 'spin' | 'victory';

const VaultOfHonor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<VaultStep>('loading');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'barber' | 'fan'>('fan');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);

  // Redirect logged-in users away
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Check fingerprint on mount
  useEffect(() => {
    const checkExisting = async () => {
      const fp = getDeviceFingerprint();
      const stored = localStorage.getItem('vault_fingerprint');

      if (stored) {
        // Check DB for this fingerprint
        const { data } = await supabase
          .from('marketing_leads')
          .select('*')
          .eq('device_fingerprint', stored)
          .maybeSingle();

        if (data) {
          if (data.spins_used >= data.max_spins) {
            setStep('already-played');
            setEmail(data.email);
            setRole(data.role as 'barber' | 'fan');
            return;
          }
          // Resume: skip entry, go to viral gate or spin
          setEmail(data.email);
          setRole(data.role as 'barber' | 'fan');
          setLeadId(data.id);
          setStep(data.shared ? 'spin' : 'viral-gate');
          return;
        }
      }
      setStep('entry');
    };
    checkExisting();
  }, []);

  const handleEntry = async (enteredEmail: string, selectedRole: 'barber' | 'fan') => {
    const fp = getDeviceFingerprint();
    localStorage.setItem('vault_fingerprint', fp);

    // Upsert lead
    const { data, error } = await supabase
      .from('marketing_leads')
      .upsert(
        { email: enteredEmail, role: selectedRole, device_fingerprint: fp },
        { onConflict: 'email' }
      )
      .select('id')
      .single();

    if (data) {
      setLeadId(data.id);
    }
    setEmail(enteredEmail);
    setRole(selectedRole);
    setStep('viral-gate');
  };

  const handleShareComplete = async (shared: boolean) => {
    if (leadId) {
      await supabase
        .from('marketing_leads')
        .update({ shared })
        .eq('id', leadId);
    }
    setStep('spin');
  };

  const handleSpinResult = async (prize: Prize) => {
    setWonPrize(prize);
    if (leadId) {
      // Use raw RPC-style update to increment spins_used
      await supabase
        .from('marketing_leads')
        .update({
          prize_id: prize.id,
          prize_label: prize.label,
          spins_used: 1, // first spin
        })
        .eq('id', leadId);
    }
    // Small delay for confetti to settle
    setTimeout(() => setStep('victory'), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0D0D0D 0%, #1a1020 50%, #0D0D0D 100%)',
        overscrollBehavior: 'none',
      }}
    >
      {/* Close button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-gray-800/60 text-gray-400 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <AnimatePresence mode="wait">
          {step === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="w-8 h-8 border-2 border-[#FF5F1F] border-t-transparent rounded-full animate-spin" />
            </motion.div>
          )}

          {step === 'already-played' && (
            <motion.div
              key="played"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center px-6 space-y-6 text-center"
            >
              <div className="text-5xl">🎯</div>
              <h2 className="text-xl font-black text-white">YOU'VE ALREADY PLAYED!</h2>
              <p className="text-sm text-gray-400 max-w-xs">
                You've used all your spins. Sign up now to claim any prizes you won!
              </p>
              <button
                onClick={() => {
                  const params = new URLSearchParams({ tab: 'signup', email, role });
                  navigate(`/?${params.toString()}`);
                }}
                className="w-full max-w-xs py-4 rounded-xl font-black text-lg text-black tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, #FF5F1F, #FF8C00)',
                  boxShadow: '0 0 30px rgba(255,95,31,0.5)',
                }}
              >
                SIGN UP NOW
              </button>
            </motion.div>
          )}

          {step === 'entry' && (
            <motion.div
              key="entry"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-md h-full"
            >
              <VaultEntry onComplete={handleEntry} />
            </motion.div>
          )}

          {step === 'viral-gate' && (
            <motion.div
              key="gate"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-md h-full"
            >
              <VaultViralGate onComplete={handleShareComplete} />
            </motion.div>
          )}

          {step === 'spin' && (
            <motion.div
              key="spin"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-full max-w-md h-full"
            >
              <VaultSpinWheel role={role} onResult={handleSpinResult} />
            </motion.div>
          )}

          {step === 'victory' && wonPrize && (
            <motion.div
              key="victory"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md h-full"
            >
              <VaultVictory prize={wonPrize} email={email} role={role} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VaultOfHonor;
