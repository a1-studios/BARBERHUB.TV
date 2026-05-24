import { motion } from 'framer-motion';
import { Eye, Flame } from 'lucide-react';
import { useCountUp } from './useCountUp';
import { countryFlag, LiveBattleTease, PublicBarber } from './useLandingData';

interface Props {
  liveBattles: number;
  viewers: number;
  battle: LiveBattleTease | null;
}

const Tile = ({
  barber,
  side,
  delay,
}: {
  barber: PublicBarber | null;
  side: 'top' | 'bottom';
  delay: number;
}) => {
  const tint =
    side === 'top'
      ? 'from-orange-500/70 via-orange-700/50 to-orange-900/30'
      : 'from-cyan-500/70 via-blue-700/50 to-blue-900/30';

  return (
    <motion.div
      initial={{ opacity: 0, y: side === 'top' ? -16 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`relative bg-gradient-to-b ${tint} flex items-center justify-center overflow-hidden`}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, delay: side === 'bottom' ? 0.5 : 0 }}
        className="flex items-center justify-center"
      >
        {barber?.avatar_url ? (
          <img
            src={barber.avatar_url}
            alt={barber.display_name ?? 'barber'}
            className="h-24 w-24 rounded-full object-cover ring-2 ring-white/40 shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
          />
        ) : (
          <div className="h-24 w-24 rounded-full bg-white/[0.04] ring-2 ring-white/20 flex items-center justify-center text-4xl">
            ✂️
          </div>
        )}
      </motion.div>

      {side === 'top' && (
        <div className="absolute top-2 left-2 inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider text-white bg-rose-600 px-1.5 py-0.5 rounded-sm">
          <span className="h-1 w-1 rounded-full bg-white animate-pulse" /> Live
        </div>
      )}

      <div
        className={`absolute ${side === 'top' ? 'bottom-2' : 'top-2'} left-1/2 -translate-x-1/2 text-center`}
      >
        <div className="text-base leading-none">{countryFlag(barber?.country_code)}</div>
        <div className="text-[12px] font-bold text-white drop-shadow truncate max-w-[140px]">
          {barber?.display_name ?? 'Warming up'}
        </div>
      </div>
    </motion.div>
  );
};

export const LiveNowCard = ({ liveBattles, viewers, battle }: Props) => {
  const battleCount = useCountUp(Math.max(liveBattles, 1));
  const watching = useCountUp(Math.max(viewers, battle?.viewers ?? 0, 32));

  const b1 = battle?.barber1 ?? null;
  const b2 = battle?.barber2 ?? null;

  return (
    <div className="relative h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/40">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          Live Now
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-white/60">
          <Eye className="h-3 w-3" /> {watching.toLocaleString()}
        </span>
      </div>

      <div className="relative flex-1 rounded-xl overflow-hidden border border-white/10 grid grid-rows-2 bg-white/5">
        <Tile barber={b1} side="top" delay={0} />
        <Tile barber={b2} side="bottom" delay={0.1} />

        {/* Animated seam */}
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-orange-500 via-white/70 to-cyan-400 z-10" />

        {/* Centered VS — anchored to the seam */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-[#0a0a0f] border-2 border-orange-500 flex items-center justify-center text-orange-500 font-black text-sm shadow-[0_0_22px_rgba(249,115,22,0.7)]"
        >
          VS
        </motion.div>

        {battle?.title && (
          <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/85 to-transparent px-2 py-1.5 text-[10px] text-white/90 truncate text-center">
            {battle.title}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="inline-flex items-center gap-1 text-rose-300 font-semibold">
          <Flame className="h-3 w-3" /> {battleCount} streaming now
        </span>
        <span className="text-white/50">Tap to join inside</span>
      </div>
    </div>
  );
};
