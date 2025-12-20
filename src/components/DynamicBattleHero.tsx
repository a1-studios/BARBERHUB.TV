import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { BarberVideoSection } from "@/components/barber/BarberVideoSection";
import { BarberHeroStreamControls } from "@/components/streaming/BarberHeroStreamControls";
import { useRealtimeBattleViewers } from "@/hooks/useRealtimeBattleViewers";
import { useAuth } from "@/hooks/useAuth";
import { Heart, Users, Eye } from "lucide-react";
import { MobileVoteCenter } from "@/components/battles/MobileVoteCenter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Minimal inline vote button component
const VoteButton = ({ name, variant, onVote }: { name: string; variant: 'primary' | 'cyan'; onVote: () => void }) => {
  const [voted, setVoted] = useState(false);
  
  const handleClick = () => {
    if (voted) return;
    setVoted(true);
    onVote();
  };
  
  const colors = variant === 'primary' 
    ? 'bg-primary/20 border-primary/40 hover:bg-primary/40 text-primary' 
    : 'bg-cyan/20 border-cyan/40 hover:bg-cyan/40 text-cyan';
  
  return (
    <motion.button
      onClick={handleClick}
      disabled={voted}
      className={`px-2 py-0.5 rounded text-[8px] font-medium border transition-all truncate max-w-[50px] ${colors} ${voted ? 'opacity-50' : ''}`}
      whileTap={{ scale: 0.95 }}
    >
      {voted ? '✓' : 'Vote'}
    </motion.button>
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
        .limit(10);
      
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
        const { data: submissions } = await supabase
          .from('battle_submissions')
          .select('id')
          .eq('battle_id', battle.id)
          .eq('user_id', choice === 1 ? battle.barber1_id : battle.barber2_id)
          .single();
        
        if (submissions) {
          const { error } = await supabase
            .from('battle_votes')
            .insert({
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
          toast.success(`Vote for ${barberName} recorded!`);
        }
      } catch {
        toast.success(`Vote for ${barberName} recorded!`);
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
    return (
      <div className="pt-8 sm:pt-12 pb-8 px-4 max-w-7xl mx-auto">
        <Skeleton className="aspect-video w-full rounded-2xl" />
      </div>
    );
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
    return (
      <div className="pt-8 sm:pt-12 pb-8 px-4 max-w-7xl mx-auto">
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
  const isCurrentUserInBattle = isBarber1CurrentUser || isBarber2CurrentUser;

  // Calculate vote percentages for progress bar
  const totalVotes = (viewerData.barber1 || 0) + (viewerData.barber2 || 0);
  const barber1Percent = totalVotes > 0 ? ((viewerData.barber1 || 0) / totalVotes) * 100 : 50;

  return (
    <div className="pt-8 sm:pt-12 pb-2 sm:pb-4 px-0 sm:px-4 max-w-[100vw] sm:max-w-5xl lg:max-w-6xl mx-auto">
      {/* Full viewport height on mobile, fixed aspect ratio on larger screens */}
      <div className="w-full h-[calc(100vh-5rem)] sm:h-auto sm:aspect-[2/1] lg:aspect-[21/9] bg-card sm:rounded-xl shadow-2xl border-0 sm:border border-cyan/20 overflow-hidden relative">
        
        <div className="h-full flex flex-col sm:flex-row">
          {/* Top/Left Side - Barber 1 */}
          <div className="flex-1 relative overflow-hidden min-h-0">
            {/* Flag Background */}
            <div 
              className="absolute inset-0 animate-pulse-slow" 
              style={{
                backgroundImage: `url(${getFlagImageUrl(barber1.country_code)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.4
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black/70 to-black/90" />

            {/* Content */}
            <div className="relative h-full flex flex-col p-2 sm:p-3">
              {/* Compact Header Row */}
              <div className="flex items-center gap-2 mb-2">
                <div 
                  onClick={() => navigate(`/barber/${barber1.user_id}`)}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-cyan/40 cursor-pointer hover:scale-105 transition-all flex-shrink-0"
                >
                  {barber1.avatar_url ? (
                    <img src={barber1.avatar_url} alt={barber1.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <h3 
                    onClick={() => navigate(`/barber/${barber1.user_id}`)}
                    className="text-white text-xs sm:text-sm font-bold cursor-pointer hover:text-primary transition-colors truncate"
                  >
                    {barber1.display_name}
                  </h3>
                  <div className="flex gap-2 text-white/70 text-[9px] sm:text-[10px]">
                    <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 text-red-400" fill="currentColor" />{barber1.likes || 0}</span>
                    <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5 text-cyan" />{barber1.followers || 0}</span>
                  </div>
                </div>
                {/* Vote button next to profile */}
                {isActiveBattle && !isCurrentUserInBattle && (
                  <VoteButton 
                    name={barber1.display_name || barber1.name} 
                    variant="primary" 
                    onVote={() => handleVote(1)} 
                  />
                )}
              </div>

              {/* Maximized Video Area */}
              <div className="flex-1 min-h-0 relative">
                {isBarber1CurrentUser && isStreamableBattle && battle ? (
                  <BarberHeroStreamControls
                    battleId={battle.id}
                    barberName={barber1.display_name || barber1.name}
                    onEnterBattle={() => navigate(`/battle/${battle.id}/contender`)}
                    className="h-full"
                  />
                ) : (
                  <div className="relative h-full">
                    <BarberVideoSection 
                      videoId={barber1.is_live ? barber1.live_video_id : barber1.featured_video_id}
                      isLive={barber1.is_live}
                      aspectRatio="landscape"
                      className="rounded-lg h-full border border-cyan/10"
                    />
                    {/* Viewer Count Overlay */}
                    {isActiveBattle && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] sm:text-[10px] text-white/90">
                        <Eye className="w-2.5 h-2.5" />
                        <span>{viewerData.barber1}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* VS Divider - Clean with lightning flash every 5s */}
          {!(isMobile && isActiveBattle && !isCurrentUserInBattle) && (
            <div className="h-3 sm:h-auto sm:w-12 relative flex-shrink-0 flex items-center justify-center">
              {/* LIVE Badge */}
              {isActiveBattle && (
                <motion.div 
                  className="absolute top-1 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 px-1 py-0.5 rounded bg-red-500/90"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  <div className="w-1 h-1 bg-white rounded-full" />
                  <span className="text-[6px] font-black text-white uppercase">Live</span>
                </motion.div>
              )}
              
              {/* VS Text with lightning flash every 5 seconds */}
              <motion.span 
                className="relative z-10 text-primary font-black text-xl tracking-wider"
                animate={{ 
                  textShadow: [
                    "0 0 0px transparent",
                    "0 0 0px transparent",
                    "0 0 0px transparent",
                    "0 0 0px transparent",
                    "0 0 30px hsl(var(--primary)), 0 0 60px hsl(187 100% 50%), 0 0 100px hsl(var(--primary))",
                    "0 0 5px hsl(var(--primary))",
                    "0 0 0px transparent"
                  ],
                  scale: [1, 1, 1, 1, 1.15, 1.05, 1],
                  color: [
                    "hsl(var(--primary))",
                    "hsl(var(--primary))",
                    "hsl(var(--primary))",
                    "hsl(var(--primary))",
                    "hsl(187 100% 70%)",
                    "hsl(var(--primary))",
                    "hsl(var(--primary))"
                  ]
                }}
                transition={{ 
                  duration: 5, 
                  repeat: Infinity, 
                  times: [0, 0.85, 0.9, 0.92, 0.94, 0.97, 1],
                  ease: "easeInOut" 
                }}
              >
                VS
              </motion.span>
            </div>
          )}

          {/* Mobile Vote Center - Replaces VS divider on mobile during active battles */}
          {isMobile && isActiveBattle && !isCurrentUserInBattle && (
            <div className="py-2 px-2 flex-shrink-0">
              <MobileVoteCenter
                barber1Name={barber1.display_name || barber1.name}
                barber2Name={barber2.display_name || barber2.name}
                onVote={handleVote}
                isLive={isActiveBattle}
              />
            </div>
          )}

          {/* Bottom/Right Side - Barber 2 */}
          <div className="flex-1 relative overflow-hidden min-h-0">
            {/* Flag Background */}
            <div 
              className="absolute inset-0 animate-pulse-slow" 
              style={{
                backgroundImage: `url(${getFlagImageUrl(barber2.country_code)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.4
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-bl from-blue-900/20 via-black/70 to-black/90" />

            {/* Content */}
            <div className="relative h-full flex flex-col p-2 sm:p-3">
              {/* Compact Header Row - Right Aligned */}
              <div className="flex items-center justify-end gap-2 mb-2">
                {/* Vote button next to profile */}
                {isActiveBattle && !isCurrentUserInBattle && (
                  <VoteButton 
                    name={barber2.display_name || barber2.name} 
                    variant="cyan" 
                    onVote={() => handleVote(2)} 
                  />
                )}
                <div className="flex flex-col items-end min-w-0 flex-1">
                  <h3 
                    onClick={() => navigate(`/barber/${barber2.user_id}`)}
                    className="text-white text-xs sm:text-sm font-bold cursor-pointer hover:text-primary transition-colors truncate"
                  >
                    {barber2.display_name}
                  </h3>
                  <div className="flex gap-2 text-white/70 text-[9px] sm:text-[10px]">
                    <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 text-red-400" fill="currentColor" />{barber2.likes || 0}</span>
                    <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5 text-cyan" />{barber2.followers || 0}</span>
                  </div>
                </div>
                <div 
                  onClick={() => navigate(`/barber/${barber2.user_id}`)}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-cyan/40 cursor-pointer hover:scale-105 transition-all flex-shrink-0"
                >
                  {barber2.avatar_url ? (
                    <img src={barber2.avatar_url} alt={barber2.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
                  )}
                </div>
              </div>

              {/* Maximized Video Area */}
              <div className="flex-1 min-h-0 relative">
                {isBarber2CurrentUser && isStreamableBattle && battle ? (
                  <BarberHeroStreamControls
                    battleId={battle.id}
                    barberName={barber2.display_name || barber2.name}
                    onEnterBattle={() => navigate(`/battle/${battle.id}/contender`)}
                    className="h-full"
                  />
                ) : (
                  <div className="relative h-full">
                    <BarberVideoSection 
                      videoId={barber2.is_live ? barber2.live_video_id : barber2.featured_video_id}
                      isLive={barber2.is_live}
                      aspectRatio="landscape"
                      className="rounded-lg h-full border border-cyan/10"
                    />
                    {/* Viewer Count Overlay */}
                    {isActiveBattle && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] sm:text-[10px] text-white/90">
                        <Eye className="w-2.5 h-2.5" />
                        <span>{viewerData.barber2}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* Thin Progress Bar at Bottom */}
        {isActiveBattle && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 flex">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-primary transition-all duration-500"
              style={{ width: `${barber1Percent}%` }}
            />
            <div 
              className="h-full bg-gradient-to-r from-cyan to-blue-500 transition-all duration-500"
              style={{ width: `${100 - barber1Percent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
