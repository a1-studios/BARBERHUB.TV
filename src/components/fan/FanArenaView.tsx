import { useNavigate } from 'react-router-dom';
import { DynamicBattleHero } from '@/components/DynamicBattleHero';
import { LiveBattleFeed } from '@/components/LiveBattleFeed';
import { GlobalLeagueDashboard } from '@/components/GlobalLeagueDashboard';
import { ArenaTicker } from '@/components/factions/ArenaTicker';
import { useCategoryPrizePools } from '@/hooks/useCategoryPrizePools';
import { LiveNowBanner } from '@/components/battles/LiveNowBanner';
import { LiveBarberStreams } from '@/components/battles/LiveBarberStreams';

export const FanArenaView = () => {
  const navigate = useNavigate();
  const { prizePools } = useCategoryPrizePools();

  return (
    <main className="space-y-4 pb-24">
      {/* Featured Battle Hero */}
      <DynamicBattleHero />

      {/* Live Now — followed barber avatars */}
      <LiveNowBanner />

      {/* Live Streams — full cards with engagement */}
      <LiveBarberStreams />

      {/* Grand Prize Banner — below the video feed */}
      <section className="px-3 sm:px-6">
        <ArenaTicker
          prizePools={prizePools}
          isBarber={false}
          onNavigate={(path) => navigate(path)}
        />
      </section>

      {/* Live Battle Feed — the core fan experience */}
      <section className="px-3 sm:px-6">
        <h2 className="text-lg font-bold text-foreground mb-3">
          🔥 Live Battles
        </h2>
        <LiveBattleFeed />
      </section>

      {/* Global League */}
      <section className="px-3 sm:px-6">
        <GlobalLeagueDashboard />
      </section>
    </main>
  );
};
