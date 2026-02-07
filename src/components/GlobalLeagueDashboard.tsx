import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Gift, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PrizePoolCard } from '@/components/PrizePoolCard';
import { LiveBattleFeed } from '@/components/LiveBattleFeed';
import SphereImageGrid, { ImageData } from '@/components/SphereImageGrid';
import { Skeleton } from '@/components/ui/skeleton';
import { SphereHolographicWrapper } from '@/components/SphereHolographicWrapper';

export const GlobalLeagueDashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    navigate(`/barbers${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
  };

  // Fetch ALL registered barbers using unified view
  const { data: contendersData = { contenders: [], championId: null }, isLoading: isLoadingContenders } = useQuery({
    queryKey: ['global-contenders'],
    queryFn: async () => {
      const { data: barbers, error } = await supabase
        .from('public_barber_profiles')
        .select('*')
        .order('rating', { ascending: false });

      if (error) throw error;

      // Determine champion (highest rated)
      const championId = barbers?.[0]?.barber_id || null;

      // Transform to ImageData format
      const contenders = (barbers || []).map((barber, index): ImageData => {
        const normalizedCountryCode = barber.country_code?.trim() || 'XX';
        
        return {
          id: barber.user_id,
          barberId: barber.barber_id,
          src: barber.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${barber.barber_id}`,
          alt: barber.display_name || barber.barber_name || 'Barber',
          title: barber.display_name || barber.barber_name || 'Barber',
          description: `Professional barber competing in the global league`,
          countryCode: normalizedCountryCode,
          isChampion: barber.barber_id === championId,
          rating: barber.rating || 0,
          rank: index + 1,
          location: barber.location || normalizedCountryCode,
          stats: {
            followers: barber.follower_count,
            likes: barber.like_count
          }
        };
      });

      return { contenders, championId };
    },
    refetchInterval: 30000,
  });

  const contenders = contendersData.contenders;
  const championId = contendersData.championId;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Minimal Search Bar */}
        <div className="max-w-md mx-auto">
          <div className="relative flex items-center rounded-full border border-border/60 bg-muted/30 backdrop-blur-sm px-4 py-2">
            <Search className="w-4 h-4 text-muted-foreground mr-3 flex-shrink-0" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Find the best barber near you"
              className="border-0 bg-transparent focus-visible:ring-0 p-0 h-auto text-sm placeholder:text-muted-foreground/60"
            />
            <Button
              onClick={handleSearch}
              variant="ghost"
              size="sm"
              className="text-xs text-primary hover:text-primary/80 flex-shrink-0 px-2"
            >
              Search
            </Button>
          </div>
        </div>

        {/* 3D Sphere */}
        <div className="relative">
          <div className="flex justify-center py-8 px-4">
            {isLoadingContenders ? (
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="w-full max-w-[650px] aspect-square rounded-full" />
                <p className="text-sm text-muted-foreground">Loading contenders...</p>
              </div>
            ) : contenders.length > 0 ? (
              <SphereHolographicWrapper size={typeof window !== 'undefined' ? Math.min(650, window.innerWidth - 32) : 650}>
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
              </SphereHolographicWrapper>
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

        {/* Prize Pool Feature Card */}
        <PrizePoolCard />

        {/* Live Battles */}
        <LiveBattleFeed />

        {/* Quick Access Links */}
        <div className="border-t pt-8">
          <h3 className="text-xl font-bold mb-6">Quick Access</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
