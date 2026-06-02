import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PostChairInput {
  shop_name?: string;
  chair_name: string;
  description?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  daily_rate_bb: number;
  weekly_rate_bb?: number | null;
  amenities: string[];
  photo_urls: string[];
  availability?: { from: string; to: string }[];
}

export function usePostChair(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PostChairInput) => {
      if (!userId) throw new Error('Not signed in');
      const { data: listing, error } = await supabase
        .from('chair_listings' as any)
        .insert({
          owner_user_id: userId,
          shop_name: input.shop_name || null,
          chair_name: input.chair_name,
          description: input.description || null,
          address: input.address || null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          daily_rate_bb: input.daily_rate_bb,
          weekly_rate_bb: input.weekly_rate_bb ?? null,
          amenities: input.amenities,
          photo_urls: input.photo_urls,
        })
        .select()
        .single();
      if (error) throw error;

      if (input.availability?.length) {
        const rows = input.availability.map((a) => ({
          listing_id: (listing as any).id,
          available_from: a.from,
          available_to: a.to,
        }));
        const { error: avErr } = await supabase
          .from('chair_availability' as any)
          .insert(rows);
        if (avErr) throw avErr;
      }
      return listing;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chair-swap'] });
      toast.success('Chair posted ✨');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to post chair'),
  });
}
