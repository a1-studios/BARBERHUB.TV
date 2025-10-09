import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUserRole = () => {
  const { user } = useAuth();
  
  const { data: roles, isLoading } = useQuery({
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

  return {
    roles: roles ?? [],
    isBarber,
    isFan,
    isAdmin,
    isLoading
  };
};
