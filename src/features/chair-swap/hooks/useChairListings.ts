import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ChairListing, ChairFilters } from '../types';

export function useNearbyChairs(
  coords: { lat: number; lng: number } | null,
  filters: ChairFilters,
) {
  return useQuery({
    queryKey: ['chair-swap', 'nearby', coords, filters],
    enabled: !!coords,
    queryFn: async (): Promise<ChairListing[]> => {
      if (!coords) return [];
      const { data, error } = await supabase.rpc('find_chairs_nearby' as any, {
        p_lat: coords.lat,
        p_lng: coords.lng,
        p_radius_miles: filters.radiusMiles,
        p_start_date: filters.startDate,
        p_end_date: filters.endDate,
        p_amenities: filters.amenities.length ? filters.amenities : null,
      });
      if (error) throw error;
      return (data as ChairListing[]) || [];
    },
  });
}

export function useMyChairListings(userId?: string) {
  return useQuery({
    queryKey: ['chair-swap', 'mine', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ChairListing[]> => {
      const { data, error } = await supabase
        .from('chair_listings' as any)
        .select('*')
        .eq('owner_user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as ChairListing[]) || [];
    },
  });
}

export function useToggleListingActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('chair_listings' as any)
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chair-swap'] });
      toast.success('Listing updated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });
}
