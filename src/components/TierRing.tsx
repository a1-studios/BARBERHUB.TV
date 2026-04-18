import { useState, ReactNode } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { BarberSubscriptionTiers } from '@/components/barber/BarberSubscriptionTiers';
import { AddFundsModal } from '@/components/AddFundsModal';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { useTiersEnabled } from '@/hooks/useTiersEnabled';
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
  sm: { gap: 'p-[3px]' },
  md: { gap: 'p-[4px]' },
  lg: { gap: 'p-[5px]' },
};

/* Each tier has a unique border + glow combo */
const TIER_BORDER = {
  free: 'border-2 border-border/40',
  bronze: 'border-[3px] border-orange-500 animate-tier-glow-bronze',
  silver: 'border-[3px] border-slate-300 animate-tier-glow-silver',
  gold: 'border-4 border-yellow-400 animate-tier-glow-gold',
  diamond: 'border-4 border-cyan-300 animate-tier-glow-diamond',
} as const;

export const TierRing = ({ tier, size = 'md', interactive = false, children, className }: TierRingProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const { barberBucks, isLoading: bbLoading } = useBarberBucks();
  const { enabled: tiersEnabled } = useTiersEnabled();

  const tierKey = (tier?.toLowerCase() || 'free') as keyof typeof TIER_BORDER;
  const validTier = TIER_BORDER[tierKey] ? tierKey : 'free';
  const sizeConfig = SIZE_MAP[size];

  // Master tier toggle OFF → render avatar with no ring/glow/upgrade drawer
  if (!tiersEnabled) {
    return (
      <div className={cn('relative inline-flex items-center justify-center rounded-full overflow-hidden', className)}>
        {children}
      </div>
    );
  }

  const handleClick = () => {
    if (interactive) setDrawerOpen(true);
  };

  const handleShowAddFunds = () => {
    setDrawerOpen(false);
    setShowAddFunds(true);
  };

  return (
    <>
      {/* Outer ring = border + glow, inner padding separates from avatar */}
      <div
        className={cn(
          'relative inline-flex items-center justify-center rounded-full',
          TIER_BORDER[validTier],
          sizeConfig.gap,
          interactive && 'cursor-pointer',
          className
        )}
        onClick={handleClick}
      >
        {/* Shimmer sweep overlay for silver/gold */}
        {(validTier === 'silver' || validTier === 'gold' || validTier === 'diamond') && (
          <div className="absolute inset-[-1px] rounded-full animate-tier-shimmer overflow-hidden pointer-events-none z-0">
            <div className={cn(
              'absolute inset-0 rounded-full',
              validTier === 'silver' && 'bg-gradient-conic from-transparent via-slate-200/30 to-transparent',
              validTier === 'gold' && 'bg-gradient-conic from-transparent via-yellow-300/40 to-transparent',
              validTier === 'diamond' && 'bg-gradient-conic from-transparent via-cyan-300/50 to-transparent',
            )} />
          </div>
        )}

        {/* Avatar */}
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
