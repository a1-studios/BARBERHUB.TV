import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CategoryPrizePool {
  id: string;
  category: string;
  tournament_year: number;
  total_pool_cents: number;
  entry_contributions_cents: number;
  donation_contributions_cents: number;
  platform_fees_collected_cents: number;
  participant_count: number;
  last_updated: string;
}

export const useCategoryPrizePools = (tournamentYear?: number) => {
  const currentYear = tournamentYear || new Date().getFullYear();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['category-prize-pools', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_prize_pools')
        .select('*')
        .eq('tournament_year', currentYear)
        .order('total_pool_cents', { ascending: false });

      if (error) throw error;
      return data as CategoryPrizePool[];
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000 // Refresh every minute
  });

  const totalPrizePool = data?.reduce((sum, pool) => sum + pool.total_pool_cents, 0) || 0;
  const totalParticipants = data?.reduce((sum, pool) => sum + pool.participant_count, 0) || 0;

  const getPrizePoolByCategory = (categoryId: string) => {
    return data?.find(pool => pool.category === categoryId);
  };

  return {
    prizePools: data || [],
    isLoading,
    error,
    refetch,
    totalPrizePool,
    totalParticipants,
    getPrizePoolByCategory
  };
};

export default useCategoryPrizePools;
