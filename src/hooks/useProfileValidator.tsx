import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

interface ProfileValidation {
  hasProfile: boolean;
  needsSetup: boolean;
  profileType: 'barber' | 'fan' | null;
  profileId?: string;
}

export const useProfileValidator = () => {
  const { user } = useAuth();
  const { isBarber, isFan, isLoading: rolesLoading } = useUserRole();

  const { data: validation, isLoading: validationLoading, refetch } = useQuery({
    queryKey: ['profile-validation', user?.id, isBarber, isFan],
    queryFn: async (): Promise<ProfileValidation | null> => {
      if (!user) return null;

      // Check for barber profile
      if (isBarber) {
        const { data, error } = await supabase
          .from('barber_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking barber profile:', error);
        }

        return {
          hasProfile: !!data,
          needsSetup: !data,
          profileType: 'barber',
          profileId: data?.id
        };
      }

      // Check for fan/client profile
      if (isFan) {
        const { data, error } = await supabase
          .from('client_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking client profile:', error);
        }

        return {
          hasProfile: !!data,
          needsSetup: !data,
          profileType: 'fan',
          profileId: data?.id
        };
      }

      return null;
    },
    enabled: !!user && !rolesLoading && (isBarber || isFan),
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    validation,
    isLoading: rolesLoading || validationLoading,
    refetch,
    // Convenience flags
    hasProfile: validation?.hasProfile ?? false,
    needsSetup: validation?.needsSetup ?? false,
    profileType: validation?.profileType ?? null,
  };
};
