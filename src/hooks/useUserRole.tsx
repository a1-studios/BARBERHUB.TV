import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(r => r.role);
    },
    enabled: !!user
  });

  const isBarber = roles?.includes('barber') ?? false;
  const isFan = roles?.includes('fan') ?? false;
  const isAdmin = roles?.includes('admin') ?? false;

  // Auth restores asynchronously on refresh: stay "loading" until the session is
  // resolved AND (when signed in) the roles query has settled, so route guards
  // never redirect a signed-in user before their role is known.
  const isLoading = authLoading || (!!user && rolesLoading);

  return {
    roles: roles ?? [],
    isBarber,
    isFan,
    isAdmin,
    isLoading

  };
};
