import { useNavigate } from 'react-router-dom';
import { DynamicBattleHero } from '@/components/DynamicBattleHero';
import { GlobalLeagueDashboard } from '@/components/GlobalLeagueDashboard';
import { ArenaTicker } from '@/components/factions/ArenaTicker';
import { useCategoryPrizePools } from '@/hooks/useCategoryPrizePools';
import { ProductShelf } from '@/components/ProductShelf';
import { LivesModal } from '@/components/battles/LivesModal';

export const FanArenaView = () => {
  const navigate = useNavigate();
  const { prizePools } = useCategoryPrizePools();

  return (
    <main className="space-y-4 pb-24">
      {/* Featured Battle Hero */}
      <DynamicBattleHero />

      {/* Lives — auto-opens as modal when a barber is live */}
      <LivesModal />

      {/* Official Gear Shelf */}
      <ProductShelf />

      {/* Grand Prize Banner — below the video feed */}
      <section className="px-3 sm:px-6">
        <ArenaTicker
          prizePools={prizePools}
          isBarber={false}
          onNavigate={(path) => navigate(path)}
        />
      </section>

      {/* Global League */}
      <section className="px-3 sm:px-6">
        <GlobalLeagueDashboard />
      </section>
    </main>
  );
};
