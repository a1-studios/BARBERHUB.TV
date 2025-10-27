import { Trophy, Users, Swords, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Globe3D from '@/components/Globe3D';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedCounter } from '@/components/battles/AnimatedCounter';

export const PrizePoolCard = () => {
  // Fetch real community stats
  const { data: stats } = useQuery({
    queryKey: ['community-stats'],
    queryFn: async () => {
      const [usersRes, barbersRes, battlesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('barber_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('battles').select('id', { count: 'exact', head: true }).eq('status', 'voting')
      ]);

      return {
        totalUsers: usersRes.count || 0,
        totalBarbers: barbersRes.count || 0,
        activeBattles: battlesRes.count || 0
      };
    },
    refetchInterval: 10000 // Refresh every 10 seconds for dynamic feel
  });

  return (
    <Card className="relative overflow-hidden border-2 border-primary/50 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Dynamic 3D Globe Background */}
      <Globe3D />
      
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-pulse" />

      <CardContent className="relative z-10 text-center py-8 sm:py-12">
        {/* Grand Prize Display */}
        <div className="mx-auto mb-6 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-primary to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_50px_hsl(var(--primary)/0.5)] animate-pulse">
          <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
        </div>

        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-orange-500 to-primary bg-clip-text text-transparent mb-4">
          $25,000
        </h2>
        <p className="text-xl sm:text-2xl text-foreground font-semibold mb-2">
          Grand Prize Pool
        </p>

        <p className="text-lg sm:text-xl text-muted-foreground mb-8">
          Global Community Championship
        </p>

        {/* Real-Time Community Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-lg blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-background/50 backdrop-blur-sm p-4 rounded-lg border border-primary/20 hover:border-primary/50 transition-all">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl sm:text-3xl font-bold text-primary">
                <AnimatedCounter value={stats?.totalUsers || 0} duration={2000} />
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Members</p>
            </div>
          </div>
          
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent rounded-lg blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-background/50 backdrop-blur-sm p-4 rounded-lg border border-primary/20 hover:border-primary/50 transition-all">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl sm:text-3xl font-bold text-orange-500">
                <AnimatedCounter value={stats?.totalBarbers || 0} duration={2000} />
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Creators</p>
            </div>
          </div>
          
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent rounded-lg blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-background/50 backdrop-blur-sm p-4 rounded-lg border border-primary/20 hover:border-primary/50 transition-all">
              <Swords className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl sm:text-3xl font-bold text-green-500">
                <AnimatedCounter value={stats?.activeBattles || 0} duration={2000} />
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Live Now</p>
            </div>
          </div>
        </div>

        {/* Dynamic Community Pulse Indicator */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Community Live & Growing
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
