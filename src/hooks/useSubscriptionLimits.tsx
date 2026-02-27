import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// TODO: Set to false before going live
const DEV_MODE = true;

const TIER_LIMITS = {
  'free': 2,
  'bronze': 4,
  'silver': 8,
  'gold': 16,
  'diamond': 9999
};

export const useSubscriptionLimits = () => {
  const { user } = useAuth();

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
  const monthlyLimit = TIER_LIMITS[tierName as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;
  const battlesUsed = barberProfile?.battles_created_this_month || 0;
  const canCreateBattle = battlesUsed < monthlyLimit;
  const battlesRemaining = Math.max(0, monthlyLimit - battlesUsed);
  const isUnlimited = monthlyLimit >= 9999;

  const checkLimit = () => {
    if (!canCreateBattle && !isUnlimited) {
      toast.error(`Monthly limit reached (${monthlyLimit} battles)`, {
        description: 'Upgrade your subscription to create more battles this month.'
      });
      return false;
    }
    return true;
  };

  return {
    tierName,
    monthlyLimit,
    battlesUsed,
    battlesRemaining,
    canCreateBattle,
    isUnlimited,
    checkLimit,
    subscription,
    hasActiveSubscription: !!subscription
  };
};
