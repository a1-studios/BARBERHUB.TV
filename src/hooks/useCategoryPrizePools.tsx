import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TOURNAMENT_CATEGORIES } from '@/config/categories';

// Base prize pool per category: $5,000 = 500,000 cents
const BASE_PRIZE_POOL_CENTS = 500000;
// Platform fee: 25%
const PLATFORM_FEE_PERCENT = 0.25;

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

interface ComputedPrizePool extends CategoryPrizePool {
  // The actual prize pool after base + donations - platform fee
  display_pool_cents: number;
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
      
      // Compute display pool for each category
      // Formula: (Base $5000 + Donations) * 0.75 (after 25% platform fee)
      const computedPools: ComputedPrizePool[] = TOURNAMENT_CATEGORIES.map(category => {
        const existingPool = (data as CategoryPrizePool[])?.find(p => p.category === category.id);
        
        const donations = existingPool?.donation_contributions_cents || 0;
        const entries = existingPool?.entry_contributions_cents || 0;
        const totalBeforeFee = BASE_PRIZE_POOL_CENTS + donations + entries;
        const displayPool = Math.floor(totalBeforeFee * (1 - PLATFORM_FEE_PERCENT));
        
        return {
          id: existingPool?.id || category.id,
          category: category.id,
          tournament_year: currentYear,
          total_pool_cents: existingPool?.total_pool_cents || BASE_PRIZE_POOL_CENTS,
          entry_contributions_cents: entries,
          donation_contributions_cents: donations,
          platform_fees_collected_cents: Math.floor(totalBeforeFee * PLATFORM_FEE_PERCENT),
          participant_count: existingPool?.participant_count || 0,
          last_updated: existingPool?.last_updated || new Date().toISOString(),
          display_pool_cents: displayPool
        };
      });
      
      return computedPools;
    },
    staleTime: 30000,
    refetchInterval: 60000
  });

  // Use display_pool_cents for totals
  const totalPrizePool = data?.reduce((sum, pool) => sum + pool.display_pool_cents, 0) || 0;
  const totalParticipants = data?.reduce((sum, pool) => sum + pool.participant_count, 0) || 0;

  const getPrizePoolByCategory = (categoryId: string) => {
    return data?.find(pool => pool.category === categoryId);
  };

  // Return display_pool_cents as total_pool_cents for backward compatibility
  const prizePools = data?.map(pool => ({
    ...pool,
    total_pool_cents: pool.display_pool_cents
  })) || [];

  return {
    prizePools,
    isLoading,
    error,
    refetch,
    totalPrizePool,
    totalParticipants,
    getPrizePoolByCategory
  };
};

export default useCategoryPrizePools;
