import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePlatformState(key: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-state', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_state')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? null;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return { value: data as string | null, loading: isLoading };
}
