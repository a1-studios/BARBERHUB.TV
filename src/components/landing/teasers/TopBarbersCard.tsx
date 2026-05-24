import { motion } from 'framer-motion';
import { Trophy, Globe } from 'lucide-react';
import { countryFlag, PublicBarber } from './useLandingData';

interface Props {
  barbers: PublicBarber[];
}

const FALLBACK: PublicBarber[] = [
  { user_id: 'k', display_name: 'Kairo', country_code: 'BR', avatar_url: null },
  { user_id: 's', display_name: 'Soren', country_code: 'SE', avatar_url: null },
  { user_id: 'r', display_name: 'Rafa',  country_code: 'ES', avatar_url: null },
];

const TINTS = [
  'from-yellow-300 to-amber-500',
  'from-zinc-200 to-zinc-400',
  'from-orange-400 to-orange-700',
];
const HEIGHTS = ['h-24', 'h-20', 'h-16'];

export const TopBarbersCard = ({ barbers }: Props) => {
  const top3 = (barbers.length >= 3 ? barbers.slice(0, 3) : FALLBACK);
  const podium = top3.map((b, i) => ({ ...b, rank: i + 1, color: TINTS[i], height: HEIGHTS[i] }));
  // visual order: 2nd, 1st, 3rd
  const order = [podium[1], podium[0], podium[2]];

  return (
    <div className="relative h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-yellow-400/15 text-yellow-300 border border-yellow-400/40">
          <Trophy className="h-3 w-3" /> Weekly Leaders
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-white/60 font-semibold">
          <Globe className="h-3 w-3" /> Global Top 3
        </span>
      </div>

      <div
        className="relative flex-1 rounded-xl overflow-hidden border border-white/10 bg-gradient-to-b from-yellow-500/[0.06] via-transparent to-transparent flex items-end justify-center gap-3 px-4 pb-3"
        style={{ perspective: '600px' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-yellow-300/15 blur-3xl rounded-full pointer-events-none" />

        {order.map((p, i) => (
          <motion.div
            key={p.user_id}
            initial={{ y: 60, opacity: 0, rotateY: -30 }}
            animate={{ y: 0, opacity: 1, rotateY: 0 }}
            transition={{ delay: 0.15 + i * 0.12, type: 'spring', damping: 14 }}
            style={{ transformStyle: 'preserve-3d' }}
            className="relative flex flex-col items-center"
          >
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.4 }}
              className={`relative h-12 w-12 rounded-full bg-gradient-to-br ${p.color} ring-2 ring-white/30 flex items-center justify-center overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.5)] mb-1.5`}
            >
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={p.display_name ?? ''} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl">{countryFlag(p.country_code)}</span>
              )}
              {p.rank === 1 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-base">👑</div>
              )}
            </motion.div>
            <div className="text-[11px] font-semibold text-white truncate max-w-[80px]">
              {p.display_name ?? 'Barber'}
            </div>
            <div className="text-[10px] text-white/60">
              {countryFlag(p.country_code)} {p.country_code ?? '—'}
            </div>
            <div
              className={`mt-1.5 w-16 ${p.height} rounded-t-md bg-gradient-to-b ${p.color} relative shadow-[inset_0_2px_0_rgba(255,255,255,0.3),inset_0_-8px_16px_rgba(0,0,0,0.3)] flex items-start justify-center pt-1`}
            >
              <span className="text-xs font-black text-[#0a0a0f]">{p.rank}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-white/70 font-medium">Climb the global ranks</span>
        <span className="text-white/50">Inside →</span>
      </div>
    </div>
  );
};
