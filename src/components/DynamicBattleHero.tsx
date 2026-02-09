import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { BarberVideoSection } from "@/components/barber/BarberVideoSection";
import { BarberHeroStreamControls } from "@/components/streaming/BarberHeroStreamControls";
import { useRealtimeBattleViewers } from "@/hooks/useRealtimeBattleViewers";
import { useAuth } from "@/hooks/useAuth";
import { Eye } from "lucide-react";
import { MobileVoteCenter } from "@/components/battles/MobileVoteCenter";
import { ArenaActionBar } from "@/components/battles/ArenaActionBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const getCountryFlag = (countryCode?: string) => {
  if (!countryCode) return '';
  return String.fromCodePoint(
    ...countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0))
  );
};

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
  const [voted1, setVoted1] = useState(false);
  const [voted2, setVoted2] = useState(false);

  // Fetch active battle (active, voting or upcoming)
  const {
    data: battle,
    isLoading: battleLoading
  } = useQuery({
    queryKey: ['activeBattle'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('battles').select('*').in('status', ['active', 'voting', 'upcoming']).not('barber1_id', 'is', null).not('barber2_id', 'is', null).order('created_at', {
        ascending: false
      }).limit(1).maybeSingle();
      if (error) throw error;
      return data as Battle | null;
    },
    refetchInterval: 10000
  });

  // Fetch barber profiles for the battle using unified view
  const {
    data: barbers,
    isLoading: barbersLoading
  } = useQuery({
    queryKey: ['battleBarbers', battle?.barber1_id, battle?.barber2_id],
    queryFn: async () => {
      if (!battle?.barber1_id || !battle?.barber2_id) return [];
      const {
        data,
        error
      } = await supabase.from('public_barber_profiles').select('*').in('barber_id', [battle.barber1_id, battle.barber2_id]);
      if (error) throw error;

      // Transform to BarberProfile format and preserve order
      const orderedBarbers = [data?.find(b => b.barber_id === battle.barber1_id), data?.find(b => b.barber_id === battle.barber2_id)].filter(Boolean).map(barber => ({
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
  const {
    data: featuredBarbers
  } = useQuery({
    queryKey: ['featuredBarbers'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('public_barber_profiles').select('*').order('barber_updated_at', {
        ascending: false
      }).limit(10);
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

  // Handle vote from slider/buttons
  const handleVote = async (choice: 1 | 2) => {
    if (!user) {
      toast.error("Please sign in to vote");
      return;
    }
    if (battle && barbers) {
      const votedBarber = choice === 1 ? barbers[0] : barbers[1];
      const barberName = votedBarber?.display_name || votedBarber?.name || 'Barber';

      // Submit vote directly
      try {
        // Get submission for the chosen barber
        const {
          data: submissions
        } = await supabase.from('battle_submissions').select('id').eq('battle_id', battle.id).eq('user_id', choice === 1 ? battle.barber1_id : battle.barber2_id).single();
        if (submissions) {
          const {
            error
          } = await supabase.from('battle_votes').insert({
            battle_id: battle.id,
            submission_id: submissions.id,
            voter_id: user.id
          });
          if (error) {
            if (error.code === '23505') {
              toast.error("You've already voted in this battle");
            } else {
              toast.error("Failed to submit vote");
            }
          } else {
            toast.success(`Vote for ${barberName} recorded!`);
          }
        } else {
          toast.info("No submission found for this barber yet");
        }
      } catch {
        toast.error("Failed to submit vote");
      }
    }
  };

  // IMPORTANT: Call hooks before any conditional returns
  const viewerData = useRealtimeBattleViewers(battle?.id || '');
  const isMobile = useIsMobile();

  // Check if current battle is active
  const isStreamableBattle = battle?.status === 'active' || battle?.status === 'voting' || battle?.status === 'upcoming';

  // Loading state
  if (battleLoading || barbersLoading) {
  return <div className="pt-1 sm:pt-2 pb-8 px-4 max-w-7xl mx-auto">
        <Skeleton className="aspect-video w-full rounded-2xl" />
      </div>;
  }

  // Determine which barbers to display with rotation
  let displayBarbers = barbers && barbers.length >= 2 ? barbers : [];
  if (displayBarbers.length < 2 && featuredBarbers && featuredBarbers.length >= 2) {
    const start = rotationIndex % featuredBarbers.length;
    const end = (start + 1) % featuredBarbers.length;
    displayBarbers = [featuredBarbers[start], featuredBarbers[end]];
  }

  // If no barbers at all
  if (displayBarbers.length < 2) {
    return <div className="pt-1 sm:pt-2 pb-8 px-4 max-w-7xl mx-auto">
        <div className="aspect-video bg-card rounded-2xl shadow-2xl border-2 border-primary/50 flex items-center justify-center">
          <p className="text-muted-foreground">No barbers to showcase yet</p>
        </div>
      </div>;
  }
  const barber1 = displayBarbers[0];
  const barber2 = displayBarbers[1];
  
  // Battle phase logic - voting only after battle ends
  const isLiveBattle = battle?.status === 'active';
  const isVotingPhase = battle?.status === 'voting';
  const isActiveBattle = isLiveBattle || isVotingPhase;
  
  
  const isBarber1CurrentUser = currentUserBarberPosition === 1;
  const isBarber2CurrentUser = currentUserBarberPosition === 2;
  const isCurrentUserInBattle = isBarber1CurrentUser || isBarber2CurrentUser;

  // Calculate vote percentages for progress bar
  const totalVotes = (viewerData.barber1 || 0) + (viewerData.barber2 || 0);
  const barber1Percent = totalVotes > 0 ? (viewerData.barber1 || 0) / totalVotes * 100 : 50;
  return <div className="pt-1 sm:pt-2 pb-0 px-0 sm:px-4 max-w-[100vw] sm:max-w-5xl lg:max-w-6xl mx-auto">
      {/* Full viewport height on mobile, fixed aspect ratio on larger screens */}
      <div className="w-full h-[calc(100vh-5rem)] sm:h-auto sm:aspect-[2/1] lg:aspect-[21/9] bg-card sm:rounded-xl shadow-2xl border-0 sm:border border-cyan/20 overflow-hidden relative">
        
        
        <div className="h-full flex flex-col sm:flex-row">
          {/* Top/Left Side - Barber 1 */}
          <div className="flex-1 relative overflow-hidden min-h-0">
            {/* Flag Background */}
            <div className="absolute inset-0 animate-pulse-slow" style={{
            backgroundImage: `url(${getFlagImageUrl(barber1.country_code)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.4
          }} />
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black/70 to-black/90" />

            {/* Content - full bleed */}
            <div className="relative h-full">
              {/* Maximized Video Area */}
              <div className="h-full relative">
                {isBarber1CurrentUser && isStreamableBattle && battle ? (
                  <BarberHeroStreamControls battleId={battle.id} barberName={barber1.display_name || barber1.name} onEnterBattle={() => navigate(`/battle/${battle.id}/contender`)} className="h-full" />
                ) : (
                  <div className="relative h-full">
                    <BarberVideoSection videoId={barber1.is_live ? barber1.live_video_id : barber1.featured_video_id} isLive={barber1.is_live} aspectRatio="landscape" className="rounded-lg h-full border border-cyan/10" />
                  </div>
                )}

                {/* Name overlay - top left */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/20 backdrop-blur-sm rounded-full px-2 py-0.5">
                  <span className="text-[10px]">{getCountryFlag(barber1.country_code)}</span>
                  <span className="text-[10px] text-white/80 font-medium truncate max-w-[100px]">{barber1.display_name}</span>
                </div>

                {/* Viewer Count Overlay - top right */}
                {isActiveBattle && (
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] sm:text-[10px] text-white/90">
                    <Eye className="w-2.5 h-2.5" />
                    <span>{viewerData.barber1}</span>
                  </div>
                )}

                {/* Action Bar */}
                {!isBarber1CurrentUser && (
                  <ArenaActionBar
                    barber={barber1}
                    variant="primary"
                    showVote={isVotingPhase && !isCurrentUserInBattle}
                    onVote={() => { setVoted1(true); handleVote(1); }}
                    hasVoted={voted1}
                  />
                )}
              </div>
            </div>
          </div>

          {/* VS - Floating centered with rotating frame and lightning flash every 3s */}
          {!(isMobile && isActiveBattle && !isCurrentUserInBattle) && <>
              {/* LIVE Badge - absolute positioned */}
              
              {/* VS Container - absolute centered between videos */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center">
                {/* Rotating ring frame */}
                <motion.div 
                  className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-primary/60"
                  style={{
                    borderStyle: 'dashed',
                    borderSpacing: '4px',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
                {/* Inner glow ring */}
                <motion.div 
                  className="absolute w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-cyan/40"
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
                {/* VS Text */}
                <motion.span 
                  className="text-lg sm:text-xl font-bold tracking-[0.3em] italic bg-gradient-to-r from-primary via-cyan to-primary bg-clip-text text-transparent drop-shadow-lg"
                  animate={{
                    textShadow: ["0 0 0px transparent", "0 0 0px transparent", "0 0 30px hsl(187 100% 50%), 0 0 60px hsl(var(--primary))", "0 0 5px hsl(187 100% 50%)", "0 0 0px transparent"],
                    scale: [1, 1, 1.15, 1.05, 1],
                  }} 
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    times: [0, 0.8, 0.88, 0.94, 1],
                    ease: "easeInOut"
                  }}
                >
                  VS
                </motion.span>
              </div>
            </>}

          {/* Mobile Vote Center - Replaces VS divider on mobile during active battles */}
          {isMobile && isActiveBattle && !isCurrentUserInBattle && <div className="py-2 px-2 flex-shrink-0">
              <MobileVoteCenter barber1Name={barber1.display_name || barber1.name} barber2Name={barber2.display_name || barber2.name} onVote={handleVote} isLive={isActiveBattle} />
            </div>}

          {/* Bottom/Right Side - Barber 2 */}
          <div className="flex-1 relative overflow-hidden min-h-0">
            {/* Flag Background */}
            <div className="absolute inset-0 animate-pulse-slow" style={{
            backgroundImage: `url(${getFlagImageUrl(barber2.country_code)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.4
          }} />
            <div className="absolute inset-0 bg-gradient-to-bl from-blue-900/20 via-black/70 to-black/90" />

            {/* Content - full bleed */}
            <div className="relative h-full">
              {/* Maximized Video Area */}
              <div className="h-full relative">
                {isBarber2CurrentUser && isStreamableBattle && battle ? (
                  <BarberHeroStreamControls battleId={battle.id} barberName={barber2.display_name || barber2.name} onEnterBattle={() => navigate(`/battle/${battle.id}/contender`)} className="h-full" />
                ) : (
                  <div className="relative h-full">
                    <BarberVideoSection videoId={barber2.is_live ? barber2.live_video_id : barber2.featured_video_id} isLive={barber2.is_live} aspectRatio="landscape" className="rounded-lg h-full border border-cyan/10" />
                  </div>
                )}

                {/* Name overlay - top right */}
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-black/20 backdrop-blur-sm rounded-full px-2 py-0.5">
                  <span className="text-[10px] text-white/80 font-medium truncate max-w-[100px]">{barber2.display_name}</span>
                  <span className="text-[10px]">{getCountryFlag(barber2.country_code)}</span>
                </div>

                {/* Viewer Count Overlay - top left (mirrored) */}
                {isActiveBattle && (
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] sm:text-[10px] text-white/90">
                    <Eye className="w-2.5 h-2.5" />
                    <span>{viewerData.barber2}</span>
                  </div>
                )}

                {/* Action Bar */}
                {!isBarber2CurrentUser && (
                  <ArenaActionBar
                    barber={barber2}
                    variant="cyan"
                    showVote={isVotingPhase && !isCurrentUserInBattle}
                    onVote={() => { setVoted2(true); handleVote(2); }}
                    hasVoted={voted2}
                  />
                )}
              </div>
            </div>
          </div>
        </div>


        {/* Thin Progress Bar at Bottom - only during active/voting battles */}
        {isActiveBattle && <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 flex">
            <div className="h-full bg-gradient-to-r from-orange-500 to-primary transition-all duration-500" style={{
          width: `${barber1Percent}%`
        }} />
            <div className="h-full bg-gradient-to-r from-cyan to-blue-500 transition-all duration-500" style={{
          width: `${100 - barber1Percent}%`
        }} />
          </div>}
      </div>
    </div>;
};