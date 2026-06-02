import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { BottomNavBar } from '@/components/BottomNavBar';
import { Trophy, Search, Star, Swords, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TOURNAMENT_CATEGORIES } from '@/config/categories';
import { motion, AnimatePresence } from 'framer-motion';

const FILTER_CHIPS = [
  { id: 'all', label: 'Global', icon: '🌍' },
  ...TOURNAMENT_CATEGORIES.map(c => ({ id: c.id, label: c.shortName, icon: c.icon })),
];

interface RankedBarber {
  user_id: string;
  name: string;
  avatar_url: string | null;
  specialty: string | null;
  rating: number | null;
  country_code: string | null;
  battle_wins: number;
  battle_count: number;
}

export default function Rankings() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const { data: barbers = [], isLoading } = useQuery({
    queryKey: ['rankings-barbers'],
    queryFn: async () => {
      // Fetch from barber_stats view which has aggregated data
      const { data, error } = await supabase
        .from('barber_stats')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((b: any) => ({
        user_id: b.user_id,
        name: b.barber_name || 'Unknown',
        avatar_url: b.avatar_url,
        specialty: b.specialty,
        rating: b.rating,
        country_code: b.country_code,
        battle_wins: b.battles_won || 0,
        battle_count: b.battles_played || 0,
      })) as RankedBarber[];
    },
  });

  const filtered = barbers.filter(b => {
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
    // Category filter could be expanded to match specialty
    return true;
  });

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  // Reorder for podium: [#2, #1, #3]
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Barber Rankings — Global Leaderboard | BARBER-HUB</title>
        <meta
          name="description"
          content="Live global leaderboard of top barbers ranked by battle wins, ratings, and tournament results. Filter by category and country on BARBER-HUB."
        />
        <link rel="canonical" href="https://barberhub.tv/rankings" />
        <meta property="og:title" content="Barber Rankings — Global Leaderboard | BARBER-HUB" />
        <meta property="og:description" content="Live global leaderboard of top barbers ranked by battle wins, ratings, and tournament results." />
        <meta property="og:url" content="https://barberhub.tv/rankings" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Header />
      <div className="h-24 sm:h-28" />

      <main className="px-4 pb-24 max-w-lg mx-auto">
        {/* Title */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Trophy className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Global Rankings
          </h1>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search barbers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-10 bg-card border-border/50 h-10 text-sm"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2">
            <Filter className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                activeFilter === chip.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground border border-border/50',
              )}
            >
              <span>{chip.icon}</span>
              {chip.label}
            </button>
          ))}
        </div>

        {/* Podium */}
        {!isLoading && podiumOrder.length >= 3 && (
          <div className="flex items-end justify-center gap-3 mb-8 px-2">
            {podiumOrder.map((barber, i) => {
              const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
              const isKing = rank === 1;
              const size = isKing ? 'w-20 h-20' : 'w-16 h-16';
              const ringColor = isKing ? 'ring-primary' : rank === 2 ? 'ring-muted-foreground' : 'ring-amber-700';

              return (
                <motion.div
                  key={barber.user_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    'flex flex-col items-center',
                    isKing && '-mt-6',
                  )}
                >
                  {isKing && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] mb-1 font-bold">
                      👑 KING
                    </Badge>
                  )}
                  <div className="relative">
                    <Avatar className={cn(size, 'ring-2', ringColor)}>
                      <AvatarImage src={barber.avatar_url || undefined} />
                      <AvatarFallback className="bg-muted text-foreground font-bold text-lg">
                        {barber.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      'absolute -bottom-2 left-1/2 -translate-x-1/2',
                      'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black',
                      isKing ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground border border-border',
                    )}>
                      {rank}
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-foreground text-center truncate max-w-[80px]">
                    {barber.name}
                  </p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <Star className="w-3 h-3 text-primary fill-primary" />
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {barber.rating?.toFixed(1) || '—'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Top Challengers List */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
            Top Challengers
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          ) : rest.length === 0 && top3.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No ranked barbers yet</p>
            </div>
          ) : (
            <AnimatePresence>
              {rest.map((barber, i) => (
                <motion.div
                  key={barber.user_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/30"
                >
                  <span className="text-sm font-black text-muted-foreground w-6 text-center">
                    {i + 4}
                  </span>
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={barber.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-foreground text-sm font-bold">
                      {barber.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{barber.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {barber.specialty || 'All-rounder'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-primary fill-primary" />
                      <span className="text-xs font-semibold text-foreground">
                        {barber.rating?.toFixed(1) || '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 text-muted-foreground">
                      <Swords className="w-3 h-3" />
                      <span className="text-[10px] font-medium">
                        {barber.battle_wins}/{barber.battle_count}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}
