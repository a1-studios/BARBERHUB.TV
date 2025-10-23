import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { BarberVideoSection } from "@/components/barber/BarberVideoSection";
import { LiveViewerComparison } from "@/components/battles/LiveViewerComparison";
import { LiveBattleIndicator } from "@/components/battles/LiveBattleIndicator";
import { BattleStatsCard } from "@/components/battles/BattleStatsCard";
import { useRealtimeBattleViewers } from "@/hooks/useRealtimeBattleViewers";
import { Heart, Users } from "lucide-react";

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
  featured_video_id?: string;
  live_video_id?: string;
  is_live?: boolean;
  followers?: number;
  likes?: number;
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

  // Fetch barber profiles for the battle using unified view
  const { data: barbers, isLoading: barbersLoading } = useQuery({
    queryKey: ['battleBarbers', battle?.barber1_id, battle?.barber2_id],
    queryFn: async () => {
      if (!battle?.barber1_id || !battle?.barber2_id) return [];

      const { data, error } = await supabase
        .from('public_barber_profiles')
        .select('*')
        .in('barber_id', [battle.barber1_id, battle.barber2_id]);
      
      if (error) throw error;

      // Transform to BarberProfile format and preserve order
      const orderedBarbers = [
        data?.find(b => b.barber_id === battle.barber1_id),
        data?.find(b => b.barber_id === battle.barber2_id)
      ].filter(Boolean).map(barber => ({
        id: barber.barber_id,
        user_id: barber.user_id,
        name: barber.barber_name,
        display_name: barber.display_name || barber.barber_name,
        avatar_url: barber.avatar_url,
        country_code: barber.country_code || 'US',
        featured_video_id: barber.featured_video_id,
        live_video_id: barber.live_video_id,
        is_live: barber.is_live,
        followers: barber.follower_count,
        likes: barber.like_count
      })) as BarberProfile[];

      return orderedBarbers;
    },
    enabled: !!battle?.barber1_id && !!battle?.barber2_id
  });

  // Fallback: fetch latest 2 barbers if no battle using unified view
  const { data: featuredBarbers } = useQuery({
    queryKey: ['featuredBarbers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_barber_profiles')
        .select('*')
        .order('barber_updated_at', { ascending: false })
        .limit(2);
      
      if (error) throw error;

      return data?.map(barber => ({
        id: barber.barber_id,
        user_id: barber.user_id,
        name: barber.barber_name,
        display_name: barber.display_name || barber.barber_name,
        avatar_url: barber.avatar_url,
        country_code: barber.country_code || 'US',
        featured_video_id: barber.featured_video_id,
        live_video_id: barber.live_video_id,
        is_live: barber.is_live,
        followers: barber.follower_count,
        likes: barber.like_count
      })) as BarberProfile[];
    },
    enabled: !battle || !barbers || barbers.length < 2
  });

  const getFlagImageUrl = (countryCode?: string) => {
    if (!countryCode) return "";
    return `https://flagcdn.com/w1600/${countryCode.toLowerCase()}.jpg`;
  };

  // IMPORTANT: Call hooks before any conditional returns
  // Get real-time viewer counts - always call this hook regardless of battle state
  const viewerData = useRealtimeBattleViewers(battle?.id || '');

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
  const isActiveBattle = battle?.status === 'voting';

  return (
    <div className="pt-20 sm:pt-24 lg:pt-32 pb-4 sm:pb-6 lg:pb-8 px-1 sm:px-2 lg:px-4 max-w-[95vw] sm:max-w-4xl lg:max-w-5xl mx-auto space-y-4">
      {/* Live Battle Indicator */}
      {isActiveBattle && (
        <div className="flex justify-center">
          <LiveBattleIndicator />
        </div>
      )}
      
      {/* Live Viewer Comparison - Only show during active battles */}
      {isActiveBattle && (
        <LiveViewerComparison 
          barber1Name={barber1.display_name || barber1.name}
          barber2Name={barber2.display_name || barber2.name}
          barber1Viewers={viewerData.barber1}
          barber2Viewers={viewerData.barber2}
          barber1Peak={viewerData.peak1}
          barber2Peak={viewerData.peak2}
          lastUpdate={viewerData.lastUpdate}
        />
      )}
      
      {/* Battle Stats Card */}
      {isActiveBattle && (viewerData.barber1 > 0 || viewerData.barber2 > 0) && (
        <BattleStatsCard
          totalViewers={viewerData.barber1 + viewerData.barber2}
          peakViewers={Math.max(viewerData.peak1, viewerData.peak2)}
        />
      )}
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
            <div className="relative h-full flex flex-col items-center justify-start pt-[5%] p-4 sm:p-6 lg:p-8 space-y-3">
              {/* Photo */}
              <div 
                className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-white/80 shadow-2xl cursor-pointer hover:border-white transition-all"
              >
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

              {/* Name - Clickable */}
              <h3 
                onClick={() => navigate(`/barber/${barber1.user_id}`)}
                className="text-white text-sm sm:text-base lg:text-lg font-bold drop-shadow-lg bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 cursor-pointer hover:bg-black/70 transition-all"
              >
                {barber1.display_name}
              </h3>

              {/* Spacer - 10% down */}
              <div className="h-[10%]" />

              {/* Barber Stats */}
              <div className="flex gap-3 text-white text-xs sm:text-sm">
                <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
                  <Heart className="w-3 h-3" fill="currentColor" />
                  <span className="font-semibold">{barber1.likes}</span>
                </div>
                <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  <span className="font-semibold">{barber1.followers}</span>
                </div>
              </div>

              {/* Video Preview - 1:1 ratio */}
              <div className="w-full max-w-[180px] sm:max-w-[200px]">
                <BarberVideoSection 
                  videoId={barber1.is_live ? barber1.live_video_id : barber1.featured_video_id}
                  isLive={barber1.is_live}
                  viewerCount={isActiveBattle ? viewerData.barber1 : undefined}
                  aspectRatio="portrait"
                  className="rounded-md aspect-square"
                />
              </div>
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
            <div className="relative h-full flex flex-col items-center justify-start pt-[5%] p-4 sm:p-6 lg:p-8 space-y-3">
              {/* Photo */}
              <div 
                className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-white/80 shadow-2xl cursor-pointer hover:border-white transition-all"
              >
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

              {/* Name - Clickable */}
              <h3 
                onClick={() => navigate(`/barber/${barber2.user_id}`)}
                className="text-white text-sm sm:text-base lg:text-lg font-bold drop-shadow-lg bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 cursor-pointer hover:bg-black/70 transition-all"
              >
                {barber2.display_name}
              </h3>

              {/* Spacer - 10% down */}
              <div className="h-[10%]" />

              {/* Barber Stats */}
              <div className="flex gap-3 text-white text-xs sm:text-sm">
                <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
                  <Heart className="w-3 h-3" fill="currentColor" />
                  <span className="font-semibold">{barber2.likes}</span>
                </div>
                <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  <span className="font-semibold">{barber2.followers}</span>
                </div>
              </div>

              {/* Video Preview - 1:1 ratio */}
              <div className="w-full max-w-[180px] sm:max-w-[200px]">
                <BarberVideoSection 
                  videoId={barber2.is_live ? barber2.live_video_id : barber2.featured_video_id}
                  isLive={barber2.is_live}
                  viewerCount={isActiveBattle ? viewerData.barber2 : undefined}
                  aspectRatio="portrait"
                  className="rounded-md aspect-square"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
