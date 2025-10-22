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

  // Fetch ALL registered barbers from database
  const { data: contenders = [], isLoading: isLoadingContenders } = useQuery({
    queryKey: ['global-contenders'],
    queryFn: async () => {
      // Fetch ALL barber profiles (no limit, no filters)
      const { data: barbers, error: barbersError } = await supabase
        .from('barber_profiles')
        .select('id, user_id, name, country_code');

      if (barbersError) throw barbersError;

      // Fetch corresponding user profiles for avatars
      const userIds = (barbers || []).map(b => b.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, avatar_url')
        .in('user_id', userIds);

      // Create a map of user_id to avatar_url
      const avatarMap = new Map(
        (profiles || []).map(p => [p.user_id, p.avatar_url])
      );

      // Transform to ImageData format
      return (barbers || []).map((barber): ImageData => ({
        id: barber.id,
        src: avatarMap.get(barber.user_id) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${barber.id}`,
        alt: barber.name || 'Barber',
        title: barber.name || 'Barber',
        description: `Country: ${barber.country_code || 'XX'} - Professional barber competing in the global league`
      }));
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

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
          
          <div className="flex justify-center py-8">
            {isLoadingContenders ? (
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="w-[650px] h-[650px] rounded-full" />
                <p className="text-sm text-muted-foreground">Loading contenders...</p>
              </div>
            ) : contenders.length > 0 ? (
              <SphereImageGrid
                images={contenders}
                containerSize={650}
                sphereRadius={280}
                autoRotate={true}
                autoRotateSpeed={0.25}
                dragSensitivity={0.7}
                baseImageScale={0.14}
                hoverScale={1.3}
                perspective={1200}
                className="mx-auto"
              />
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
