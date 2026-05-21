import { useMemo, useEffect, useState } from 'react';
import SphereImageGrid from '@/components/SphereImageGrid';
import { SphereHolographicWrapper } from '@/components/SphereHolographicWrapper';

interface SphereBarberInput {
  user_id: string;
  name: string;
  avatar_url: string | null;
  specialty: string | null;
  location: string | null;
  active_subscription_tier: string | null;
  distance_miles: number;
}

interface NearbySphereProps {
  barbers: SphereBarberInput[];
  loading?: boolean;
}

const FALLBACK = 'https://api.dicebear.com/7.x/initials/svg?seed=';

export function NearbySphere({ barbers, loading }: NearbySphereProps) {
  const [size, setSize] = useState(320);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setSize(w >= 1024 ? 480 : w >= 640 ? 400 : 320);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const images = useMemo(
    () =>
      barbers.map((b, i) => ({
        id: b.user_id,
        src: b.avatar_url || `${FALLBACK}${encodeURIComponent(b.name || 'B')}`,
        alt: b.name,
        title: b.name,
        description: b.specialty || b.location || `${b.distance_miles.toFixed(1)} mi away`,
        rank: i + 1,
        isChampion: i === 0,
        location: b.location || undefined,
      })),
    [barbers]
  );

  if (loading) {
    return (
      <div
        className="w-full rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent flex items-center justify-center"
        style={{ height: size }}
      >
        <div className="w-32 h-32 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!images.length) return null;

  return (
    <SphereHolographicWrapper>
      <div className="flex items-center justify-center py-2">
        <SphereImageGrid
          images={images}
          containerSize={size}
          autoRotate
          autoRotateSpeed={0.25}
          showChampionCrown
          championId={images[0]?.id}
        />
      </div>
    </SphereHolographicWrapper>
  );
}
