import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ArenaGateModal, ArenaGateResult } from '@/components/auth/ArenaGateModal';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { Button } from '@/components/ui/button';
import type { Prize } from './VaultSpinWheel';

interface VaultVictoryProps {
  prize: Prize;
  email: string;
  role: 'barber' | 'fan';
}

const VaultVictory = ({ prize, email, role }: VaultVictoryProps) => {
  const navigate = useNavigate();
  const [showArenaGate, setShowArenaGate] = useState(false);
  const [showFanAuth, setShowFanAuth] = useState(false);

  const handleClaim = () => {
    if (role === 'barber') {
      setShowArenaGate(true);
    } else {
      setShowFanAuth(true);
    }
  };

  const handleArenaGateComplete = (result: ArenaGateResult) => {
    setShowArenaGate(false);
    navigate('/profile', { replace: true });
  };

  const handleFanAuthClose = (open: boolean) => {
    setShowFanAuth(open);
    // If dialog closed after successful auth, redirect
    if (!open) {
      // Auth state change will handle redirect
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 space-y-8">
      {/* Trophy Animation */}
      <motion.div
        initial={{ scale: 0, rotateZ: -20 }}
        animate={{ scale: 1, rotateZ: 0 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="relative"
      >
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle, ${prize.color}40, transparent)`,
            boxShadow: `0 0 60px ${prize.color}60`,
          }}
        >
          <Trophy className="w-14 h-14" style={{ color: prize.color }} />
        </div>
        {/* Sparkle ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: prize.color }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl font-black text-white">YOU WON!</h2>
        <div
          className="text-xl font-black px-6 py-2 rounded-lg inline-block"
          style={{
            color: prize.color,
            background: `${prize.color}15`,
            border: `1px solid ${prize.color}40`,
            boxShadow: `0 0 20px ${prize.color}30`,
          }}
        >
          {prize.label}
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-sm text-gray-400 text-center max-w-xs"
      >
        Complete your free sign-up to claim this reward. Your prize is locked and waiting for you.
      </motion.p>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleClaim}
        className="w-full max-w-xs py-4 rounded-xl font-black text-lg text-black tracking-wider flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #FF5F1F, #FF8C00)',
          boxShadow: '0 0 30px rgba(255,95,31,0.5)',
        }}
      >
        CLAIM YOUR BOUNTY <ArrowRight className="w-5 h-5" />
      </motion.button>

      <p className="text-xs text-gray-600 text-center">
        Prize is escrowed until profile completion
      </p>

      {/* Arena Gate for Barbers */}
      <ArenaGateModal
        isOpen={showArenaGate}
        onClose={() => setShowArenaGate(false)}
        onComplete={handleArenaGateComplete}
        prefilledEmail={email}
      />

      {/* Auth Dialog for Fans */}
      <AuthDialog
        initialRole="fan"
        autoOpen={showFanAuth}
        onOpenChange={handleFanAuthClose}
        prefilledEmail={email}
      >
        <span className="hidden" />
      </AuthDialog>
    </div>
  );
};

export default VaultVictory;
