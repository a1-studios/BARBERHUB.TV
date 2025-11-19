import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Sparkles, Star, Zap, ArrowRight } from 'lucide-react';
import { BarberSubscriptionTiers } from './BarberSubscriptionTiers';
import { useState } from 'react';

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
    title: 'Battle Limit Reached',
    description: 'Upgrade to create more battles this month',
    benefit: 'Get 10+ battles per month with Silver or unlimited with Gold'
  },
  premium_feature: {
    icon: Crown,
    title: 'Premium Feature',
    description: 'This feature requires a subscription',
    benefit: 'Unlock premium gear and exclusive features'
  },
  recurring_challenge: {
    icon: Star,
    title: 'Recurring Challenges',
    description: 'Create recurring challenges with Silver+',
    benefit: 'Automatically schedule weekly battles'
  },
  general: {
    icon: Sparkles,
    title: 'Upgrade Your Experience',
    description: 'Get more out of Barber Hub',
    benefit: 'Access all features and create unlimited battles'
  }
};

export const UpgradePrompt = ({ 
  isOpen, 
  onClose, 
  reason,
  title: customTitle,
  description: customDescription
}: UpgradePromptProps) => {
  const [showTiers, setShowTiers] = useState(false);
  
  const config = REASON_CONFIG[reason];
  const Icon = config.icon;
  
  const displayTitle = customTitle || config.title;
  const displayDescription = customDescription || config.description;

  if (showTiers) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose Your Plan</DialogTitle>
            <DialogDescription>
              Select the subscription tier that fits your needs
            </DialogDescription>
          </DialogHeader>
          <BarberSubscriptionTiers />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
              <Icon className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            {displayTitle}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {displayDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Key Benefit */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 mt-1">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">
                    {config.benefit}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Plus 3x vote power, premium badge, and priority support
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tier Quick Preview */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardContent className="p-3 text-center">
                <Star className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <p className="text-xs font-semibold text-foreground">Bronze</p>
                <p className="text-xs text-muted-foreground">3 battles/mo</p>
              </CardContent>
            </Card>
            <Card className="border-slate-400/30 bg-slate-400/5">
              <CardContent className="p-3 text-center">
                <Sparkles className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-foreground">Silver</p>
                <p className="text-xs text-muted-foreground">10 battles/mo</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-3 text-center">
                <Crown className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-xs font-semibold text-foreground">Gold</p>
                <p className="text-xs text-muted-foreground">Unlimited</p>
              </CardContent>
            </Card>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button 
              onClick={() => setShowTiers(true)}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80"
            >
              View Plans
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
