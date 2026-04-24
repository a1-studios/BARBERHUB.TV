import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { AnimatedPrizeCounter } from '@/components/factions/AnimatedPrizeCounter';

interface PrizePoolBeaconProps {
  amountBB: number;
  pulseTrigger: number;
}

export const PrizePoolBeacon = ({ amountBB, pulseTrigger }: PrizePoolBeaconProps) => {
  const [shockwaves, setShockwaves] = useState<number[]>([]);
  const lastTrigger = useRef(pulseTrigger);

  useEffect(() => {
    if (pulseTrigger !== lastTrigger.current) {
      lastTrigger.current = pulseTrigger;
      const id = Date.now();
      setShockwaves((s) => [...s, id]);
      setTimeout(() => setShockwaves((s) => s.filter((x) => x !== id)), 800);
    }
  }, [pulseTrigger]);

  // 1 BB = $0.20 → cents
  const cents = amountBB * 20;

  return (
    <div className="lobby-ui-decorative pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
      <motion.div
        key={pulseTrigger}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative flex flex-col items-center"
      >
        <AnimatePresence>
          {shockwaves.map((id) => (
            <motion.div
              key={id}
              initial={{ scale: 0.6, opacity: 0.8 }}
              animate={{ scale: 2.4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="absolute inset-0 -m-8 rounded-full border-2 border-cyan-400"
            />
          ))}
        </AnimatePresence>

        <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-[0_0_28px_rgba(249,115,22,0.6)] ring-2 ring-orange-300/40">
          <Trophy className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>

        <div className="rounded-2xl border border-orange-400/30 bg-black/70 px-5 py-2 backdrop-blur-md ring-1 ring-cyan-400/20 shadow-2xl">
          <p className="mb-0.5 text-center text-[10px] font-bold uppercase tracking-widest text-cyan-300/80">
            Prize Pool
          </p>
          <AnimatedPrizeCounter targetValue={cents} duration={1.2} showGrowth={false} />
        </div>
      </motion.div>
    </div>
  );
};
