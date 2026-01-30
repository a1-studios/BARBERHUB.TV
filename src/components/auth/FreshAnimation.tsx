import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FreshAnimationProps {
  show: boolean;
  countryCode: string;
  onComplete: () => void;
}

const getCountryFlag = (countryCode: string) => {
  return String.fromCodePoint(
    ...countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0))
  );
};

export const FreshAnimation = ({ show, countryCode, onComplete }: FreshAnimationProps) => {
  useEffect(() => {
    if (show) {
      // Trigger confetti celebration
      const colors = ['#f97316', '#00D9FF', '#22c55e', '#fbbf24'];
      
      // Center burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.5 },
        colors: colors,
        disableForReducedMotion: true,
      });

      // Side cannons
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: colors,
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: colors,
        });
      }, 200);

      // Auto-complete after animation
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
        >
          {/* Flag with glow */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="text-7xl mb-6 drop-shadow-[0_0_30px_hsl(var(--primary)/0.5)]"
          >
            {getCountryFlag(countryCode)}
          </motion.div>

          {/* FRESH! text */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.3, 1], 
              opacity: 1,
            }}
            transition={{ 
              duration: 0.5, 
              delay: 0.3,
              times: [0, 0.6, 1],
            }}
            className="flex items-center gap-3 mb-4"
          >
            <Scissors className="w-10 h-10 text-primary animate-pulse" />
            <span className="text-5xl font-black bg-gradient-to-r from-primary via-orange-400 to-cyan-400 bg-clip-text text-transparent">
              FRESH!
            </span>
            <Scissors className="w-10 h-10 text-primary animate-pulse" style={{ transform: 'scaleX(-1)' }} />
          </motion.div>

          {/* Verified badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-2 text-cyan-400"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Nationality Verified</span>
          </motion.div>

          {/* Continue message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-muted-foreground text-sm mt-8"
          >
            Proceeding to sign up...
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
