import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, Star, Shield, Coins } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarberSubscriptionTiers } from '@/components/barber/BarberSubscriptionTiers';
import { AddFundsModal } from '@/components/AddFundsModal';
import { useBarberBucks } from '@/hooks/useBarberBucks';

interface SubscriptionBadgeProps {
  tier: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  interactive?: boolean;
}

const TIER_CONFIG = {
  free: {
    icon: Shield,
    label: 'Free',
    className: 'bg-muted/60 text-muted-foreground border-border/50 hover:bg-muted',
  },
  bronze: {
    icon: Star,
    label: 'Bronze',
    className: 'bg-gradient-to-r from-orange-600 to-amber-700 text-white border-orange-500 hover:from-orange-500 hover:to-amber-600',
  },
  silver: {
    icon: Sparkles,
    label: 'Silver',
    className: 'bg-gradient-to-r from-slate-400 to-gray-500 text-white border-slate-300 hover:from-slate-300 hover:to-gray-400 shadow-lg shadow-slate-400/50',
  },
  gold: {
    icon: Crown,
    label: 'Gold',
    className: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-yellow-400 hover:from-yellow-400 hover:to-amber-500 shadow-xl shadow-yellow-500/50 animate-pulse',
  }
};

export const SubscriptionBadge = ({ tier, size = 'md', interactive = false }: SubscriptionBadgeProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const { barberBucks, isLoading: bbLoading } = useBarberBucks();

  const tierKey = (tier?.toLowerCase() || 'free') as keyof typeof TIER_CONFIG;
  const config = TIER_CONFIG[tierKey] || TIER_CONFIG.free;

  const Icon = config.icon;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const handleClick = () => {
    if (interactive) {
      setDrawerOpen(true);
    }
  };

  const handleShowAddFunds = () => {
    setDrawerOpen(false);
    setShowAddFunds(true);
  };

  const handleCloseAddFunds = () => {
    setShowAddFunds(false);
  };

  return (
    <>
      <Badge
        variant="outline"
        className={`${config.className} ${sizeClasses[size]} font-bold transition-all duration-300 ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={handleClick}
      >
        <Icon className={`${iconSizes[size]} mr-1`} />
        {config.label}
      </Badge>

      {interactive && (
        <>
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader className="text-center pb-2">
                <DrawerTitle className="text-xl font-bold">Membership Plans</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6 overflow-y-auto">
                {/* Balance indicator */}
                <div className="flex items-center justify-center gap-2 py-2 px-4 bg-muted/30 rounded-lg border border-border/30 mx-auto w-fit mb-4">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    Balance:{" "}
                    <span className="text-primary font-bold">
                      {bbLoading ? "..." : `${barberBucks} BB`}
                    </span>
                  </span>
                </div>
                <BarberSubscriptionTiers onShowAddFunds={handleShowAddFunds} />
              </div>
            </DrawerContent>
          </Drawer>

          <AddFundsModal isOpen={showAddFunds} onClose={handleCloseAddFunds} />
        </>
      )}
    </>
  );
};
