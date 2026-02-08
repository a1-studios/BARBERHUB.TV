import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, Star, Shield, ArrowUpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarberSubscriptionTiers } from '@/components/barber/BarberSubscriptionTiers';

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
    benefits: ['2 battles/month', '1x vote power', 'Basic profile'],
    canUpgrade: true
  },
  bronze: {
    icon: Star,
    label: 'Bronze',
    className: 'bg-gradient-to-r from-orange-600 to-amber-700 text-white border-orange-500 hover:from-orange-500 hover:to-amber-600',
    benefits: ['3 battles/month', '3x vote power', 'Profile badge'],
    canUpgrade: true
  },
  silver: {
    icon: Sparkles,
    label: 'Silver',
    className: 'bg-gradient-to-r from-slate-400 to-gray-500 text-white border-slate-300 hover:from-slate-300 hover:to-gray-400 shadow-lg shadow-slate-400/50',
    benefits: ['10 battles/month', '3x vote power', 'Premium badge', 'Priority support'],
    canUpgrade: true
  },
  gold: {
    icon: Crown,
    label: 'Gold',
    className: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-yellow-400 hover:from-yellow-400 hover:to-amber-500 shadow-xl shadow-yellow-500/50 animate-pulse',
    benefits: ['Unlimited battles', '3x vote power', 'Elite badge', 'Premium gear access', 'VIP support'],
    canUpgrade: false
  }
};

export const SubscriptionBadge = ({ tier, size = 'md', showTooltip = true, interactive = false }: SubscriptionBadgeProps) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [pausedForFunds, setPausedForFunds] = useState(false);
  
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
    if (interactive && config.canUpgrade) {
      setShowUpgradeModal(true);
    }
  };

  const badge = (
    <Badge 
      variant="outline"
      className={`${config.className} ${sizeClasses[size]} font-bold transition-all duration-300 ${interactive && config.canUpgrade ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={handleClick}
    >
      <Icon className={`${iconSizes[size]} mr-1`} />
      {config.label}
      {interactive && config.canUpgrade && (
        <ArrowUpCircle className={`${iconSizes[size]} ml-1 opacity-60`} />
      )}
    </Badge>
  );

  return (
    <>
      {showTooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {badge}
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-card border-border">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">{config.label} Tier</p>
                <ul className="text-sm text-muted-foreground space-y-0.5">
                  {config.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span className="text-primary">•</span> {benefit}
                    </li>
                  ))}
                </ul>
                {interactive && config.canUpgrade && (
                  <p className="text-xs text-primary mt-1">Click to upgrade</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : badge}

      {interactive && (
        <Dialog open={showUpgradeModal && !pausedForFunds} onOpenChange={setShowUpgradeModal}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upgrade Your Subscription</DialogTitle>
            </DialogHeader>
            <BarberSubscriptionTiers onFundsModalStateChange={setPausedForFunds} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};