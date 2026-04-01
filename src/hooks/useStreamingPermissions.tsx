import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useStreamingPermissions() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['streaming-permissions', user?.id],
    queryFn: async () => {
      // Check platform flag
      const { data: flag } = await supabase
        .from('platform_state')
        .select('value')
        .eq('key', 'is_premium_streaming_enforced')
        .single();

      const isPremiumEnforced = flag?.value === 'true';

      if (!isPremiumEnforced) {
        return { canStream: true, reason: undefined };
      }

      // Check barber subscription
      const { data: barber } = await supabase
        .from('barber_profiles')
        .select('active_subscription_tier')
        .eq('user_id', user!.id)
        .single();

      if (!barber?.active_subscription_tier) {
        return {
          canStream: false,
          reason: 'Live streaming is currently reserved for Premium subscribers.',
        };
      }

      return { canStream: true, reason: undefined };
    },
    enabled: !!user,
  });

  return {
    canStream: data?.canStream ?? false,
    isLoading,
    reason: data?.reason,
  };
}
