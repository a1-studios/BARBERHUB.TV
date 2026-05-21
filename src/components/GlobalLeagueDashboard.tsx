import { useState } from 'react';
import { LiveBattleFeed } from '@/components/LiveBattleFeed';
import { BarberMapDirectory } from '@/components/map/BarberMapDirectory';
import { BarberLocationSearch } from '@/components/map/BarberLocationSearch';

export const GlobalLeagueDashboard = () => {
  const [location, setLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Real geo search — drives the home map */}
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-3">
          <BarberLocationSearch
            onLocationFound={(lat, lng, label) => setLocation({ lat, lng, label })}
            onClear={() => setLocation(null)}
            activeLabel={location?.label ?? null}
            compact
          />
        </div>

        {/* Real Mapbox map (hero variant) — replaces the decorative sphere */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-2 rounded-3xl"
            style={{
              background:
                'radial-gradient(circle at 30% 20%, hsl(24 100% 52% / 0.18), transparent 60%), radial-gradient(circle at 70% 80%, hsl(187 100% 50% / 0.15), transparent 60%)',
              filter: 'blur(20px)',
            }}
          />
          <div className="relative">
            <BarberMapDirectory
              variant="hero"
              externalLocation={location}
              autoLocate
              heightClass="h-[60vh] min-h-[420px]"
            />
          </div>
        </div>

        {/* Live Battles */}
        <LiveBattleFeed />
      </div>
    </div>
  );
};
