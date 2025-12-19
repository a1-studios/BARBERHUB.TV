import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TopBarber {
  user_id: string;
  name: string;
  avatar_url: string | null;
  specialty: string | null;
  rating: number | null;
}

interface CategoryTopBarbers {
  [categoryId: string]: TopBarber | null;
}

const SPECIALTY_CATEGORY_MAP: Record<string, string> = {
  'fade': 'speed_fade',
  'texture': 'speed_fade',
  'precision': 'speed_fade',
  'classic': 'gentleman_cut',
  'gentleman': 'gentleman_cut',
  'traditional': 'gentleman_cut',
  'color': 'creative_color',
  'design': 'creative_color',
  'artistic': 'creative_color',
  'trending': 'viral_trending',
  'viral': 'viral_trending',
  'social': 'viral_trending',
  'beard': 'beard_scissor',
  'scissor': 'beard_scissor',
  'grooming': 'beard_scissor'
};

export const useCategoryTopBarbers = () => {
  return useQuery({
    queryKey: ['category-top-barbers'],
    queryFn: async (): Promise<CategoryTopBarbers> => {
      const { data: barbers, error } = await supabase
        .from('barber_profiles')
        .select(`
          user_id,
          name,
          specialty,
          rating,
          profiles!barber_profiles_user_id_fkey (
            avatar_url
          )
        `)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) {
        console.error('Error fetching top barbers:', error);
        return {};
      }

      const categoryTopBarbers: CategoryTopBarbers = {
        'speed_fade': null,
        'gentleman_cut': null,
        'creative_color': null,
        'viral_trending': null,
        'beard_scissor': null
      };

      // Map barbers to categories based on specialty
      for (const barber of barbers || []) {
        const specialty = barber.specialty?.toLowerCase() || '';
        
        // Check each keyword in the specialty
        for (const [keyword, categoryId] of Object.entries(SPECIALTY_CATEGORY_MAP)) {
          if (specialty.includes(keyword) && !categoryTopBarbers[categoryId]) {
            const profile = barber.profiles as { avatar_url: string | null } | null;
            categoryTopBarbers[categoryId] = {
              user_id: barber.user_id,
              name: barber.name,
              avatar_url: profile?.avatar_url || null,
              specialty: barber.specialty,
              rating: barber.rating
            };
            break;
          }
        }
      }

      // Fill remaining categories with highest rated barbers without specific specialty
      const usedUserIds = new Set(
        Object.values(categoryTopBarbers)
          .filter(b => b !== null)
          .map(b => b!.user_id)
      );

      for (const barber of barbers || []) {
        if (usedUserIds.has(barber.user_id)) continue;

        for (const categoryId of Object.keys(categoryTopBarbers)) {
          if (!categoryTopBarbers[categoryId]) {
            const profile = barber.profiles as { avatar_url: string | null } | null;
            categoryTopBarbers[categoryId] = {
              user_id: barber.user_id,
              name: barber.name,
              avatar_url: profile?.avatar_url || null,
              specialty: barber.specialty,
              rating: barber.rating
            };
            usedUserIds.add(barber.user_id);
            break;
          }
        }
      }

      return categoryTopBarbers;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
