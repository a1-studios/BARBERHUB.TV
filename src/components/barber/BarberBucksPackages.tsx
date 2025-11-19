import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const BB_PACKAGES = [
  { amount: 100, bonus: 0, display: "100 BB" },
  { amount: 500, bonus: 50, display: "500 BB (+50 bonus)" },
  { amount: 1000, bonus: 150, display: "1,000 BB (+150 bonus)" },
  { amount: 2500, bonus: 500, display: "2,500 BB (+500 bonus)" },
];

export const BarberBucksPackages = () => {
  const { user } = useAuth();
  const [processingAmount, setProcessingAmount] = useState<number | null>(null);

  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ['barber-bucks', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('barber_bucks')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data.barber_bucks || 0;
    },
    enabled: !!user
  });

  const { data: subscription } = useQuery({
    queryKey: ['active-subscription', user?.id],
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

  const handlePurchase = async (packageAmount: number) => {
    if (!user) {
      toast.error("Please sign in to purchase Barber Bucks");
      return;
    }

    setProcessingAmount(packageAmount);
    
    try {
      const { data, error } = await supabase.functions.invoke('purchase-barber-bucks', {
        body: { package_amount: packageAmount }
      });

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || "Failed to initiate purchase");
      setProcessingAmount(null);
    }
  };

  const getDiscountedPrice = (amount: number, basePrice: number) => {
    if (!subscription?.tier) return basePrice;
    
    const features = subscription.tier.features as any;
    const discountPercent = features.bb_discount_percent || 0;
    
    return basePrice * (1 - discountPercent / 100);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Coins className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold">Barber Bucks</h2>
        </div>
        <p className="text-muted-foreground">
          Purchase Barber Bucks to vote, enter tournaments, and more
        </p>
        {!loadingBalance && (
          <div className="text-2xl font-bold text-primary">
            Current Balance: {balance?.toLocaleString()} BB
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {BB_PACKAGES.map((pkg) => {
          const basePrice = pkg.amount / 100; // $1 per 100 BB
          const finalPrice = getDiscountedPrice(pkg.amount, basePrice);
          const hasDiscount = subscription?.tier && finalPrice < basePrice;

          return (
            <Card key={pkg.amount} className="p-6 space-y-4 text-center">
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <Coins className="h-12 w-12 text-primary" />
                  {pkg.bonus > 0 && (
                    <Sparkles className="h-6 w-6 text-yellow-500 -ml-2" />
                  )}
                </div>
                <h3 className="text-xl font-bold">{pkg.display}</h3>
                <div className="space-y-1">
                  {hasDiscount ? (
                    <>
                      <p className="text-sm text-muted-foreground line-through">
                        ${basePrice.toFixed(2)}
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        ${finalPrice.toFixed(2)}
                      </p>
                      <p className="text-xs text-green-600 font-semibold">
                        {((basePrice - finalPrice) / basePrice * 100).toFixed(0)}% OFF
                      </p>
                    </>
                  ) : (
                    <p className="text-3xl font-bold">
                      ${basePrice.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={() => handlePurchase(pkg.amount)}
                disabled={processingAmount === pkg.amount}
                className="w-full"
              >
                {processingAmount === pkg.amount ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Purchase'
                )}
              </Button>
            </Card>
          );
        })}
      </div>

      {subscription?.tier && (
        <div className="text-center p-4 bg-primary/10 rounded-lg">
          <p className="text-sm font-semibold">
            🎉 {subscription.tier.display_name} Member Discount Active!
          </p>
        </div>
      )}
    </div>
  );
};
