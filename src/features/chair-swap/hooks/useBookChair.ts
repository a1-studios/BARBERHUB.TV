import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ChairBooking } from '../types';

export function useBookChair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { listingId: string; startDate: string; endDate: string }) => {
      const { data, error } = await supabase.rpc('book_chair' as any, {
        p_listing_id: input.listingId,
        p_start_date: input.startDate,
        p_end_date: input.endDate,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chair-swap'] });
      qc.invalidateQueries({ queryKey: ['hub-calendar'] });
      toast.success('Chair booked! 🪑');
    },
    onError: (e: any) => {
      const msg = String(e.message || '');
      if (msg.includes('exclusion')) toast.error('Those dates were just taken — try another range.');
      else toast.error(msg || 'Booking failed');
    },
  });
}

export function useMyBookings(userId?: string) {
  return useQuery({
    queryKey: ['chair-swap', 'bookings', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ChairBooking[]> => {
      const { data, error } = await supabase
        .from('chair_bookings' as any)
        .select('*')
        .or(`renter_user_id.eq.${userId},owner_user_id.eq.${userId}`)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return (data as unknown as ChairBooking[]) || [];
    },
  });
}
