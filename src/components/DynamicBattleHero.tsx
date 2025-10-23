import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface Battle {
  id: string;
  title: string;
  barber1_id: string;
  barber2_id: string;
  status: string;
}

interface BarberProfile {
  id: string;
  user_id: string;
  name: string;
  country_code?: string;
  avatar_url?: string;
  display_name?: string;
}

export const DynamicBattleHero = () => {
  const navigate = useNavigate();

  // Fetch active battle (voting or upcoming)
  const { data: battle, isLoading: battleLoading } = useQuery({
    queryKey: ['activeBattle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .in('status', ['voting', 'upcoming'])
        .not('barber1_id', 'is', null)
        .not('barber2_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as Battle | null;
    },
    refetchInterval: 10000
  });

  // Fetch barber profiles for the battle
  const { data: barbers, isLoading: barbersLoading } = useQuery({
    queryKey: ['battleBarbers', battle?.barber1_id, battle?.barber2_id],
    queryFn: async () => {
      if (!battle?.barber1_id || !battle?.barber2_id) return [];

      // Fetch barber profiles by id
      const { data: barberProfiles, error: barberError } = await supabase
        .from('barber_profiles')
        .select('id, user_id, name, country_code')
        .in('id', [battle.barber1_id, battle.barber2_id]);
      
      if (barberError) throw barberError;

      // Fetch user profiles for avatar and display_name
      const userIds = barberProfiles?.map(b => b.user_id) || [];
      const { data: userProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, avatar_url, display_name, country_code')
        .in('user_id', userIds);
      
      if (profileError) throw profileError;

      // Merge data
      const mergedData = barberProfiles?.map(barber => {
        const userProfile = userProfiles?.find(p => p.user_id === barber.user_id);
        return {
          ...barber,
          avatar_url: userProfile?.avatar_url || undefined,
          display_name: userProfile?.display_name || barber.name,
          country_code: barber.country_code || userProfile?.country_code || 'us'
        };
      });

      // Preserve order: barber1, barber2
      const orderedBarbers = [
        mergedData?.find(b => b.id === battle.barber1_id),
        mergedData?.find(b => b.id === battle.barber2_id)
      ].filter(Boolean) as BarberProfile[];

      return orderedBarbers;
    },
    enabled: !!battle?.barber1_id && !!battle?.barber2_id
  });

  // Fallback: fetch latest 2 barbers if no battle
  const { data: featuredBarbers } = useQuery({
    queryKey: ['featuredBarbers'],
    queryFn: async () => {
      const { data: barberProfiles, error: barberError } = await supabase
        .from('barber_profiles')
        .select('id, user_id, name, country_code')
        .order('updated_at', { ascending: false })
        .limit(2);
      
      if (barberError) throw barberError;

      const userIds = barberProfiles?.map(b => b.user_id) || [];
      const { data: userProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, avatar_url, display_name, country_code')
        .in('user_id', userIds);
      
      if (profileError) throw profileError;

      const mergedData = barberProfiles?.map(barber => {
        const userProfile = userProfiles?.find(p => p.user_id === barber.user_id);
        return {
          ...barber,
          avatar_url: userProfile?.avatar_url || undefined,
          display_name: userProfile?.display_name || barber.name,
          country_code: barber.country_code || userProfile?.country_code || 'us'
        };
      });

      return mergedData as BarberProfile[];
    },
    enabled: !battle || !barbers || barbers.length < 2
  });

  const getFlagImageUrl = (countryCode?: string) => {
    if (!countryCode) return "";
    return `https://flagcdn.com/w1600/${countryCode.toLowerCase()}.jpg`;
  };

  // Loading state
  if (battleLoading || barbersLoading) {
    return (
      <div className="pt-24 lg:pt-28 pb-8 px-4 max-w-7xl mx-auto">
        <Skeleton className="aspect-video w-full rounded-2xl" />
      </div>
    );
  }

  // Determine which barbers to display
  const displayBarbers = barbers && barbers.length >= 2 ? barbers : featuredBarbers || [];

  // If no barbers at all
  if (displayBarbers.length < 2) {
    return (
      <div className="pt-24 lg:pt-28 pb-8 px-4 max-w-7xl mx-auto">
        <div className="aspect-video bg-card rounded-2xl shadow-2xl border-2 border-primary/50 flex items-center justify-center">
          <p className="text-muted-foreground">No barbers to showcase yet</p>
        </div>
      </div>
    );
  }

  const barber1 = displayBarbers[0];
  const barber2 = displayBarbers[1];

  return (
    <div className="pt-20 sm:pt-24 lg:pt-32 pb-4 sm:pb-6 lg:pb-8 px-1 sm:px-2 lg:px-4 max-w-[95vw] sm:max-w-4xl lg:max-w-5xl mx-auto">
      <div className="w-full portrait:aspect-[3/4] sm:portrait:aspect-[4/5] landscape:aspect-[16/10] lg:landscape:aspect-[16/9] bg-card rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl sm:shadow-2xl border border-primary/30 sm:border-2 sm:border-primary/50 animate-glow overflow-hidden relative">
        <div className="h-full flex">
          {/* Left Side - Barber 1 */}
          <div className="flex-1 relative overflow-hidden">
            {/* Flag Background */}
            <div 
              className="absolute inset-0" 
              style={{
                backgroundImage: `url(${getFlagImageUrl(barber1.country_code)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.3
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-black/30" />

            {/* Content */}
            <div className="relative h-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
              {/* Photo */}
              <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-white/80 shadow-2xl mb-4">
                {barber1.avatar_url ? (
                  <img 
                    src={barber1.avatar_url} 
                    alt={barber1.display_name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
                )}
              </div>

              {/* Name */}
              <h3 className="text-white text-sm sm:text-base lg:text-lg font-bold drop-shadow-lg bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                {barber1.display_name}
              </h3>

              {/* View Profile Button */}
              <Button
                onClick={() => navigate(`/barber/${barber1.user_id}`)}
                variant="secondary"
                size="sm"
                className="shadow-lg"
              >
                View Profile
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-gradient-to-b from-transparent via-white/50 to-transparent" />

          {/* Right Side - Barber 2 */}
          <div className="flex-1 relative overflow-hidden">
            {/* Flag Background */}
            <div 
              className="absolute inset-0" 
              style={{
                backgroundImage: `url(${getFlagImageUrl(barber2.country_code)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.3
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-bl from-black/50 via-transparent to-black/30" />

            {/* Content */}
            <div className="relative h-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
              {/* Photo */}
              <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-white/80 shadow-2xl mb-4">
                {barber2.avatar_url ? (
                  <img 
                    src={barber2.avatar_url} 
                    alt={barber2.display_name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
                )}
              </div>

              {/* Name */}
              <h3 className="text-white text-sm sm:text-base lg:text-lg font-bold drop-shadow-lg bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                {barber2.display_name}
              </h3>

              {/* View Profile Button */}
              <Button
                onClick={() => navigate(`/barber/${barber2.user_id}`)}
                variant="secondary"
                size="sm"
                className="shadow-lg"
              >
                View Profile
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
