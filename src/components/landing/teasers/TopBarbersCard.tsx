import { motion } from 'framer-motion';
import { Trophy, Globe } from 'lucide-react';
import { countryFlag, type PublicBarber } from './useLandingData';

interface Props {
  barbers: PublicBarber[];
}

const TINTS = [
  'from-yellow-300 to-amber-500',
  'from-zinc-200 to-zinc-400',
  'from-orange-400 to-orange-700',
];
const HEIGHTS = ['h-24', 'h-20', 'h-16'];

export const TopBarbersCard = ({ barbers }: Props) => {
  const top3 = barbers.slice(0, 3);
  const rising = barbers.slice(3, 7);
  if (top3.length === 0) {
    return (
      <div className="relative h-full w-full flex items-center justify-center text-white/40 text-xs">
        Leaderboard loading…
      </div>
    );
  }
  const podium = top3.map((b, i) => ({ ...b, rank: i + 1, color: TINTS[i], height: HEIGHTS[i] }));
  const order = top3.length >= 3 ? [podium[1], podium[0], podium[2]] : podium;

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
        className="relative flex-1 rounded-xl overflow-hidden border border-white/10 bg-gradient-to-b from-yellow-500/[0.06] via-transparent to-transparent flex flex-col items-center justify-end px-4 pb-2"
        style={{ perspective: '600px' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-yellow-300/15 blur-3xl rounded-full pointer-events-none" />

        <div className="flex-1 w-full flex items-end justify-center gap-3">
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

        {rising.length > 0 && (
          <div className="w-full pt-2 mt-2 border-t border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-wider text-white/50 font-semibold">Rising stars</span>
              <span className="text-[9px] text-white/40">#4 – #{3 + rising.length}</span>
            </div>
            <div className="flex items-center gap-2">
              {rising.map((b, i) => (
                <motion.div
                  key={b.user_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.08 }}
                  className="flex-1 min-w-0 flex items-center gap-1.5 rounded-md bg-white/[0.04] border border-white/10 px-1.5 py-1"
                >
                  <div className="h-6 w-6 rounded-full overflow-hidden bg-white/[0.06] ring-1 ring-white/15 flex items-center justify-center flex-none">
                    {b.avatar_url ? (
                      <img src={b.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px]">{countryFlag(b.country_code)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-white truncate leading-tight">
                      {b.display_name ?? 'Barber'}
                    </div>
                    <div className="text-[9px] text-white/50 leading-tight">
                      #{4 + i} · {b.country_code ?? '—'}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-white/70 font-medium">Climb the global ranks</span>
        <span className="text-white/50">Inside →</span>
      </div>
    </div>
  );
};
