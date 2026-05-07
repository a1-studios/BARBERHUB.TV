import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Returns true when the signed-in user is missing required profile fields
 * (role / country). Shared by the gate modal, header dot, and profile banner
 * so they all light up at the same time.
 */
export const useProfileIncomplete = () => {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['profile-incomplete', user?.id],
    queryFn: async () => {
      if (!user) return { incomplete: false };
      const { data } = await supabase
        .from('profiles')
        .select('user_type, country_code')
        .eq('user_id', user.id)
        .maybeSingle();
      const incomplete = !data?.user_type || !data?.country_code;
      return { incomplete };
    },
    enabled: !!user,
    staleTime: 15_000,
  });

  return { incomplete: !!data?.incomplete, isLoading, refetch };
};
