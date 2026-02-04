import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, CheckCircle2, Trophy, Flag } from 'lucide-react';

interface FreshAnimationProps {
  show: boolean;
  countryCode: string;
  onComplete: () => void;
  isFinalCelebration?: boolean;
}

const getCountryFlag = (countryCode: string) => {
  return String.fromCodePoint(
    ...countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0))
  );
};

export const FreshAnimation = ({ show, countryCode, onComplete, isFinalCelebration = false }: FreshAnimationProps) => {
  useEffect(() => {
    if (show) {
      // Auto-complete after animation - longer for final celebration
      const timer = setTimeout(onComplete, isFinalCelebration ? 3500 : 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete, isFinalCelebration]);

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

          {/* Main text - different for final vs intermediate */}
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
            {isFinalCelebration ? (
              <>
                <Trophy className="w-10 h-10 text-primary animate-pulse" />
                <span className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary via-orange-400 to-cyan-400 bg-clip-text text-transparent">
                  FLAG CLAIMED!
                </span>
                <Trophy className="w-10 h-10 text-primary animate-pulse" />
              </>
            ) : (
              <>
                <Scissors className="w-10 h-10 text-primary animate-pulse" />
                <span className="text-5xl font-black bg-gradient-to-r from-primary via-orange-400 to-cyan-400 bg-clip-text text-transparent">
                  FRESH!
                </span>
                <Scissors className="w-10 h-10 text-primary animate-pulse" style={{ transform: 'scaleX(-1)' }} />
              </>
            )}
          </motion.div>

          {/* Verified badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-2 text-cyan-400"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">
              {isFinalCelebration ? 'Account Created Successfully!' : 'Nationality Verified'}
            </span>
          </motion.div>

          {/* Continue message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-muted-foreground text-sm mt-8"
          >
            {isFinalCelebration 
              ? 'Welcome to the World Cup of Barbering! 🏆' 
              : 'Proceeding to sign up...'}
          </motion.p>

          {/* Extra celebration elements for final */}
          {isFinalCelebration && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5, type: 'spring' }}
              className="flex items-center gap-2 mt-4"
            >
              <Flag className="w-4 h-4 text-primary" />
              <span className="text-xs text-primary font-medium">Check your email to confirm your account</span>
              <Flag className="w-4 h-4 text-primary" />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
