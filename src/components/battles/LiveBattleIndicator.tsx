import { motion } from 'framer-motion';
import { Radio } from 'lucide-react';

interface LiveBattleIndicatorProps {
  className?: string;
}

export const LiveBattleIndicator = ({ className = '' }: LiveBattleIndicatorProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 ${className}`}
    >
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [1, 0.5, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
      >
        <div className="w-2 h-2 bg-red-500 rounded-full" />
        <motion.div
          animate={{
            scale: [1, 1.8, 1],
            opacity: [0.6, 0, 0.6]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-red-500 rounded-full"
        />
      </motion.div>
      <div className="flex items-center gap-1.5">
        <Radio className="w-4 h-4 text-red-500" />
        <span className="text-sm font-bold text-red-500 uppercase tracking-wide">
          Live Battle
        </span>
      </div>
    </motion.div>
  );
};
