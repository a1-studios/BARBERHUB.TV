import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TierRing } from '@/components/TierRing';
import { MapPin, Scissors } from 'lucide-react';

interface NearbyBarberCardProps {
  user_id: string;
  name: string;
  avatar_url: string | null;
  specialty: string | null;
  location: string | null;
  distance_miles: number;
  active_subscription_tier: string | null;
  country_code?: string | null;
  onHover?: () => void;
  onLeave?: () => void;
}

const countryFlag = (code?: string | null) => {
  if (!code) return '';
  try {
    return String.fromCodePoint(
      ...code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0))
    );
  } catch {
    return '';
  }
};

const tierGlow = (tier: string | null) => {
  switch (tier) {
    case 'diamond':
      return 'hsla(200,80%,75%,0.55)';
    case 'gold':
      return 'hsla(45,100%,55%,0.55)';
    case 'silver':
      return 'hsla(210,20%,80%,0.45)';
    default:
      return 'hsla(25,95%,53%,0.4)';
  }
};

export function NearbyBarberCard({
  user_id,
  name,
  avatar_url,
  specialty,
  location,
  distance_miles,
  active_subscription_tier,
  country_code,
  onHover,
  onLeave,
}: NearbyBarberCardProps) {
  return (
    <Link
      to={`/barber/${user_id}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="group flex-shrink-0 w-full h-full flex flex-col rounded-2xl p-3 relative overflow-hidden transition-transform active:scale-[0.98] hover:-translate-y-1"
      style={{
        background:
          'linear-gradient(155deg, hsl(240 10% 5% / 0.95) 0%, hsl(240 12% 8% / 0.9) 100%)',
        border: '1px solid hsla(25,95%,53%,0.3)',
        boxShadow: `0 6px 24px ${tierGlow(active_subscription_tier)}, inset 0 1px 0 hsla(255,255,255,0.04)`,
      }}
    >
      {/* Top-right distance pill (Zion Blue) */}
      <div
        className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
        style={{
          background: 'hsla(187,80%,60%,0.15)',
          color: 'hsl(187, 90%, 70%)',
          border: '1px solid hsla(187,80%,60%,0.4)',
        }}
      >
        <MapPin className="h-2.5 w-2.5" />
        {distance_miles.toFixed(1)} mi
      </div>

      <div className="flex items-start gap-3">
        <TierRing tier={active_subscription_tier} size="md">
          <Avatar className="w-14 h-14">
            <AvatarImage src={avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </TierRing>

        <div className="flex-1 min-w-0 pt-1 pr-12">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-sm font-bold text-white truncate">{name}</span>
            {country_code && <span className="text-xs shrink-0">{countryFlag(country_code)}</span>}
          </div>
          {specialty && (
            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-primary/90 truncate">
              <Scissors className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{specialty}</span>
            </div>
          )}
          {active_subscription_tier && (
            <Badge
              variant="outline"
              className="mt-1 h-4 px-1.5 text-[9px] uppercase tracking-wider border-primary/40 text-primary bg-primary/5"
            >
              {active_subscription_tier}
            </Badge>
          )}
        </div>
      </div>

      {location && (
        <div className="mt-2 text-[10px] text-muted-foreground truncate flex items-center gap-1">
          <MapPin className="h-2.5 w-2.5 shrink-0" />
          {location}
        </div>
      )}

      <Button
        size="sm"
        className="w-full mt-auto pt-2 h-7 text-[11px] font-bold"
        style={{
          background: 'linear-gradient(90deg, hsl(25 95% 53%) 0%, hsl(25 95% 60%) 100%)',
          color: 'hsl(0 0% 100%)',
          boxShadow: '0 2px 12px hsla(25,95%,53%,0.4)',
        }}
      >
        View Profile
      </Button>
    </Link>
  );
}
