import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, Star } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SubscriptionBadgeProps {
  tier: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const TIER_CONFIG = {
  bronze: {
    icon: Star,
    label: 'Bronze',
    className: 'bg-gradient-to-r from-orange-600 to-amber-700 text-white border-orange-500 hover:from-orange-500 hover:to-amber-600',
    benefits: ['3 battles/month', '3x vote power', 'Profile badge']
  },
  silver: {
    icon: Sparkles,
    label: 'Silver',
    className: 'bg-gradient-to-r from-slate-400 to-gray-500 text-white border-slate-300 hover:from-slate-300 hover:to-gray-400 shadow-lg shadow-slate-400/50',
    benefits: ['10 battles/month', '3x vote power', 'Premium badge', 'Priority support']
  },
  gold: {
    icon: Crown,
    label: 'Gold',
    className: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-yellow-400 hover:from-yellow-400 hover:to-amber-500 shadow-xl shadow-yellow-500/50 animate-pulse',
    benefits: ['Unlimited battles', '3x vote power', 'Elite badge', 'Premium gear access', 'VIP support']
  }
};

export const SubscriptionBadge = ({ tier, size = 'md', showTooltip = true }: SubscriptionBadgeProps) => {
  if (!tier) return null;
  
  const tierKey = tier.toLowerCase() as keyof typeof TIER_CONFIG;
  const config = TIER_CONFIG[tierKey];
  
  if (!config) return null;
  
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

  const badge = (
    <Badge 
      variant="outline"
      className={`${config.className} ${sizeClasses[size]} font-bold transition-all duration-300 cursor-default`}
    >
      <Icon className={`${iconSizes[size]} mr-1`} />
      {config.label}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-card border-border">
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{config.label} Tier Benefits</p>
            <ul className="text-sm text-muted-foreground space-y-0.5">
              {config.benefits.map((benefit, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="text-primary">•</span> {benefit}
                </li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
