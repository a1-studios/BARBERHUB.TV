import { motion } from 'framer-motion';
import { Radio, Eye, Flame } from 'lucide-react';
import { useCountUp } from './useCountUp';

interface Props {
  liveBattles: number;
  viewers: number;
}

export const LiveNowCard = ({ liveBattles, viewers }: Props) => {
  const battles = useCountUp(Math.max(liveBattles, 3));
  const watching = useCountUp(Math.max(viewers, 1247));

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Pillar chip */}
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/40">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          Live Now
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-white/60">
          <Eye className="h-3 w-3" /> {watching.toLocaleString()}
        </span>
      </div>

      {/* Split-screen PK frame */}
      <div className="relative flex-1 rounded-xl overflow-hidden border border-white/10 grid grid-cols-2 gap-px bg-white/10">
        {[
          { name: 'Marco', flag: '🇮🇹', tint: 'from-orange-600/60 to-orange-900/80' },
          { name: 'Diego', flag: '🇲🇽', tint: 'from-cyan-600/60 to-blue-900/80' },
        ].map((b, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className={`relative bg-gradient-to-br ${b.tint} flex flex-col items-center justify-end pb-3`}
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
              className="absolute inset-0 flex items-center justify-center text-5xl"
            >
              ✂️
            </motion.div>
            <div className="relative z-10 text-center">
              <div className="text-xl">{b.flag}</div>
              <div className="text-xs font-bold text-white drop-shadow">{b.name}</div>
            </div>
            {i === 0 && (
              <div className="absolute top-2 left-2 inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider text-white bg-rose-600 px-1.5 py-0.5 rounded-sm">
                <span className="h-1 w-1 rounded-full bg-white animate-pulse" /> Live
              </div>
            )}
          </motion.div>
        ))}
        {/* VS badge */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-[#0a0a0f] border-2 border-orange-500 flex items-center justify-center text-orange-500 font-black text-sm shadow-[0_0_20px_rgba(249,115,22,0.6)]"
        >
          VS
        </motion.div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="inline-flex items-center gap-1 text-rose-300 font-semibold">
          <Flame className="h-3 w-3" /> {battles} battles streaming
        </span>
        <span className="text-white/50">Tap to join inside</span>
      </div>
    </div>
  );
};
