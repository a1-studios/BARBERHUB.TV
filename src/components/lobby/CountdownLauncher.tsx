import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioManager } from '@/utils/audioManager';
import { HapticFeedback } from '@/utils/hapticFeedback';

interface CountdownLauncherProps {
  active: boolean;
  durationSec?: number;
  onComplete: () => void;
}

export const CountdownLauncher = ({ active, durationSec = 5, onComplete }: CountdownLauncherProps) => {
  const [n, setN] = useState(durationSec);

  useEffect(() => {
    if (!active) {
      setN(durationSec);
      return;
    }
    AudioManager.play('combo5');
    HapticFeedback.streak(5);
    setN(durationSec);
    const interval = setInterval(() => {
      setN((v) => {
        const next = v - 1;
        if (next <= 0) {
          clearInterval(interval);
          AudioManager.play('combo10');
          HapticFeedback.streak(10);
          setTimeout(onComplete, 600);
          return 0;
        }
        AudioManager.play('vote');
        HapticFeedback.vote();
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [active, durationSec, onComplete]);

  if (!active) return null;

  return (
    <div className="lobby-modal-layer fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={n}
          initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 3, opacity: 0, rotate: 4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center"
        >
          {n > 0 ? (
            <>
              <div className="text-[12rem] sm:text-[16rem] font-black leading-none bg-gradient-to-b from-cyan-300 via-cyan-400 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(34,211,238,0.6)]">
                {n}
              </div>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.3em] text-cyan-300/80">
                Battle Starting
              </p>
            </>
          ) : (
            <div className="text-7xl sm:text-9xl font-black bg-gradient-to-r from-orange-500 via-cyan-400 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(249,115,22,0.6)]">
              FIGHT!
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
