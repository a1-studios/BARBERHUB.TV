import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Crown, Zap, Star, ArrowUpCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { BarberSubscriptionTiers } from './BarberSubscriptionTiers';
import { useState } from 'react';

const TIER_LIMITS = {
  'free': { battles: 2, icon: Star, color: 'text-gray-400' },
  'bronze': { battles: 4, icon: Star, color: 'text-orange-600' },
  'silver': { battles: 8, icon: Zap, color: 'text-gray-400' },
  'gold': { battles: 16, icon: Crown, color: 'text-yellow-500' },
  'diamond': { battles: 9999, icon: Crown, color: 'text-blue-500' }
};

export const SubscriptionStatusCard = () => {
  const { user } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { data: subscription } = useQuery({
    queryKey: ['barberSubscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('barber_subscriptions')
        .select(`
          *,
          tier:barber_subscription_tiers(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: barberProfile } = useQuery({
    queryKey: ['barberProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('battles_created_this_month, last_battle_reset')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const tierName = subscription?.tier?.tier_name || 'free';
  const tierInfo = TIER_LIMITS[tierName as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;
  const TierIcon = tierInfo.icon;
  const battlesUsed = barberProfile?.battles_created_this_month || 0;
  const battlesLimit = tierInfo.battles;
  const battlesRemaining = Math.max(0, battlesLimit - battlesUsed);
  const usagePercentage = Math.min(100, (battlesUsed / battlesLimit) * 100);
  const isUnlimited = battlesLimit >= 9999;

  return (
    <>
      <Card className="card-gradient border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TierIcon className={`h-5 w-5 ${tierInfo.color}`} />
              <span className="text-primary">SUBSCRIPTION</span>
            </div>
            {tierName !== 'diamond' && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setShowUpgradeModal(true)}
                className="text-primary hover:bg-primary/10"
              >
                <ArrowUpCircle className="h-4 w-4 mr-1" />
                Upgrade
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <Badge 
              variant="secondary" 
              className={`${tierInfo.color} bg-primary/10 border-primary/30 uppercase text-sm px-4 py-1`}
            >
              {tierName} Tier
            </Badge>
            {subscription?.current_period_end && (
              <p className="text-xs text-muted-foreground">
                {subscription.cancel_at_period_end ? 'Expires' : 'Renews'} on {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Monthly Battles</span>
              <span className="font-semibold text-foreground">
                {isUnlimited ? 'Unlimited' : `${battlesUsed} / ${battlesLimit}`}
              </span>
            </div>
            {!isUnlimited && (
              <Progress value={usagePercentage} className="h-2" />
            )}
            <p className="text-xs text-center text-muted-foreground">
              {isUnlimited ? (
                <span className="text-primary">Create unlimited battles!</span>
              ) : battlesRemaining > 0 ? (
                `${battlesRemaining} battle${battlesRemaining !== 1 ? 's' : ''} remaining this month`
              ) : (
                <span className="text-destructive">Limit reached. Upgrade to create more battles.</span>
              )}
            </p>
          </div>

          <div className="space-y-1 pt-2 border-t border-border/50">
            <p className="text-xs font-semibold text-foreground mb-2">Your Benefits:</p>
            <div className="space-y-1">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-primary mt-0.5">✓</span>
                <span>3x voting power in all battles</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-primary mt-0.5">✓</span>
                <span>{isUnlimited ? 'Unlimited' : `Up to ${battlesLimit}`} battles per month</span>
              </div>
              {tierName !== 'free' && (
                <>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>Priority customer support</span>
                  </div>
                  {(tierName === 'gold' || tierName === 'diamond') && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Featured profile placement</span>
                    </div>
                  )}
                  {tierName === 'diamond' && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Exclusive Diamond badge</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upgrade Your Subscription</DialogTitle>
          </DialogHeader>
          <BarberSubscriptionTiers />
        </DialogContent>
      </Dialog>
    </>
  );
};
