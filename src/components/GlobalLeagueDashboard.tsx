import { useNavigate } from 'react-router-dom';
import { Compass, MapPin, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BattleWindowTimer } from '@/components/BattleWindowTimer';
import { PrizePoolCard } from '@/components/PrizePoolCard';
import { LiveBattleFeed } from '@/components/LiveBattleFeed';
import { FanActionZone } from '@/components/FanActionZone';
import SphereImageGrid, { ImageData } from '@/components/SphereImageGrid';

// Mock contender data - easily replaceable with real data
const MOCK_CONTENDERS: ImageData[] = [
  { id: '1', src: 'https://i.pravatar.cc/300?img=12', alt: 'Marcus Silva', title: 'Marcus Silva', description: 'From Brazil' },
  { id: '2', src: 'https://i.pravatar.cc/300?img=13', alt: 'Ahmed Hassan', title: 'Ahmed Hassan', description: 'From Egypt' },
  { id: '3', src: 'https://i.pravatar.cc/300?img=14', alt: 'Yuki Tanaka', title: 'Yuki Tanaka', description: 'From Japan' },
  { id: '4', src: 'https://i.pravatar.cc/300?img=15', alt: 'Pierre Dubois', title: 'Pierre Dubois', description: 'From France' },
  { id: '5', src: 'https://i.pravatar.cc/300?img=33', alt: 'Carlos Rodriguez', title: 'Carlos Rodriguez', description: 'From Spain' },
  { id: '6', src: 'https://i.pravatar.cc/300?img=51', alt: 'James Wilson', title: 'James Wilson', description: 'From UK' },
  { id: '7', src: 'https://i.pravatar.cc/300?img=52', alt: 'Andre Johnson', title: 'Andre Johnson', description: 'From USA' },
  { id: '8', src: 'https://i.pravatar.cc/300?img=53', alt: 'Luigi Rossi', title: 'Luigi Rossi', description: 'From Italy' },
  { id: '9', src: 'https://i.pravatar.cc/300?img=54', alt: 'Hans Mueller', title: 'Hans Mueller', description: 'From Germany' },
  { id: '10', src: 'https://i.pravatar.cc/300?img=56', alt: 'Ivan Petrov', title: 'Ivan Petrov', description: 'From Russia' },
  { id: '11', src: 'https://i.pravatar.cc/300?img=57', alt: 'Miguel Santos', title: 'Miguel Santos', description: 'From Portugal' },
  { id: '12', src: 'https://i.pravatar.cc/300?img=59', alt: 'Zhang Wei', title: 'Zhang Wei', description: 'From China' },
  { id: '13', src: 'https://i.pravatar.cc/300?img=60', alt: 'Park Jin', title: 'Park Jin', description: 'From South Korea' },
  { id: '14', src: 'https://i.pravatar.cc/300?img=61', alt: 'Omar Ali', title: 'Omar Ali', description: 'From UAE' },
  { id: '15', src: 'https://i.pravatar.cc/300?img=62', alt: 'Raj Patel', title: 'Raj Patel', description: 'From India' },
  { id: '16', src: 'https://i.pravatar.cc/300?img=63', alt: 'David Cohen', title: 'David Cohen', description: 'From Israel' },
  { id: '17', src: 'https://i.pravatar.cc/300?img=64', alt: 'Jamal Brown', title: 'Jamal Brown', description: 'From Jamaica' },
  { id: '18', src: 'https://i.pravatar.cc/300?img=65', alt: 'Stefan Novak', title: 'Stefan Novak', description: 'From Poland' },
  { id: '19', src: 'https://i.pravatar.cc/300?img=66', alt: 'Dimitri Popov', title: 'Dimitri Popov', description: 'From Ukraine' },
  { id: '20', src: 'https://i.pravatar.cc/300?img=67', alt: 'Lars Eriksson', title: 'Lars Eriksson', description: 'From Sweden' },
  { id: '21', src: 'https://i.pravatar.cc/300?img=68', alt: 'Mateo Garcia', title: 'Mateo Garcia', description: 'From Mexico' },
  { id: '22', src: 'https://i.pravatar.cc/300?img=69', alt: 'Anton Ivanov', title: 'Anton Ivanov', description: 'From Bulgaria' },
  { id: '23', src: 'https://i.pravatar.cc/300?img=11', alt: 'Liam Murphy', title: 'Liam Murphy', description: 'From Ireland' },
  { id: '24', src: 'https://i.pravatar.cc/300?img=17', alt: 'Nikos Papadopoulos', title: 'Nikos Papadopoulos', description: 'From Greece' },
  { id: '25', src: 'https://i.pravatar.cc/300?img=18', alt: 'Felix van der Berg', title: 'Felix van der Berg', description: 'From Netherlands' },
];

export const GlobalLeagueDashboard = () => {
  const navigate = useNavigate();

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
              🌍 Barbers from 25+ countries competing for glory
            </p>
            <p className="text-sm text-muted-foreground/70">
              Drag to rotate • Click to view profiles
            </p>
          </div>
          
          <div className="flex justify-center py-8">
            <SphereImageGrid
              images={MOCK_CONTENDERS}
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
