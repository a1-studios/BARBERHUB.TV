import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Coins, Zap, Crown, Star, Sparkles, HandCoins } from 'lucide-react';
import { BarberSubscriptionTiers } from './BarberSubscriptionTiers';
import { AddFundsModal } from '@/components/AddFundsModal';
import { UniversalBarterGateway } from '@/components/barter/UniversalBarterGateway';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { useUserRole } from '@/hooks/useUserRole';
import { useTiersEnabled } from '@/hooks/useTiersEnabled';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  reason: 'battle_limit' | 'premium_feature' | 'recurring_challenge' | 'general';
  title?: string;
  description?: string;
}

const REASON_CONFIG = {
  battle_limit: {
    icon: Zap,
    banner: 'Battle Limit Reached — upgrade for more battles',
  },
  premium_feature: {
    icon: Crown,
    banner: 'Premium Feature — upgrade to unlock',
  },
  recurring_challenge: {
    icon: Star,
    banner: 'Recurring Challenges — upgrade for access',
  },
  general: {
    icon: Sparkles,
    banner: 'Upgrade your experience',
  }
};

export const UpgradePrompt = ({
  isOpen,
  onClose,
  reason,
  title: customTitle,
  description: customDescription
}: UpgradePromptProps) => {
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [barterTierId, setBarterTierId] = useState<{ id: string; name: string; bbPrice: number } | null>(null);
  const { barberBucks, isLoading: bbLoading } = useBarberBucks();
  const { isBarber } = useUserRole();
  const { enabled: tiersEnabled } = useTiersEnabled();

  // Master tier toggle OFF → suppress upgrade prompts entirely
  if (!tiersEnabled) return null;

  const config = REASON_CONFIG[reason];
  const Icon = config.icon;
  const bannerText = customTitle || config.banner;

  const handleShowAddFunds = () => {
    onClose();
    setShowAddFunds(true);
  };

  const handleCloseAddFunds = () => {
    setShowAddFunds(false);
  };

  const handleBarterForTier = (tierId: string, tierName: string, bbPrice: number) => {
    setBarterTierId({ id: tierId, name: tierName, bbPrice });
  };

  return (
    <>
      <Drawer open={isOpen && !showAddFunds && !barterTierId} onOpenChange={onClose}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-center pb-2">
            <DrawerTitle className="text-xl font-bold">Membership Plans</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {/* Contextual banner */}
            <div className="flex items-center gap-2 py-2 px-4 bg-primary/10 rounded-lg border border-primary/20 mb-4">
              <Icon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground">{bannerText}</span>
            </div>

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

            <BarberSubscriptionTiers
              onShowAddFunds={handleShowAddFunds}
              onBarterForTier={isBarber ? handleBarterForTier : undefined}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <AddFundsModal isOpen={showAddFunds} onClose={handleCloseAddFunds} />

      {barterTierId && (
        <UniversalBarterGateway
          isOpen={!!barterTierId}
          perkCategory="subscription"
          perkDetails={{ tier_id: barterTierId.id }}
          requiredBBValue={barterTierId.bbPrice}
          onSuccess={() => {
            setBarterTierId(null);
            onClose();
          }}
          onCancel={() => setBarterTierId(null)}
        />
      )}
    </>
  );
};
