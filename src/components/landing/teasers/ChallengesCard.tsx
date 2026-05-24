import { motion } from 'framer-motion';
import { Swords, Coins, Timer } from 'lucide-react';
import { OpenChallengeTease } from './useLandingData';

interface Props {
  challenges: OpenChallengeTease[];
}

const TILTS = [-6, 0, 6];

const formatTtl = (expiresAt: string | null): string => {
  if (!expiresAt) return 'open';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'closed';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

const initials = (name: string) =>
  name.replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase() || '?';

const STATUS_LABEL: Record<OpenChallengeTease['status'], string> = {
  open: 'Open',
  accepted: 'Matched',
  history: 'Recent',
};

export const ChallengesCard = ({ challenges }: Props) => {
  const isEmpty = challenges.length === 0;
  const list = challenges.slice(0, 3);

  return (
    <div className="relative h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/40">
          <Swords className="h-3 w-3" /> Open Challenges
        </span>
        <span className="text-[10px] text-white/60">{challenges.filter(c => c.status === 'open').length} live now</span>
      </div>

      <div className="relative flex-1 rounded-xl overflow-hidden border border-white/10 bg-gradient-to-b from-orange-500/[0.05] via-transparent to-transparent p-3">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <motion.div
              animate={{ rotate: [-6, 6, -6] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-5xl mb-2"
            >
              ⚔️
            </motion.div>
            <div className="text-sm font-bold text-white">Be the first to throw a stake</div>
            <div className="text-[11px] text-white/60 mt-1">No live challenges right now — open one and call out any barber on the platform.</div>
          </div>
        ) : (
          <div className="relative h-full flex items-center justify-center">
            {list.map((c, i) => {
              const isHero = i === 1 || (list.length === 1 && i === 0);
              const isHistory = c.status === 'history';
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 30, rotate: 0 }}
                  animate={{ opacity: isHistory ? 0.55 : 1, y: 0, rotate: TILTS[i] ?? 0 }}
                  transition={{ delay: 0.15 + i * 0.1, type: 'spring', damping: 14 }}
                  style={{ zIndex: isHero ? 3 : 2 - Math.abs(i - 1) }}
                  className={`absolute w-44 rounded-lg bg-[#13131c] border-2 ${
                    isHero && !isHistory ? 'border-orange-500 shadow-[0_0_24px_rgba(249,115,22,0.4)]' : 'border-white/15'
                  } p-3`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {initials(c.from)}
                      </div>
                      <div className="text-[11px] font-semibold text-white truncate">{c.from}</div>
                    </div>
                    <div className="inline-flex items-center gap-0.5 text-[9px] text-white/50 flex-none">
                      <Timer className="h-2.5 w-2.5" /> {formatTtl(c.expiresAt)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-white/40">{STATUS_LABEL[c.status]}</div>
                      <div className="inline-flex items-center gap-1 text-orange-400 font-black text-base">
                        <Coins className="h-3.5 w-3.5" /> {c.stake || '—'}
                      </div>
                    </div>
                    {isHero && c.status === 'open' && (
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
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-white/70 font-medium">Stake · Battle · Win BB</span>
        <span className="text-orange-300">Accept inside →</span>
      </div>
    </div>
  );
};
