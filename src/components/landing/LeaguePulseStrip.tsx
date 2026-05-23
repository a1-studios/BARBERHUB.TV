import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Scissors, Users, Flame, Globe2, Coins, GraduationCap, Award, Sparkles } from 'lucide-react';

interface LeagueStats {
  barbers_total: number;
  barbers_licensed_pro: number;
  barbers_beginner: number;
  barbers_educator: number;
  barbers_official_sponsor: number;
  fans_total: number;
  active_battles: number;
  live_battles: number;
  countries_represented: number;
  bb_in_circulation: number;
}

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n ?? 0}`);

export const LeaguePulseStrip = () => {
  const { data } = useQuery<LeagueStats>({
    queryKey: ['public-league-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_league_stats');
      if (error) throw error;
      return data as unknown as LeagueStats;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const stats = data ?? {
    barbers_total: 0, barbers_licensed_pro: 0, barbers_beginner: 0,
    barbers_educator: 0, barbers_official_sponsor: 0, fans_total: 0,
    active_battles: 0, live_battles: 0, countries_represented: 0, bb_in_circulation: 0,
  };

  const tiles = [
    { icon: Scissors,       label: 'Barbers',          value: fmt(stats.barbers_total),           tint: 'text-orange-400' },
    { icon: Sparkles,       label: 'Licensed Pro',     value: fmt(stats.barbers_licensed_pro),    tint: 'text-amber-300' },
    { icon: Scissors,       label: 'Beginners',        value: fmt(stats.barbers_beginner),        tint: 'text-white/70' },
    { icon: GraduationCap,  label: 'Educators',        value: fmt(stats.barbers_educator),        tint: 'text-emerald-400' },
    { icon: Award,          label: 'Sponsors',         value: fmt(stats.barbers_official_sponsor),tint: 'text-yellow-400' },
    { icon: Users,          label: 'Fans',             value: fmt(stats.fans_total),              tint: 'text-cyan-400' },
    { icon: Flame,          label: 'Live Battles',     value: fmt(stats.live_battles),            tint: 'text-rose-400' },
    { icon: Globe2,         label: 'Countries',        value: fmt(stats.countries_represented),   tint: 'text-blue-400' },
    { icon: Coins,          label: 'BB in Play',       value: fmt(stats.bb_in_circulation),       tint: 'text-orange-300' },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
        <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">League Pulse</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-[#0a0a0f] border border-white/[0.06] p-2.5 text-center">
            <t.icon className={`h-3.5 w-3.5 mx-auto mb-1 ${t.tint}`} />
            <div className="text-base sm:text-lg font-semibold text-white leading-none">{t.value}</div>
            <div className="text-[9px] text-white/40 uppercase tracking-wider mt-1">{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaguePulseStrip;
