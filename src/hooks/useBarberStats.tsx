import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BarberStats {
  totalPoints: number;
  totalVotesReceived: number;
  battlesWon: number;
  battlesPlayed: number;
  rank: number | null;
}

export const useBarberStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['barber-stats', userId],
    queryFn: async (): Promise<BarberStats> => {
      if (!userId) throw new Error('No user ID');

      // Get barber profile for rating
      const { data: barberProfile } = await supabase
        .from('barber_profiles')
        .select('id, rating')
        .eq('user_id', userId)
        .single();

      if (!barberProfile) {
        return { totalPoints: 0, totalVotesReceived: 0, battlesWon: 0, battlesPlayed: 0, rank: null };
      }

      // Get match results where this barber participated (official only)
      const { data: asBarber1 } = await supabase
        .from('match_results')
        .select('barber1_points, barber1_weighted_votes, winner_id, battle_id')
        .eq('barber1_id', userId);

      const { data: asBarber2 } = await supabase
        .from('match_results')
        .select('barber2_points, barber2_weighted_votes, winner_id, battle_id')
        .eq('barber2_id', userId);

      let totalPoints = 0;
      let totalVotes = 0;
      let battlesWon = 0;

      (asBarber1 || []).forEach(m => {
        totalPoints += m.barber1_points || 0;
        totalVotes += m.barber1_weighted_votes || 0;
        if (m.winner_id === userId) battlesWon++;
      });

      (asBarber2 || []).forEach(m => {
        totalPoints += m.barber2_points || 0;
        totalVotes += m.barber2_weighted_votes || 0;
        if (m.winner_id === userId) battlesWon++;
      });

      const battlesPlayed = (asBarber1?.length || 0) + (asBarber2?.length || 0);

      // Calculate rank: count barbers with higher rating
      let rank: number | null = null;
      if (barberProfile.rating) {
        const { count } = await supabase
          .from('barber_profiles')
          .select('*', { count: 'exact', head: true })
          .gt('rating', barberProfile.rating);
        rank = (count || 0) + 1;
      }

      return { totalPoints, totalVotesReceived: totalVotes, battlesWon, battlesPlayed, rank };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
};
