import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { BarberVideoSection } from "@/components/barber/BarberVideoSection";
import { LiveViewerComparison } from "@/components/battles/LiveViewerComparison";
import { LiveBattleIndicator } from "@/components/battles/LiveBattleIndicator";
import { BattleStatsCard } from "@/components/battles/BattleStatsCard";
import { BarberHeroStreamControls } from "@/components/streaming/BarberHeroStreamControls";
import { useRealtimeBattleViewers } from "@/hooks/useRealtimeBattleViewers";
import { useAuth } from "@/hooks/useAuth";
import { Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

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
  const { user } = useAuth();
  const [rotationIndex, setRotationIndex] = useState(0);
  const [currentUserBarberPosition, setCurrentUserBarberPosition] = useState<1 | 2 | null>(null);

  // Fetch active battle (active, voting or upcoming)
  const { data: battle, isLoading: battleLoading } = useQuery({
    queryKey: ['activeBattle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .in('status', ['active', 'voting', 'upcoming'])
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

  // Fallback: fetch all barbers for rotation if no battle using unified view
  const { data: featuredBarbers } = useQuery({
    queryKey: ['featuredBarbers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_barber_profiles')
        .select('*')
        .order('barber_updated_at', { ascending: false })
        .limit(10); // Fetch more barbers for rotation
      
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

  // Rotate through barber profiles every 8 seconds
  useEffect(() => {
    if (!battle && featuredBarbers && featuredBarbers.length > 2) {
      const interval = setInterval(() => {
        setRotationIndex(prev => (prev + 2) % featuredBarbers.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [battle, featuredBarbers]);

  // Detect if current user is a barber in this battle
  useEffect(() => {
    if (user && barbers && barbers.length >= 2 && battle) {
      const barber1 = barbers[0];
      const barber2 = barbers[1];
      
      if (barber1?.user_id === user.id) {
        setCurrentUserBarberPosition(1);
      } else if (barber2?.user_id === user.id) {
        setCurrentUserBarberPosition(2);
      } else {
        setCurrentUserBarberPosition(null);
      }
    } else {
      setCurrentUserBarberPosition(null);
    }
  }, [user, barbers, battle]);

  const getFlagImageUrl = (countryCode?: string) => {
    if (!countryCode) return "";
    return `https://flagcdn.com/w1600/${countryCode.toLowerCase()}.jpg`;
  };

  // IMPORTANT: Call hooks before any conditional returns
  // Get real-time viewer counts - always call this hook regardless of battle state
  const viewerData = useRealtimeBattleViewers(battle?.id || '');

  // Check if current battle is active (active status for streaming)
  const isStreamableBattle = battle?.status === 'active' || battle?.status === 'voting' || battle?.status === 'upcoming';

  // Loading state
  if (battleLoading || barbersLoading) {
    return (
      <div className="pt-24 lg:pt-28 pb-8 px-4 max-w-7xl mx-auto">
        <Skeleton className="aspect-video w-full rounded-2xl" />
      </div>
    );
  }

  // Determine which barbers to display with rotation
  let displayBarbers = barbers && barbers.length >= 2 ? barbers : [];
  
  if (displayBarbers.length < 2 && featuredBarbers && featuredBarbers.length >= 2) {
    // Use rotation to show different pairs
    const start = rotationIndex % featuredBarbers.length;
    const end = (start + 1) % featuredBarbers.length;
    displayBarbers = [featuredBarbers[start], featuredBarbers[end]];
  }

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
  const isActiveBattle = battle?.status === 'active' || battle?.status === 'voting';
  const isBarber1CurrentUser = currentUserBarberPosition === 1;
  const isBarber2CurrentUser = currentUserBarberPosition === 2;

  return (
    <div className="pt-24 sm:pt-28 lg:pt-32 pb-4 sm:pb-6 lg:pb-8 px-2 sm:px-4 lg:px-6 max-w-[98vw] sm:max-w-5xl lg:max-w-6xl mx-auto space-y-3">
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
      <div className="w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[2/1] bg-card rounded-xl sm:rounded-2xl shadow-2xl border border-cyan/20 ring-1 ring-cyan/10 overflow-hidden relative">
        <div className="h-full flex">
          {/* Left Side - Barber 1 */}
          <div className="flex-1 relative overflow-hidden">
            {/* Flag Background with cinematic overlay */}
            <div 
              className="absolute inset-0 animate-pulse-slow" 
              style={{
                backgroundImage: `url(${getFlagImageUrl(barber1.country_code)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.5
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 via-black/60 to-black/80" />

            {/* Content - Redesigned horizontal layout */}
            <div className="relative h-full flex flex-col p-3 sm:p-4 lg:p-6">
              {/* Top Row: Avatar + Name + Stats horizontally */}
              <div className="flex items-center gap-2 sm:gap-3 mb-3">
                {/* Avatar */}
                <div 
                  onClick={() => navigate(`/barber/${barber1.user_id}`)}
                  className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden border-2 border-cyan/40 shadow-lg cursor-pointer hover:border-cyan hover:scale-105 transition-all flex-shrink-0 ring-2 ring-cyan/20"
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

                {/* Name and Stats */}
                <div className="flex flex-col min-w-0">
                  <h3 
                    onClick={() => navigate(`/barber/${barber1.user_id}`)}
                    className="text-white text-sm sm:text-base lg:text-lg font-bold drop-shadow-lg cursor-pointer hover:text-primary transition-colors truncate"
                  >
                    {barber1.display_name}
                  </h3>
                  <div className="flex gap-2 text-white/80 text-[10px] sm:text-xs">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-red-400" fill="currentColor" />
                      <span>{barber1.likes || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-cyan" />
                      <span>{barber1.followers || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Large Video Preview - Takes remaining space */}
              <div className="flex-1 min-h-0">
                {isBarber1CurrentUser && isStreamableBattle && battle ? (
                  <BarberHeroStreamControls
                    battleId={battle.id}
                    barberName={barber1.display_name || barber1.name}
                    onEnterBattle={() => navigate(`/battle/${battle.id}/contender`)}
                    className="h-full"
                  />
                ) : (
                  <BarberVideoSection 
                    videoId={barber1.is_live ? barber1.live_video_id : barber1.featured_video_id}
                    isLive={barber1.is_live}
                    viewerCount={isActiveBattle ? viewerData.barber1 : undefined}
                    aspectRatio="landscape"
                    className="rounded-lg shadow-xl h-full border border-cyan/20"
                  />
                )}
              </div>

              {/* Vote Button */}
              {isActiveBattle && !isBarber1CurrentUser && (
                <Button 
                  onClick={() => navigate(`/battle/${battle?.id}/theater`)}
                  className="mt-3 w-full bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-base sm:text-lg py-3 sm:py-4 rounded-lg shadow-xl hover:shadow-primary/50 transition-all hover:scale-[1.02] border border-cyan/30"
                >
                  🔥 VOTE NOW 🔥
                </Button>
              )}
            </div>
          </div>

          {/* VS Divider */}
          <div className="w-px bg-gradient-to-b from-transparent via-cyan/50 to-transparent relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-cyan/30">
              <span className="text-primary font-black text-xs sm:text-sm">VS</span>
            </div>
          </div>

          {/* Right Side - Barber 2 */}
          <div className="flex-1 relative overflow-hidden">
            {/* Flag Background with cinematic overlay */}
            <div 
              className="absolute inset-0 animate-pulse-slow" 
              style={{
                backgroundImage: `url(${getFlagImageUrl(barber2.country_code)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.5
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-bl from-blue-900/30 via-black/60 to-black/80" />

            {/* Content - Redesigned horizontal layout */}
            <div className="relative h-full flex flex-col p-3 sm:p-4 lg:p-6">
              {/* Top Row: Avatar + Name + Stats horizontally (aligned right) */}
              <div className="flex items-center justify-end gap-2 sm:gap-3 mb-3">
                {/* Name and Stats */}
                <div className="flex flex-col items-end min-w-0">
                  <h3 
                    onClick={() => navigate(`/barber/${barber2.user_id}`)}
                    className="text-white text-sm sm:text-base lg:text-lg font-bold drop-shadow-lg cursor-pointer hover:text-primary transition-colors truncate"
                  >
                    {barber2.display_name}
                  </h3>
                  <div className="flex gap-2 text-white/80 text-[10px] sm:text-xs">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-red-400" fill="currentColor" />
                      <span>{barber2.likes || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-cyan" />
                      <span>{barber2.followers || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Avatar */}
                <div 
                  onClick={() => navigate(`/barber/${barber2.user_id}`)}
                  className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden border-2 border-cyan/40 shadow-lg cursor-pointer hover:border-cyan hover:scale-105 transition-all flex-shrink-0 ring-2 ring-cyan/20"
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
              </div>

              {/* Large Video Preview - Takes remaining space */}
              <div className="flex-1 min-h-0">
                {isBarber2CurrentUser && isStreamableBattle && battle ? (
                  <BarberHeroStreamControls
                    battleId={battle.id}
                    barberName={barber2.display_name || barber2.name}
                    onEnterBattle={() => navigate(`/battle/${battle.id}/contender`)}
                    className="h-full"
                  />
                ) : (
                  <BarberVideoSection 
                    videoId={barber2.is_live ? barber2.live_video_id : barber2.featured_video_id}
                    isLive={barber2.is_live}
                    viewerCount={isActiveBattle ? viewerData.barber2 : undefined}
                    aspectRatio="landscape"
                    className="rounded-lg shadow-xl h-full border border-cyan/20"
                  />
                )}
              </div>

              {/* Vote Button */}
              {isActiveBattle && !isBarber2CurrentUser && (
                <Button 
                  onClick={() => navigate(`/battle/${battle?.id}/theater`)}
                  className="mt-3 w-full bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-base sm:text-lg py-3 sm:py-4 rounded-lg shadow-xl hover:shadow-primary/50 transition-all hover:scale-[1.02] border border-cyan/30"
                >
                  🔥 VOTE NOW 🔥
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
