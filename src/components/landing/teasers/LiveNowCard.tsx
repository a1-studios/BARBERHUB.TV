import { motion } from 'framer-motion';
import { Eye, Flame } from 'lucide-react';
import { useCountUp } from './useCountUp';
import { countryFlag, LiveBattleTease, PublicBarber } from './useLandingData';

interface Props {
  liveBattles: number;
  viewers: number;
  battle: LiveBattleTease | null;
}

const FALLBACK_1: PublicBarber = { user_id: 'm', display_name: 'Marco', country_code: 'IT', avatar_url: null };
const FALLBACK_2: PublicBarber = { user_id: 'd', display_name: 'Diego', country_code: 'MX', avatar_url: null };

const Side = ({
  barber,
  side,
  delay,
}: {
  barber: PublicBarber;
  side: 'left' | 'right';
  delay: number;
}) => {
  const tint = side === 'left' ? 'from-orange-600/60 to-orange-900/80' : 'from-cyan-600/60 to-blue-900/80';
  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`relative bg-gradient-to-br ${tint} flex flex-col items-center justify-end pb-3`}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, delay: side === 'right' ? 0.5 : 0 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {barber.avatar_url ? (
          <img
            src={barber.avatar_url}
            alt={barber.display_name ?? 'barber'}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-white/30 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
          />
        ) : (
          <span className="text-5xl">✂️</span>
        )}
      </motion.div>
      <div className="relative z-10 text-center">
        <div className="text-xl">{countryFlag(barber.country_code)}</div>
        <div className="text-xs font-bold text-white drop-shadow truncate max-w-[100px]">
          {barber.display_name ?? 'Barber'}
        </div>
      </div>
      {side === 'left' && (
        <div className="absolute top-2 left-2 inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider text-white bg-rose-600 px-1.5 py-0.5 rounded-sm">
          <span className="h-1 w-1 rounded-full bg-white animate-pulse" /> Live
        </div>
      )}
    </motion.div>
  );
};

export const LiveNowCard = ({ liveBattles, viewers, battle }: Props) => {
  const battleCount = useCountUp(Math.max(liveBattles, 1));
  const watching = useCountUp(Math.max(viewers, battle?.viewers ?? 0, 32));

  const b1 = battle?.barber1 ?? FALLBACK_1;
  const b2 = battle?.barber2 ?? FALLBACK_2;

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

      <div className="relative flex-1 rounded-xl overflow-hidden border border-white/10 grid grid-cols-2 gap-px bg-white/10">
        <Side barber={b1} side="left" delay={0} />
        <Side barber={b2} side="right" delay={0.1} />
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-[#0a0a0f] border-2 border-orange-500 flex items-center justify-center text-orange-500 font-black text-sm shadow-[0_0_20px_rgba(249,115,22,0.6)]"
        >
          VS
        </motion.div>
        {battle?.title && (
          <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 text-[10px] text-white/90 truncate text-center">
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
