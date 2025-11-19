import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Crown, Star, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const tierIcons = {
  bronze: Star,
  silver: Sparkles,
  gold: Crown,
};

const tierColors = {
  bronze: "text-orange-600",
  silver: "text-slate-400",
  gold: "text-yellow-500",
};

export const BarberSubscriptionTiers = () => {
  const { user } = useAuth();
  const [processingTier, setProcessingTier] = useState<string | null>(null);

  const { data: tiers, isLoading: loadingTiers } = useQuery({
    queryKey: ['subscription-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_subscription_tiers')
        .select('*')
        .order('price_monthly_cents', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: currentSubscription } = useQuery({
    queryKey: ['current-subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('barber_subscriptions')
        .select('*, tier:barber_subscription_tiers(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user
  });

  const handleSubscribe = async (tierId: string, tierName: string) => {
    if (!user) {
      toast.error("Please sign in to subscribe");
      return;
    }

    setProcessingTier(tierName);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-barber-subscription', {
        body: { tier_id: tierId }
      });

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || "Failed to create subscription");
      setProcessingTier(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('manage-barber-subscription', {
        body: { action: 'create_portal_session' }
      });

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      toast.error(error.message || "Failed to open subscription portal");
    }
  };

  if (loadingTiers) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Choose Your Tier</h2>
        <p className="text-muted-foreground">
          Unlock premium features and boost your competitive advantage
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers?.map((tier) => {
          const Icon = tierIcons[tier.tier_name.toLowerCase() as keyof typeof tierIcons];
          const colorClass = tierColors[tier.tier_name.toLowerCase() as keyof typeof tierColors];
          const isCurrentTier = currentSubscription?.tier_id === tier.id;
          const features = tier.features as any[];

          return (
            <Card 
              key={tier.id} 
              className={`p-6 space-y-6 ${isCurrentTier ? 'border-primary shadow-lg' : ''}`}
            >
              <div className="text-center space-y-2">
                <Icon className={`h-12 w-12 mx-auto ${colorClass}`} />
                <h3 className="text-2xl font-bold">{tier.display_name}</h3>
                <div className="space-y-1">
                  <p className="text-4xl font-bold">
                    ${(tier.price_monthly_cents / 100).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">per month</p>
                </div>
              </div>

              <div className="space-y-3">
                {features.map((feature: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {isCurrentTier ? (
                <Button 
                  onClick={handleManageSubscription}
                  variant="outline" 
                  className="w-full"
                >
                  Manage Subscription
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubscribe(tier.id, tier.tier_name)}
                  disabled={processingTier === tier.tier_name}
                  className="w-full"
                >
                  {processingTier === tier.tier_name ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Subscribe Now'
                  )}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {currentSubscription && (
        <div className="text-center text-sm text-muted-foreground">
          Current plan: <span className="font-semibold text-foreground">{currentSubscription.tier.display_name}</span>
          {currentSubscription.current_period_end && (
            <> · Renews on {new Date(currentSubscription.current_period_end).toLocaleDateString()}</>
          )}
        </div>
      )}
    </div>
  );
};
