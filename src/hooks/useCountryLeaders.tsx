import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CountryLeader {
  user_id: string;
  name: string;
  avatar_url: string | null;
  rating: number;
  rank: number;
}

interface CountryStats {
  country_code: string;
  country_name: string;
  leaders: CountryLeader[];
  total_points: number;
  barber_count: number;
}

// Map country codes to names
const countryNames: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  BR: 'Brazil',
  MX: 'Mexico',
  JP: 'Japan',
  KR: 'South Korea',
  IN: 'India',
  NG: 'Nigeria',
  ZA: 'South Africa',
  AE: 'UAE',
  SA: 'Saudi Arabia',
  TR: 'Turkey',
  NL: 'Netherlands',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  PL: 'Poland',
  RU: 'Russia',
  UA: 'Ukraine',
  PH: 'Philippines',
  ID: 'Indonesia',
  TH: 'Thailand',
  VN: 'Vietnam',
  MY: 'Malaysia',
  SG: 'Singapore',
  NZ: 'New Zealand',
  IE: 'Ireland',
  PT: 'Portugal',
  GR: 'Greece',
  DO: 'Dominican Republic',
  CO: 'Colombia',
  AR: 'Argentina',
  CL: 'Chile',
  PE: 'Peru',
  JM: 'Jamaica',
  TT: 'Trinidad & Tobago',
  GH: 'Ghana',
  KE: 'Kenya',
  EG: 'Egypt',
  MA: 'Morocco',
};

const getCountryName = (code: string): string => {
  return countryNames[code?.toUpperCase()] || code || 'Unknown';
};

export const useCountryLeaders = (limit: number = 10) => {
  return useQuery({
    queryKey: ['countryLeaders', limit],
    queryFn: async (): Promise<CountryStats[]> => {
      // Fetch barber profiles with their ratings grouped by country
      const { data: barbers, error } = await supabase
        .from('barber_profiles')
        .select(`
          id,
          user_id,
          name,
          rating,
          country_code
        `)
        .not('country_code', 'is', null)
        .order('rating', { ascending: false });

      if (error) throw error;

      // Fetch avatar URLs from profiles
      const userIds = barbers?.map(b => b.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, avatar_url')
        .in('user_id', userIds);

      const avatarMap = new Map(profiles?.map(p => [p.user_id, p.avatar_url]) || []);

      // Group by country and calculate stats
      const countryMap = new Map<string, {
        barbers: Array<{
          user_id: string;
          name: string;
          avatar_url: string | null;
          rating: number;
        }>;
        total_points: number;
      }>();

      barbers?.forEach(barber => {
        if (!barber.country_code) return;
        
        const code = barber.country_code.toUpperCase();
        const existing = countryMap.get(code) || { barbers: [], total_points: 0 };
        
        existing.barbers.push({
          user_id: barber.user_id,
          name: barber.name,
          avatar_url: avatarMap.get(barber.user_id) || null,
          rating: barber.rating || 0
        });
        existing.total_points += barber.rating || 0;
        
        countryMap.set(code, existing);
      });

      // Convert to array and sort by total points
      const countries: CountryStats[] = Array.from(countryMap.entries())
        .map(([code, data]) => ({
          country_code: code,
          country_name: getCountryName(code),
          leaders: data.barbers
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 3)
            .map((b, i) => ({ ...b, rank: i + 1 })),
          total_points: Math.round(data.total_points),
          barber_count: data.barbers.length
        }))
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, limit);

      return countries;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
