import { motion } from 'framer-motion';
import { Swords, Coins, Timer } from 'lucide-react';

const CHALLENGES = [
  { from: 'Kairo',  flag: '🇧🇷', stake: 500, ttl: '2h 14m', tilt: -6 },
  { from: 'Soren',  flag: '🇸🇪', stake: 250, ttl: '5h 02m', tilt: 0   },
  { from: 'Rafa',   flag: '🇪🇸', stake: 100, ttl: '38m',     tilt: 6  },
];

export const ChallengesCard = () => {
  return (
    <div className="relative h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/40">
          <Swords className="h-3 w-3" /> Open Challenges
        </span>
        <span className="text-[10px] text-white/60">3 waiting</span>
      </div>

      <div className="relative flex-1 rounded-xl overflow-hidden border border-white/10 bg-gradient-to-b from-orange-500/[0.05] via-transparent to-transparent p-3">
        <div className="relative h-full flex items-center justify-center">
          {CHALLENGES.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: c.tilt }}
              transition={{ delay: 0.15 + i * 0.1, type: 'spring', damping: 14 }}
              style={{ zIndex: i === 1 ? 3 : 2 - Math.abs(i - 1) }}
              className={`absolute w-44 rounded-lg bg-[#13131c] border-2 ${
                i === 1 ? 'border-orange-500 shadow-[0_0_24px_rgba(249,115,22,0.4)]' : 'border-white/15'
              } p-3`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center text-sm">{c.flag}</div>
                  <div className="text-[11px] font-semibold text-white">{c.from}</div>
                </div>
                <div className="inline-flex items-center gap-0.5 text-[9px] text-white/50">
                  <Timer className="h-2.5 w-2.5" /> {c.ttl}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-white/40">Stake</div>
                  <div className="inline-flex items-center gap-1 text-orange-400 font-black text-base">
                    <Coins className="h-3.5 w-3.5" /> {c.stake}
                  </div>
                </div>
                {i === 1 && (
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                    className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-orange-500 text-white shadow-[0_0_16px_rgba(249,115,22,0.6)]"
                  >
                    Throw Down
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-white/70 font-medium">Stake · Battle · Win BB</span>
        <span className="text-orange-300">Accept inside →</span>
      </div>
    </div>
  );
};
