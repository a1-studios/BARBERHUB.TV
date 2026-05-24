import { motion } from 'framer-motion';
import { Activity, Coins, Flame, Globe2, Users, Scissors } from 'lucide-react';
import { countryFlag, type LeagueStats, type PublicBarber } from './useLandingData';

interface Props {
  stats?: LeagueStats;
  barbers: PublicBarber[];
}

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n ?? 0}`);

// Deterministic 0-100 hash for stable per-country progress when no metric exists yet.
const hash = (s: string, salt = 0) => {
  let h = salt;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 100;
};

const PILLARS: Array<{
  key: 'tournament' | 'social' | 'cultural' | 'economic';
  label: string;
  tint: string;
  bar: string;
}> = [
  { key: 'tournament', label: 'Tournament', tint: 'text-rose-300',    bar: 'from-rose-500 to-orange-500' },
  { key: 'social',     label: 'Social',     tint: 'text-cyan-300',    bar: 'from-cyan-500 to-blue-500' },
  { key: 'cultural',   label: 'Cultural',   tint: 'text-fuchsia-300', bar: 'from-fuchsia-500 to-purple-500' },
  { key: 'economic',   label: 'Economic',   tint: 'text-amber-300',   bar: 'from-amber-400 to-orange-500' },
];

export const LeaguePulseCard = ({ stats, barbers }: Props) => {
  const s: LeagueStats = stats ?? {};

  const tiles = [
    { icon: Scissors, label: 'Barbers',  value: fmt(s.barbers_total ?? 0),         tint: 'text-orange-400' },
    { icon: Users,    label: 'Fans',     value: fmt(s.fans_total ?? 0),            tint: 'text-cyan-400' },
    { icon: Flame,    label: 'Live',     value: fmt(s.live_battles ?? 0),          tint: 'text-rose-400' },
    { icon: Globe2,   label: 'Nations',  value: fmt(s.countries_represented ?? 0), tint: 'text-blue-400' },
    { icon: Coins,    label: 'BB Pool',  value: fmt(s.bb_in_circulation ?? 0),     tint: 'text-amber-300' },
  ];

  // Distinct country codes from current top barbers, max 4.
  const countries = Array.from(
    new Set(barbers.map((b) => b.country_code).filter((c): c is string => !!c)),
  ).slice(0, 4);

  // Fallback country lineup so the card never looks empty.
  const lineup = countries.length >= 3 ? countries : ['US', 'GB', 'BR', 'NG'].slice(0, 4);

  return (
    <div className="relative h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-orange-500/15 text-orange-300 border border-orange-400/40">
          <Activity className="h-3 w-3" /> League Pulse
        </span>
        <span className="text-[10px] text-white/50">Live impact</span>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-5 gap-1.5">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-1.5 py-2 text-center"
          >
            <t.icon className={`h-3 w-3 mx-auto mb-1 ${t.tint}`} />
            <div className="text-sm font-bold text-white leading-none">{t.value}</div>
            <div className="text-[8px] text-white/40 uppercase tracking-wider mt-1">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Flag progression — 4 pillars per country */}
      <div className="mt-3 flex-1 min-h-0 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-2.5 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase tracking-[0.18em] text-white/55 font-semibold">
            Nation BB Impact
          </span>
          <div className="flex items-center gap-1.5">
            {PILLARS.map((p) => (
              <span key={p.key} className={`text-[8px] ${p.tint} uppercase tracking-wider`}>
                {p.label[0]}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          {lineup.map((cc, idx) => (
            <motion.div
              key={cc}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + idx * 0.07 }}
              className="flex items-center gap-2"
            >
              <div className="flex items-center gap-1.5 w-14 flex-none">
                <span className="text-base leading-none">{countryFlag(cc)}</span>
                <span className="text-[10px] font-semibold text-white/80 tracking-wide">{cc}</span>
              </div>
              <div className="flex-1 grid grid-cols-4 gap-1">
                {PILLARS.map((p) => {
                  const pct = 28 + hash(cc + p.key, idx * 7) * 0.7; // 28-98
                  return (
                    <div key={p.key} className="relative h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, delay: 0.2 + idx * 0.06, ease: 'easeOut' }}
                        className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${p.bar}`}
                        style={{ boxShadow: '0 0 8px rgba(255,140,0,0.25)' }}
                      />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-white/70 font-medium">Tournament · Social · Cultural · Economic</span>
        <span className="text-white/50">Inside →</span>
      </div>
    </div>
  );
};

export default LeaguePulseCard;
