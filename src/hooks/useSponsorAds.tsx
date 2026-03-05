import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SponsorAd {
  id: string;
  name: string;
  message: string;
  highlight_end: number;
  logo_url: string | null;
  link: string | null;
  is_active: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  product_image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
}

export const useSponsorAds = (activeOnly = true) => {
  return useQuery({
    queryKey: ["sponsor-ads", activeOnly],
    queryFn: async () => {
      let query = (supabase.from("sponsor_ads" as any) as any)
        .select("*")
        .order("display_order", { ascending: true });

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as SponsorAd[];
    },
    staleTime: 60_000,
  });
};
