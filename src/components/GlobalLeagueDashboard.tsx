import { useNavigate } from 'react-router-dom';
import { Compass, MapPin, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BattleWindowTimer } from '@/components/BattleWindowTimer';
import { PrizePoolCard } from '@/components/PrizePoolCard';
import { LiveBattleFeed } from '@/components/LiveBattleFeed';
import { FanActionZone } from '@/components/FanActionZone';

export const GlobalLeagueDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Prize Pool Feature Card */}
        <PrizePoolCard />

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
