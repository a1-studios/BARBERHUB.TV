import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoteComboIndicatorProps {
  comboCount: number;
  bonusEarned?: number;
  className?: string;
}

export const VoteComboIndicator = ({ comboCount, className }: VoteComboIndicatorProps) => {
  if (comboCount < 2) return null;

  const getComboColor = (count: number) => {
    if (count >= 20) return 'text-orange-500';
    if (count >= 10) return 'text-purple-500';
    if (count >= 5) return 'text-blue-500';
    return 'text-green-500';
  };

  const getComboGlow = (count: number) => {
    if (count >= 20) return 'shadow-orange-500/50';
    if (count >= 10) return 'shadow-purple-500/50';
    if (count >= 5) return 'shadow-blue-500/50';
    return 'shadow-green-500/50';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className={cn("fixed top-20 left-1/2 -translate-x-1/2 z-50", className)}
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
          className={cn(
            "bg-background/90 backdrop-blur-lg rounded-full px-6 py-3 shadow-2xl border-2",
            getComboColor(comboCount),
            getComboGlow(comboCount)
          )}
        >
          <div className="flex items-center gap-3">
            <Zap className={cn("h-6 w-6", getComboColor(comboCount))} fill="currentColor" />
            <div className="flex items-center gap-2">
              <span className={cn("text-2xl font-bold", getComboColor(comboCount))}>
                {comboCount}x
              </span>
              <span className="text-sm font-semibold text-foreground">
                COMBO!
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
