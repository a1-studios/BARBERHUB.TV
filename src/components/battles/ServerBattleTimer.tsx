import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ServerBattleTimerProps {
  endsAt: string; // ISO timestamp
  onTimeUp: () => void;
}

/**
 * ServerBattleTimer — Server-authoritative countdown.
 * Derives remaining time from `endsAt` vs Date.now() on every tick,
 * preventing local clock drift from accumulating.
 */
export const ServerBattleTimer = ({ endsAt, onTimeUp }: ServerBattleTimerProps) => {
  const calcRemaining = useCallback(() => {
    const ms = new Date(endsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 1000));
  }, [endsAt]);

  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    if (remaining <= 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      const r = calcRemaining();
      setRemaining(r);
      if (r <= 0) {
        clearInterval(interval);
        onTimeUp();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calcRemaining, onTimeUp, remaining]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isUrgent = remaining <= 30;

  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <AnimatePresence mode="popLayout">
        <motion.span
          key={remaining}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 8, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={`font-mono text-lg font-bold tabular-nums ${
            isUrgent ? 'text-red-400' : 'text-white'
          }`}
        >
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};
