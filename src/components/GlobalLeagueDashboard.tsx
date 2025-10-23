import { useNavigate } from 'react-router-dom';
import { Compass, MapPin, Gift } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { BattleWindowTimer } from '@/components/BattleWindowTimer';
import { PrizePoolCard } from '@/components/PrizePoolCard';
import { LiveBattleFeed } from '@/components/LiveBattleFeed';
import { FanActionZone } from '@/components/FanActionZone';
import SphereImageGrid, { ImageData } from '@/components/SphereImageGrid';
import { Skeleton } from '@/components/ui/skeleton';

export const GlobalLeagueDashboard = () => {
  const navigate = useNavigate();

  // Fetch ALL registered barbers from database with stats
  const { data: contendersData = { contenders: [], championId: null }, isLoading: isLoadingContenders } = useQuery({
    queryKey: ['global-contenders'],
    queryFn: async () => {
      // Fetch ALL barber profiles with ratings
      const { data: barbers, error: barbersError } = await supabase
        .from('barber_profiles')
        .select('id, user_id, name, country_code, rating');

      if (barbersError) throw barbersError;

      // Fetch corresponding user profiles for avatars and display names
      const userIds = (barbers || []).map(b => b.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, avatar_url, display_name')
        .in('user_id', userIds);

      // Fetch barber stats for ranking
      const barberIds = (barbers || []).map(b => b.id);
      const { data: stats } = await supabase
        .from('barber_stats')
        .select('barber_id, follower_count, like_count')
        .in('barber_id', barberIds);

      // Create maps
      const avatarMap = new Map(
        (profiles || []).map(p => [p.user_id, { avatar: p.avatar_url, displayName: p.display_name }])
      );
      const statsMap = new Map(
        (stats || []).map(s => [s.barber_id, { followers: s.follower_count || 0, likes: s.like_count || 0 }])
      );

      // Determine champion based on rating, then followers, then likes
      let championId = null;
      if (barbers && barbers.length > 0) {
        const sorted = [...barbers].sort((a, b) => {
          const ratingDiff = (b.rating || 0) - (a.rating || 0);
          if (ratingDiff !== 0) return ratingDiff;
          
          const aStats = statsMap.get(a.id) || { followers: 0, likes: 0 };
          const bStats = statsMap.get(b.id) || { followers: 0, likes: 0 };
          
          const followerDiff = bStats.followers - aStats.followers;
          if (followerDiff !== 0) return followerDiff;
          
          return bStats.likes - aStats.likes;
        });
        championId = sorted[0]?.id || null;
      }

      // Transform to ImageData format
      const contenders = (barbers || []).map((barber): ImageData => {
        const profile = avatarMap.get(barber.user_id);
        const barberStats = statsMap.get(barber.id);
        
        return {
          id: barber.id,
          src: profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${barber.id}`,
          alt: profile?.displayName || barber.name || 'Barber',
          title: profile?.displayName || barber.name || 'Barber',
          description: `Country: ${barber.country_code || 'XX'} - Professional barber competing in the global league`,
          countryCode: barber.country_code || 'XX',
          isChampion: barber.id === championId,
          rating: barber.rating || 0,
          stats: barberStats ? {
            followers: barberStats.followers,
            likes: barberStats.likes
          } : undefined
        };
      });

      return { contenders, championId };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const contenders = contendersData.contenders;
  const championId = contendersData.championId;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-16">
        {/* Prize Pool Feature Card */}
        <PrizePoolCard />

        {/* Global Contenders 3D Sphere */}
        <div className="relative">
          <div className="text-center space-y-3 mb-8">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              Global Contenders
            </h2>
            <p className="text-lg text-muted-foreground">
              🌍 {contenders.length}+ barbers competing from around the world
            </p>
            <p className="text-sm text-muted-foreground/70">
              Drag to rotate • Click to view profiles
            </p>
          </div>
          
          <div className="flex justify-center py-8 px-4">
            {isLoadingContenders ? (
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="w-full max-w-[650px] aspect-square rounded-full" />
                <p className="text-sm text-muted-foreground">Loading contenders...</p>
              </div>
            ) : contenders.length > 0 ? (
              <div className="w-full max-w-[650px]">
                <SphereImageGrid
                  images={contenders}
                  containerSize={typeof window !== 'undefined' ? Math.min(650, window.innerWidth - 32) : 650}
                  sphereRadius={typeof window !== 'undefined' ? Math.min(280, (window.innerWidth - 32) * 0.43) : 280}
                  autoRotate={true}
                  autoRotateSpeed={0.25}
                  dragSensitivity={0.7}
                  baseImageScale={0.14}
                  hoverScale={1.3}
                  perspective={1200}
                  championId={championId || undefined}
                  grandPrize="$25,000"
                  showCountryFlags={true}
                  showChampionCrown={true}
                  className="mx-auto"
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No contenders registered yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate('/barbers')}
                >
                  Explore Barbers
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Role-Based Action Zone */}
        <FanActionZone />

        {/* Battle Section with Timer */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Live Battles</h2>
            <BattleWindowTimer />
          </div>
          <LiveBattleFeed />
        </div>

        {/* Quick Access Links */}
        <div className="border-t pt-8">
          <h3 className="text-xl font-bold mb-6">Quick Access</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-start"
              onClick={() => navigate('/discover')}
            >
              <Compass className="w-5 h-5 mr-2" />
              Explore All Battles
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-start"
              onClick={() => navigate('/barbers')}
            >
              <MapPin className="w-5 h-5 mr-2" />
              Find Barbers Near You
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-start"
              onClick={() => navigate('/grants')}
            >
              <Gift className="w-5 h-5 mr-2" />
              Career Grants
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
