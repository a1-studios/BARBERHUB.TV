import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DynamicBattleHero } from '@/components/DynamicBattleHero';
import { LiveBattleFeed } from '@/components/LiveBattleFeed';
import { BBWalletWidget } from '@/components/economy/BBWalletWidget';
import { GlobalLeagueDashboard } from '@/components/GlobalLeagueDashboard';
import { ArenaTicker } from '@/components/factions/ArenaTicker';
import { AddFundsModal } from '@/components/AddFundsModal';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCategoryPrizePools } from '@/hooks/useCategoryPrizePools';
import { Trophy } from 'lucide-react';

export const FanArenaView = () => {
  const navigate = useNavigate();
  const [showAddFunds, setShowAddFunds] = useState(false);
  const { barberBucks } = useBarberBucks();
  const { profile } = useUserProfile();
  const { prizePools } = useCategoryPrizePools();

  return (
    <main className="space-y-4 pb-24">
      {/* Grand Prize Banner */}
      <section className="px-3 sm:px-6">
        <ArenaTicker
          prizePools={prizePools}
          isBarber={false}
          onNavigate={(path) => navigate(path)}
        />
      </section>

      {/* Featured Battle Hero */}
      <DynamicBattleHero />

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
