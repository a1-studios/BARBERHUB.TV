import { useState, ReactNode } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { BarberSubscriptionTiers } from '@/components/barber/BarberSubscriptionTiers';
import { AddFundsModal } from '@/components/AddFundsModal';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TierRingProps {
  tier: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  children: ReactNode;
  className?: string;
}

const TIER_STYLES = {
  free: {
    ring: 'border-border/50',
    glow: '',
    leds: 0,
    animation: '',
  },
  bronze: {
    ring: 'border-orange-500/70',
    glow: 'tier-ring-bronze',
    leds: 2,
    animation: 'animate-tier-glow-bronze',
  },
  silver: {
    ring: 'border-slate-300/70',
    glow: 'tier-ring-silver',
    leds: 4,
    animation: 'animate-tier-glow-silver',
  },
  gold: {
    ring: 'border-yellow-400/80',
    glow: 'tier-ring-gold',
    leds: 6,
    animation: 'animate-tier-glow-gold',
  },
};

const SIZE_MAP = {
  sm: { container: 'w-14 h-14', padding: 2, ledSize: 'w-1.5 h-1.5', radius: 28 },
  md: { container: 'w-24 h-24', padding: 3, ledSize: 'w-2 h-2', radius: 48 },
  lg: { container: 'w-36 h-36', padding: 4, ledSize: 'w-2.5 h-2.5', radius: 72 },
};

export const TierRing = ({ tier, size = 'md', interactive = false, children, className }: TierRingProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const { barberBucks, isLoading: bbLoading } = useBarberBucks();

  const tierKey = (tier?.toLowerCase() || 'free') as keyof typeof TIER_STYLES;
  const config = TIER_STYLES[tierKey] || TIER_STYLES.free;
  const sizeConfig = SIZE_MAP[size];

  const handleClick = () => {
    if (interactive && tierKey !== 'free') return; // already subscribed, no drawer
    if (interactive) setDrawerOpen(true);
  };

  const handleShowAddFunds = () => {
    setDrawerOpen(false);
    setShowAddFunds(true);
  };

  // Generate LED dot positions around the circle
  const ledDots = [];
  for (let i = 0; i < config.leds; i++) {
    const angle = (360 / config.leds) * i;
    ledDots.push(angle);
  }

  const isFree = tierKey === 'free';

  return (
    <>
      <div
        className={cn(
          'relative inline-flex items-center justify-center rounded-full',
          interactive && 'cursor-pointer',
          className
        )}
        onClick={handleClick}
      >
        {/* Outer glow ring */}
        {!isFree && (
          <div
            className={cn(
              'absolute inset-[-3px] rounded-full border-2',
              config.ring,
              config.animation
            )}
          />
        )}

        {/* LED orbit container */}
        {!isFree && config.leds > 0 && (
          <div className="absolute inset-[-5px] rounded-full animate-tier-orbit">
            {ledDots.map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const r = sizeConfig.radius + 2;
              const x = Math.cos(rad) * r;
              const y = Math.sin(rad) * r;
              return (
                <div
                  key={i}
                  className={cn(
                    'absolute rounded-full',
                    sizeConfig.ledSize,
                    tierKey === 'bronze' && 'bg-orange-400 shadow-[0_0_6px_hsl(24_100%_52%/0.8)]',
                    tierKey === 'silver' && 'bg-slate-200 shadow-[0_0_6px_hsl(210_20%_80%/0.8)]',
                    tierKey === 'gold' && 'bg-yellow-300 shadow-[0_0_8px_hsl(45_100%_60%/0.9)]',
                  )}
                  style={{
                    left: `calc(50% + ${x}px - ${size === 'sm' ? 3 : size === 'md' ? 4 : 5}px)`,
                    top: `calc(50% + ${y}px - ${size === 'sm' ? 3 : size === 'md' ? 4 : 5}px)`,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Shimmer overlay for silver/gold */}
        {(tierKey === 'silver' || tierKey === 'gold') && (
          <div className="absolute inset-[-3px] rounded-full animate-tier-shimmer overflow-hidden pointer-events-none">
            <div className={cn(
              'absolute inset-0 rounded-full',
              tierKey === 'silver' && 'bg-gradient-conic from-transparent via-slate-200/20 to-transparent',
              tierKey === 'gold' && 'bg-gradient-conic from-transparent via-yellow-300/30 to-transparent',
            )} />
          </div>
        )}

        {/* Avatar container */}
        <div className="relative z-10 rounded-full overflow-hidden">
          {children}
        </div>
      </div>

      {/* Membership Plans Drawer */}
      {interactive && (
        <>
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader className="text-center pb-2">
                <DrawerTitle className="text-xl font-bold">Membership Plans</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6 overflow-y-auto">
                <div className="flex items-center justify-center gap-2 py-2 px-4 bg-muted/30 rounded-lg border border-border/30 mx-auto w-fit mb-4">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    Balance:{' '}
                    <span className="text-primary font-bold">
                      {bbLoading ? '...' : `${barberBucks} BB`}
                    </span>
                  </span>
                </div>
                <BarberSubscriptionTiers onShowAddFunds={handleShowAddFunds} />
              </div>
            </DrawerContent>
          </Drawer>
          <AddFundsModal isOpen={showAddFunds} onClose={() => setShowAddFunds(false)} />
        </>
      )}
    </>
  );
};
