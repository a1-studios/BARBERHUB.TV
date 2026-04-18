import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ArrowRight } from 'lucide-react';

interface RewardStepProps {
  prizeLabel: string;
  prizeColor?: string | null;
  onContinue: () => void;
}

export const RewardStep = ({ prizeLabel, prizeColor, onContinue }: RewardStepProps) => {
  // Auto-advance after 4s if user doesn't click
  useEffect(() => {
    const t = setTimeout(onContinue, 4000);
    return () => clearTimeout(t);
  }, [onContinue]);

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 24 }}
      className="w-full max-w-md mx-auto px-6 space-y-7 text-center"
    >
      <motion.div
        initial={{ rotate: -180, scale: 0 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
        className="inline-flex items-center justify-center w-20 h-20 rounded-full mx-auto"
        style={{
          background: 'radial-gradient(circle, rgba(255,95,0,0.4), transparent 70%)',
          boxShadow: '0 0 40px rgba(255,95,0,0.6)',
        }}
      >
        <Trophy className="w-10 h-10" style={{ color: '#FF5F00' }} />
      </motion.div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.4em] font-mono" style={{ color: '#FF8C00' }}>
          ◢ Reward Unlocked
        </p>
        <h2
          className="text-3xl md:text-4xl font-black tracking-tight"
          style={{ color: '#fff', textShadow: '0 0 16px rgba(255,95,0,0.6)' }}
        >
          You Won!
        </h2>
      </div>

      {/* Holographic prize box */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative px-6 py-6 border-2 overflow-hidden"
        style={{
          borderColor: '#FF5F00',
          background:
            'linear-gradient(135deg, rgba(255,95,0,0.18), rgba(255,140,0,0.08))',
          boxShadow:
            '0 0 40px rgba(255,95,0,0.5), inset 0 0 30px rgba(255,95,0,0.15)',
          borderRadius: '4px',
        }}
      >
        {/* Holographic shine sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
          }}
          animate={{ x: ['-150%', '150%'] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
        />
        <p className="relative text-2xl md:text-3xl font-black tracking-wide" style={{ color: '#fff' }}>
          {prizeLabel}
        </p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onContinue}
        className="w-full py-4 font-black tracking-[0.25em] uppercase text-sm flex items-center justify-center gap-3"
        style={{
          background: 'linear-gradient(135deg, #FF5F00, #FF8C00)',
          color: '#000',
          boxShadow: '0 0 30px rgba(255,95,0,0.5)',
          borderRadius: '2px',
          border: '1px solid rgba(255,140,0,0.6)',
        }}
      >
        Claim Prize
        <ArrowRight className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
};
