import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RankedNearbyBarber {
  user_id: string;
  barber_id: string;
  name: string | null;
  avatar_url: string | null;
  distance_miles: number;
  active_subscription_tier: string | null;
  score: number;
}

interface TopBarbersNearbyRailProps {
  barbers: RankedNearbyBarber[];
  loading?: boolean;
}

const tierRing: Record<string, string> = {
  diamond: 'ring-cyan-400',
  gold: 'ring-yellow-400',
  silver: 'ring-slate-300',
  bronze: 'ring-orange-500',
};

export function TopBarbersNearbyRail({ barbers, loading }: TopBarbersNearbyRailProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-primary/5 p-4">
        <div className="h-4 w-40 bg-primary/20 rounded animate-pulse mb-3" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shrink-0 w-20 h-24 bg-primary/10 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!barbers.length) return null;

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-primary/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Top Barbers Nearby</h2>
        <span className="text-[10px] text-muted-foreground ml-auto">Ranked by tier &amp; reputation</span>
      </div>

      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 scrollbar-hide">
        {barbers.map((b, idx) => {
          const tier = b.active_subscription_tier?.toLowerCase() || '';
          const ring = tierRing[tier] || 'ring-border';
          return (
            <button
              key={b.user_id}
              onClick={() => navigate(`/barber/${b.user_id}`)}
              className="shrink-0 snap-start w-[88px] flex flex-col items-center text-center group"
            >
              <div className="relative">
                <span
                  className={cn(
                    'absolute -top-1 -left-1 z-10 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow',
                    idx === 0
                      ? 'bg-yellow-400 text-black'
                      : idx === 1
                        ? 'bg-slate-300 text-black'
                        : idx === 2
                          ? 'bg-orange-500 text-white'
                          : 'bg-muted text-foreground'
                  )}
                >
                  {idx + 1}
                </span>
                <Avatar className={cn('w-16 h-16 ring-2 ring-offset-2 ring-offset-background', ring)}>
                  <AvatarImage src={b.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {(b.name || 'B').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="mt-1.5 text-[11px] font-semibold text-foreground truncate w-full">
                {b.name || 'Barber'}
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5" />
                {b.distance_miles.toFixed(1)} mi
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
