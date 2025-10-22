import { useNavigate } from 'react-router-dom';
import { Compass, MapPin, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BattleWindowTimer } from '@/components/BattleWindowTimer';
import { PrizePoolCard } from '@/components/PrizePoolCard';
import { LiveBattleFeed } from '@/components/LiveBattleFeed';
import { FanActionZone } from '@/components/FanActionZone';
import SphereImageGrid, { ImageData } from '@/components/SphereImageGrid';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

export const GlobalLeagueDashboard = () => {
  const navigate = useNavigate();
  const [contenderImages, setContenderImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContenders = async () => {
      try {
        const { data, error } = await supabase
          .from('barber_profiles')
          .select(`
            id,
            user_id,
            shop_name,
            shop_country,
            profiles!inner(
              full_name,
              avatar_url
            )
          `)
          .not('profiles.avatar_url', 'is', null)
          .limit(30);

        if (error) throw error;

        const images: ImageData[] = (data || []).map((barber: any) => ({
          id: barber.id,
          src: barber.profiles.avatar_url,
          alt: barber.profiles.full_name || barber.shop_name || 'Barber',
          title: barber.profiles.full_name || barber.shop_name,
          description: barber.shop_country ? `From ${barber.shop_country}` : 'Global Contender'
        }));

        setContenderImages(images);
      } catch (error) {
        console.error('Error fetching contenders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContenders();
  }, []);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Prize Pool Feature Card */}
        <PrizePoolCard />

        {/* Global Contenders Sphere */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              Global Contenders
            </h2>
            <p className="text-muted-foreground">
              Barbers from around the world competing for glory
            </p>
          </div>
          
          <div className="flex justify-center">
            {loading ? (
              <div className="w-[600px] h-[600px] flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading contenders...</div>
              </div>
            ) : (
              <SphereImageGrid
                images={contenderImages}
                containerSize={600}
                sphereRadius={250}
                autoRotate={true}
                autoRotateSpeed={0.2}
                dragSensitivity={0.6}
                baseImageScale={0.12}
                className="mx-auto"
              />
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
