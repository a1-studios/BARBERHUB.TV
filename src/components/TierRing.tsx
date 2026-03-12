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
  showGhostPreview?: boolean;
  children: ReactNode;
  className?: string;
}

const SIZE_MAP = {
  sm: { container: 'w-14 h-14', padding: 'p-[3px]', svgSize: 68, strokeWidth: 5 },
  md: { container: 'w-24 h-24', padding: 'p-[4px]', svgSize: 108, strokeWidth: 6 },
  lg: { container: 'w-36 h-36', padding: 'p-[5px]', svgSize: 158, strokeWidth: 7 },
};

function GhostRankRing({ svgSize, strokeWidth }: { svgSize: number; strokeWidth: number }) {
  const center = svgSize / 2;
  const r = (svgSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const arcLen = circumference / 3;
  const gap = 8;

  const arcs = [
    { color: 'hsl(24, 100%, 52%)', opacity: 0.4, rotation: 0, className: 'animate-tier-ghost-bronze', filterId: 'ghost-bronze' },
    { color: 'hsl(210, 20%, 80%)', opacity: 0.35, rotation: 120, className: 'animate-tier-ghost-silver', filterId: 'ghost-silver' },
    { color: 'hsl(45, 100%, 55%)', opacity: 0.3, rotation: 240, className: 'animate-tier-ghost-gold', filterId: 'ghost-gold' },
  ];

  return (
    <svg
      width={svgSize}
      height={svgSize}
      className="absolute inset-0 m-auto pointer-events-none"
      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
    >
      <defs>
        <filter id="ghost-bronze"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="ghost-silver"><feGaussianBlur stdDeviation="2.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="ghost-gold"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={arc.opacity}
          className={arc.className}
          filter={`url(#${arc.filterId})`}
          strokeDasharray={`${arcLen - gap} ${circumference - arcLen + gap}`}
          strokeDashoffset={-(arc.rotation / 360) * circumference}
          style={{ transformOrigin: 'center' }}
        />
      ))}
    </svg>
  );
}

export const TierRing = ({ tier, size = 'md', interactive = false, showGhostPreview = true, children, className }: TierRingProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const { barberBucks, isLoading: bbLoading } = useBarberBucks();

  const tierKey = (tier?.toLowerCase() || 'free') as 'free' | 'bronze' | 'silver' | 'gold';
  const sizeConfig = SIZE_MAP[size];

  const handleClick = () => {
    if (interactive && tierKey !== 'free') return;
    if (interactive) setDrawerOpen(true);
  };

  const handleShowAddFunds = () => {
    setDrawerOpen(false);
    setShowAddFunds(true);
  };

  const isFree = tierKey === 'free';
  const showGhost = isFree && showGhostPreview;

  // Border + glow styles per tier
  const tierBorderClass = cn(
    'absolute inset-0 rounded-full',
    tierKey === 'free' && !showGhost && 'border-2 border-border/50',
    tierKey === 'bronze' && 'border-[3px] border-orange-500 animate-tier-glow-bronze',
    tierKey === 'silver' && 'border-[3.5px] border-slate-300 animate-tier-glow-silver',
    tierKey === 'gold' && 'border-[4px] border-yellow-400 animate-tier-glow-gold',
  );

  return (
    <>
      <div
        className={cn(
          'relative inline-flex items-center justify-center rounded-full',
          sizeConfig.padding,
          interactive && 'cursor-pointer',
          className
        )}
        onClick={handleClick}
      >
        {/* Ghost 3-segment rank ring for free tier */}
        {showGhost && (
          <GhostRankRing svgSize={sizeConfig.svgSize} strokeWidth={sizeConfig.strokeWidth} />
        )}

        {/* Active tier border frame */}
        {!isFree && <div className={tierBorderClass} />}

        {/* Shimmer sweep for silver/gold */}
        {(tierKey === 'silver' || tierKey === 'gold') && (
          <div className="absolute inset-0 rounded-full animate-tier-shimmer overflow-hidden pointer-events-none">
            <div className={cn(
              'absolute inset-0 rounded-full',
              tierKey === 'silver' && 'bg-gradient-conic from-transparent via-slate-200/25 to-transparent',
              tierKey === 'gold' && 'bg-gradient-conic from-transparent via-yellow-300/35 to-transparent',
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
