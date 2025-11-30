import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TaleOfTheTape } from "@/components/battles/TaleOfTheTape";
import { PastHighlight } from "@/components/battles/PastHighlight";
import { BarberVideoSection } from "@/components/barber/BarberVideoSection";
import { BarberHeroStreamControls } from "@/components/streaming/BarberHeroStreamControls";
import { LiveBattleIndicator } from "@/components/battles/LiveBattleIndicator";
import { useRealtimeBattleViewers } from "@/hooks/useRealtimeBattleViewers";
import { useAuth } from "@/hooks/useAuth";
import { Heart, Users, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SlideType = 'live' | 'upcoming' | 'highlight';

interface BarberProfile {
  id: string;
  user_id: string;
  name: string;
  display_name?: string;
  avatar_url?: string;
  country_code?: string;
  featured_video_id?: string;
  live_video_id?: string;
  is_live?: boolean;
  followers?: number;
  likes?: number;
  specialty?: string;
}

interface Battle {
  id: string;
  title: string;
  barber1_id: string;
  barber2_id: string;
  status: string;
  starts_at?: string;
  winner_id?: string;
  prize_amount?: number;
  category?: string;
}

export const BattleArenaCarousel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [currentUserBarberPosition, setCurrentUserBarberPosition] = useState<1 | 2 | null>(null);

  // Fetch active/live battle
  const { data: activeBattle, isLoading: activeBattleLoading } = useQuery({
    queryKey: ['activeBattle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .in('status', ['active', 'voting'])
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

  // Fetch upcoming battle
  const { data: upcomingBattle } = useQuery({
    queryKey: ['upcomingBattle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .eq('status', 'upcoming')
        .not('barber1_id', 'is', null)
        .not('barber2_id', 'is', null)
        .gt('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as Battle | null;
    },
    enabled: !activeBattle
  });

  // Fetch past battle (completed with winner)
  const { data: pastBattle } = useQuery({
    queryKey: ['pastBattle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .eq('status', 'completed')
        .not('winner_id', 'is', null)
        .not('barber1_id', 'is', null)
        .not('barber2_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as Battle | null;
    }
  });

  // Determine which battle to show on current slide
  const currentBattle = activeBattle || upcomingBattle || pastBattle;

  // Fetch barber profiles for current battle
  const { data: barbers, isLoading: barbersLoading } = useQuery({
    queryKey: ['carouselBarbers', currentBattle?.barber1_id, currentBattle?.barber2_id],
    queryFn: async () => {
      if (!currentBattle?.barber1_id || !currentBattle?.barber2_id) return [];

      const { data, error } = await supabase
        .from('public_barber_profiles')
        .select('*')
        .in('barber_id', [currentBattle.barber1_id, currentBattle.barber2_id]);
      
      if (error) throw error;

      const orderedBarbers = [
        data?.find(b => b.barber_id === currentBattle.barber1_id),
        data?.find(b => b.barber_id === currentBattle.barber2_id)
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
        likes: barber.like_count,
        specialty: barber.specialty
      })) as BarberProfile[];

      return orderedBarbers;
    },
    enabled: !!currentBattle?.barber1_id && !!currentBattle?.barber2_id
  });

  // Detect current user's barber position
  useEffect(() => {
    if (user && barbers && barbers.length >= 2 && activeBattle) {
      if (barbers[0]?.user_id === user.id) {
        setCurrentUserBarberPosition(1);
      } else if (barbers[1]?.user_id === user.id) {
        setCurrentUserBarberPosition(2);
      } else {
        setCurrentUserBarberPosition(null);
      }
    } else {
      setCurrentUserBarberPosition(null);
    }
  }, [user, barbers, activeBattle]);

  // Build slides array based on available content
  const slides: SlideType[] = [];
  if (activeBattle) slides.push('live');
  if (upcomingBattle && !activeBattle) slides.push('upcoming');
  if (pastBattle) slides.push('highlight');
  
  // Default to at least one slide
  if (slides.length === 0 && currentBattle) {
    slides.push(activeBattle ? 'live' : upcomingBattle ? 'upcoming' : 'highlight');
  }

  // Auto-advance carousel every 7 seconds
  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 7000);
    
    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 15 seconds
    setTimeout(() => setIsAutoPlaying(true), 15000);
  }, []);

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % slides.length);
  }, [currentSlide, slides.length, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + slides.length) % slides.length);
  }, [currentSlide, slides.length, goToSlide]);

  // Real-time viewer data
  const viewerData = useRealtimeBattleViewers(activeBattle?.id || '');

  const getFlagImageUrl = (countryCode?: string) => {
    if (!countryCode) return "";
    return `https://flagcdn.com/w1600/${countryCode.toLowerCase()}.jpg`;
  };

  if (activeBattleLoading || barbersLoading) {
    return (
      <div className="pt-24 sm:pt-28 lg:pt-32 pb-4 sm:pb-6 lg:pb-8 px-2 sm:px-4 lg:px-6 max-w-[98vw] sm:max-w-5xl lg:max-w-6xl mx-auto">
        <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
      </div>
    );
  }

  if (!currentBattle || !barbers || barbers.length < 2) {
    return (
      <div className="pt-24 sm:pt-28 lg:pt-32 pb-4 sm:pb-6 lg:pb-8 px-2 sm:px-4 lg:px-6 max-w-[98vw] sm:max-w-5xl lg:max-w-6xl mx-auto">
        <div className="aspect-[16/9] bg-card rounded-2xl shadow-2xl border border-cyan/20 flex items-center justify-center">
          <p className="text-muted-foreground">No battles to showcase yet</p>
        </div>
      </div>
    );
  }

  const barber1 = barbers[0];
  const barber2 = barbers[1];
  const isActiveBattle = activeBattle?.status === 'active' || activeBattle?.status === 'voting';
  const currentSlideType = slides[currentSlide] || 'live';

  const renderLiveBattleSlide = () => (
    <div className="h-full flex">
      {/* Left Side - Barber 1 */}
      <div className="flex-1 relative overflow-hidden">
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

        <div className="relative h-full flex flex-col p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <div 
              onClick={() => navigate(`/barber/${barber1.user_id}`)}
              className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden border-2 border-cyan/40 shadow-lg cursor-pointer hover:border-cyan hover:scale-105 transition-all flex-shrink-0 ring-2 ring-cyan/20"
            >
              {barber1.avatar_url ? (
                <img src={barber1.avatar_url} alt={barber1.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
              )}
            </div>

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

          <div className="flex-1 min-h-0">
            {currentUserBarberPosition === 1 && activeBattle ? (
              <BarberHeroStreamControls
                battleId={activeBattle.id}
                barberName={barber1.display_name || barber1.name}
                onEnterBattle={() => navigate(`/battle/${activeBattle.id}/contender`)}
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

          {isActiveBattle && currentUserBarberPosition !== 1 && (
            <Button 
              onClick={() => navigate(`/battle/${activeBattle?.id}/theater`)}
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

        <div className="relative h-full flex flex-col p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-end gap-2 sm:gap-3 mb-3">
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

            <div 
              onClick={() => navigate(`/barber/${barber2.user_id}`)}
              className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden border-2 border-cyan/40 shadow-lg cursor-pointer hover:border-cyan hover:scale-105 transition-all flex-shrink-0 ring-2 ring-cyan/20"
            >
              {barber2.avatar_url ? (
                <img src={barber2.avatar_url} alt={barber2.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {currentUserBarberPosition === 2 && activeBattle ? (
              <BarberHeroStreamControls
                battleId={activeBattle.id}
                barberName={barber2.display_name || barber2.name}
                onEnterBattle={() => navigate(`/battle/${activeBattle.id}/contender`)}
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

          {isActiveBattle && currentUserBarberPosition !== 2 && (
            <Button 
              onClick={() => navigate(`/battle/${activeBattle?.id}/theater`)}
              className="mt-3 w-full bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-base sm:text-lg py-3 sm:py-4 rounded-lg shadow-xl hover:shadow-primary/50 transition-all hover:scale-[1.02] border border-cyan/30"
            >
              🔥 VOTE NOW 🔥
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="pt-24 sm:pt-28 lg:pt-32 pb-4 sm:pb-6 lg:pb-8 px-2 sm:px-4 lg:px-6 max-w-[98vw] sm:max-w-5xl lg:max-w-6xl mx-auto space-y-3">
      {/* Live Badge */}
      {isActiveBattle && (
        <div className="flex justify-center">
          <LiveBattleIndicator />
        </div>
      )}

      {/* Main Carousel Container */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[2/1] bg-card rounded-xl sm:rounded-2xl shadow-2xl border border-cyan/20 ring-1 ring-cyan/10 overflow-hidden">
        {/* Slide Content */}
        <div className="h-full">
          {currentSlideType === 'live' && renderLiveBattleSlide()}
          
          {currentSlideType === 'upcoming' && upcomingBattle && (
            <TaleOfTheTape
              barber1={barber1}
              barber2={barber2}
              battleId={upcomingBattle.id}
              startsAt={new Date(upcomingBattle.starts_at || Date.now())}
              category={upcomingBattle.category}
            />
          )}
          
          {currentSlideType === 'highlight' && pastBattle && pastBattle.winner_id && (
            <PastHighlight
              winner={pastBattle.winner_id === barber1.user_id ? barber1 : barber2}
              loser={pastBattle.winner_id === barber1.user_id ? barber2 : barber1}
              battleId={pastBattle.id}
              battleTitle={pastBattle.title}
              prizeAmount={pastBattle.prize_amount}
            />
          )}
        </div>

        {/* Navigation Arrows (only if multiple slides) */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-cyan/30 flex items-center justify-center text-white hover:bg-black/80 transition-all z-10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-cyan/30 flex items-center justify-center text-white hover:bg-black/80 transition-all z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentSlide 
                    ? "bg-primary w-6" 
                    : "bg-white/40 hover:bg-white/60"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
