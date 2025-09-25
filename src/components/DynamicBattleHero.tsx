import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Share2, Play, Heart, TrendingUp, Users, DollarSign, Upload } from "lucide-react";
import { BattleCommentsPanel } from "./BattleCommentsPanel";
import { DonationModal } from "./DonationModal";
import { VideoPlayer } from "./VideoPlayer";
import { VideoUpload } from "./VideoUpload";
import { VerificationBadge } from "./VerificationBadge";
import { AddFundsModal } from "./AddFundsModal";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLikes } from "@/hooks/useLikes";
import { useBarberBucks } from "@/hooks/useBarberBucks";
import { toast } from "sonner";

interface Battle {
  id: string;
  title: string;
  barber1_id: string;
  barber2_id: string;
  vote_count1: number;
  vote_count2: number;
  status: string;
}

interface BarberProfile {
  id: string;
  user_id: string;
  name: string;
  bio?: string;
  location?: string;
  country_code?: string;
  profiles?: {
    avatar_url?: string;
    display_name?: string;
  };
}

interface BattleSubmission {
  id: string;
  user_id: string;
  battle_id: string;
  media_url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  status: string;
}

export const DynamicBattleHero = () => {
  const { user } = useAuth();
  const { profile, isFan, isBarber, isVerified } = useUserProfile();
  const { toggleLike } = useLikes();
  const { checkFunds, showAddFundsModal, setShowAddFundsModal } = useBarberBucks();
  
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [selectedBarberName, setSelectedBarberName] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Fetch real barber profiles for display
  const { data: displayBarbers, isLoading: displayBarbersLoading } = useQuery({
    queryKey: ['displayBarbers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_profiles')
        .select(`
          id,
          user_id,
          name,
          bio,
          location,
          country_code,
          profiles!inner(avatar_url, display_name)
        `)
        .limit(2);
      if (error) throw error;
      return data as BarberProfile[];
    },
  });

  // Get like states for real barbers
  const barber1LikeQuery = useQuery({
    queryKey: ['user_like', displayBarbers?.[0]?.user_id, user?.id],
    queryFn: async () => {
      if (!user || !displayBarbers?.[0]?.user_id) return false;
      const { data, error } = await supabase
        .from('creator_likes')
        .select('id')
        .eq('creator_id', displayBarbers[0].user_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!displayBarbers?.[0]?.user_id
  });

  const barber2LikeQuery = useQuery({
    queryKey: ['user_like', displayBarbers?.[1]?.user_id, user?.id],
    queryFn: async () => {
      if (!user || !displayBarbers?.[1]?.user_id) return false;
      const { data, error } = await supabase
        .from('creator_likes')
        .select('id')
        .eq('creator_id', displayBarbers[1].user_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!displayBarbers?.[1]?.user_id
  });

  // Fetch active battle
  const { data: battle, isLoading: battleLoading } = useQuery({
    queryKey: ['activeBattle'],
    queryFn: async () => {
      // First try to find a voting battle
      let { data, error } = await supabase
        .from('battles')
        .select('*')
        .eq('status', 'voting')
        .not('barber1_id', 'is', null)
        .not('barber2_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // If no voting battle, try upcoming battles
      if (!data) {
        const upcomingResult = await supabase
          .from('battles')
          .select('*')
          .eq('status', 'upcoming')
          .not('barber1_id', 'is', null)
          .not('barber2_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        data = upcomingResult.data;
        error = upcomingResult.error;
      }
      if (error) throw error;
      return data as Battle | null;
    },
    refetchInterval: 5000 // Refresh every 5 seconds for live updates
  });

  // Fetch barber profiles for the battle
  const { data: barbers, isLoading: barbersLoading } = useQuery({
    queryKey: ['battleBarbers', battle?.barber1_id, battle?.barber2_id],
    queryFn: async () => {
      if (!battle?.barber1_id || !battle?.barber2_id) return [];
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('id, user_id, name')
        .in('user_id', [battle.barber1_id, battle.barber2_id]);
      if (error) throw error;
      return data;
    },
    enabled: !!battle?.barber1_id && !!battle?.barber2_id
  });

  // Fetch battle submissions
  const { data: submissions, refetch: refetchSubmissions } = useQuery({
    queryKey: ['battleSubmissions', battle?.id],
    queryFn: async () => {
      if (!battle?.id) return [];
      const { data, error } = await supabase
        .from('battle_submissions')
        .select('*')
        .eq('battle_id', battle.id);
      if (error) throw error;
      return data as BattleSubmission[];
    },
    enabled: !!battle?.id
  });

  const handleVote = async (barberId: string) => {
    if (!user || !battle) {
      toast.error("Please sign in to vote");
      return;
    }

    // Check if user is a fan
    if (!isFan) {
      toast.error("Only fans can vote in battles");
      return;
    }
    
    try {
      // Find the submission for this barber
      const barberSubmission = submissions?.find(sub => sub.user_id === barberId);
      if (!barberSubmission) {
        toast.error("No submission found for this barber");
        return;
      }
      
      const { error } = await supabase
        .from('battle_votes')
        .insert({
          battle_id: battle.id,
          voter_id: user.id,
          submission_id: barberSubmission.id
        });
      
      if (error) throw error;
      toast.success("Vote cast successfully!");
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("You have already voted in this battle");
      } else {
        toast.error("Failed to cast vote");
      }
    }
  };

  const handleLike = async (barberId: string) => {
    if (!user) {
      toast.error("Please sign in to like barbers");
      return;
    }

    let isLiked = false;
    if (barberId === displayBarbers?.[0]?.user_id) {
      isLiked = barber1LikeQuery.data || false;
    } else if (barberId === displayBarbers?.[1]?.user_id) {
      isLiked = barber2LikeQuery.data || false;
    }
    
    toggleLike.mutate({ creatorId: barberId, isLiked });
  };

  const handleDonate = (barberId: string, barberName: string) => {
    if (!user) {
      toast.error("Please sign in to donate");
      return;
    }
    
    // Check if user has funds (minimum 5 Barber Bucks for donation)
    if (!checkFunds(5)) {
      return; // checkFunds will handle the error message and show add funds modal
    }
    
    setSelectedBarberId(barberId);
    setSelectedBarberName(barberName);
    setIsDonationModalOpen(true);
  };

  const handleShare = async () => {
    try {
      if (navigator.share && navigator.canShare) {
        await navigator.share({
          title: battle?.title || "Epic Barber Battle",
          text: "Check out this amazing barber battle!",
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      // Fallback to clipboard if share fails
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      } catch (clipboardError) {
        toast.error("Unable to share or copy link");
      }
    }
  };

  const handleVideoUpload = () => {
    if (!user) {
      toast.error("Please sign in to upload videos");
      return;
    }
    if (!isBarber) {
      toast.error("Only barbers can upload videos");
      return;
    }
    setShowUploadModal(true);
  };

  const getBarberSubmission = (barberId: string) => {
    return submissions?.find(sub => sub.user_id === barberId);
  };

  const canUserUpload = (barberId: string) => {
    return user?.id === barberId && isBarber;
  };

  const getCountryFlag = (countryCode: string) => {
    if (!countryCode) return "🏳️";
    return countryCode.toUpperCase().replace(/./g, char => 
      String.fromCodePoint(127397 + char.charCodeAt(0))
    );
  };

  const getFlagImageUrl = (countryCode?: string) => {
    if (!countryCode) return "";
    return `https://flagcdn.com/w1600/${countryCode.toLowerCase()}.jpg`;
  };

  const calculatePercentages = () => {
    if (!battle) return { barber1: 50, barber2: 50 };
    const total = battle.vote_count1 + battle.vote_count2;
    if (total === 0) return { barber1: 50, barber2: 50 };
    return {
      barber1: Math.round((battle.vote_count1 / total) * 100),
      barber2: Math.round((battle.vote_count2 / total) * 100)
    };
  };

  if (battleLoading || barbersLoading || displayBarbersLoading) {
    return (
      <div className="pt-24 lg:pt-28 pb-8 px-4 max-w-7xl mx-auto">
        <div className="aspect-video bg-card rounded-2xl shadow-2xl border-2 border-primary/50 animate-glow flex items-center justify-center">
          <div className="animate-pulse text-lg text-muted-foreground">Loading battle...</div>
        </div>
      </div>
    );
  }

  // Use real barber data for display
  const realBarbers = displayBarbers && displayBarbers.length >= 2 ? displayBarbers : [];
  
  if (!displayBarbers || displayBarbers.length < 2) {
    return (
      <div className="pt-24 lg:pt-28 pb-8 px-4 max-w-7xl mx-auto">
        <div className="aspect-video bg-card rounded-2xl shadow-2xl border-2 border-primary/50 animate-glow flex items-center justify-center">
          <div className="text-lg text-muted-foreground">No barbers available for display</div>
        </div>
      </div>
    );
  }

  const displayPercentages = {
    barber1: 68,
    barber2: 32
  };
  
  // Get real barber photos from profiles or use defaults
  const barber1Photo = realBarbers[0]?.profiles?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop&crop=face";
  const barber2Photo = realBarbers[1]?.profiles?.avatar_url || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=800&fit=crop&crop=face";

  return (
    <div className="pt-20 sm:pt-24 lg:pt-32 pb-4 sm:pb-6 lg:pb-8 px-1 sm:px-2 lg:px-4 max-w-[95vw] sm:max-w-4xl lg:max-w-5xl mx-auto">
      {/* Main Battle Card - Mobile Optimized */}
      <div className="w-full portrait:aspect-[3/4] sm:portrait:aspect-[4/5] landscape:aspect-[16/10] lg:landscape:aspect-[16/9] bg-card rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl sm:shadow-2xl border border-primary/30 sm:border-2 sm:border-primary/50 animate-glow overflow-hidden relative transform-gpu will-change-transform mx-0 my-[24px] py-0 px-0">
        <div className="h-full flex">
          {/* Barber 1 Side */}
          <div className="flex-1 relative overflow-hidden" onClick={() => toast.info(`Check out ${realBarbers[0]?.name}'s profile!`)}>
            {/* Flag Background */}
            <div className="absolute inset-0" style={{
              backgroundImage: `url(${getFlagImageUrl(realBarbers[0]?.country_code || 'us')})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.3
            }} />
            
            {/* Barber Photo - Responsive sizing based on aspect ratio */}
            <div className="absolute top-[12%] left-1/2 transform -translate-x-1/2 w-[20vw] h-[20vw] max-w-[80px] max-h-[80px] sm:max-w-[120px] sm:max-h-[120px] lg:max-w-[160px] lg:max-h-[160px] rounded-full overflow-hidden border-2 sm:border-4 border-white/80 shadow-xl sm:shadow-2xl">
              <img src={barber1Photo} alt={realBarbers[0]?.name} className="w-full h-full object-cover" />
            </div>

            {/* Barber Name - Under profile photo */}
            <div className="absolute top-[32%] left-1/2 transform -translate-x-1/2 text-center z-10">
              <h3 className="text-white text-[8px] xs:text-[10px] sm:text-sm lg:text-base font-bold drop-shadow-lg bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">{realBarbers[0]?.name}</h3>
            </div>

            {/* Video Box */}
            <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 w-[35vw] h-[35vw] max-w-[140px] max-h-[140px] sm:max-w-[200px] sm:max-h-[200px] lg:max-w-[260px] lg:max-h-[260px] bg-black/80 border border-white/30 rounded-lg overflow-hidden shadow-lg cursor-pointer group hover:bg-primary/20 transition-all duration-300">
              {(() => {
                const submission = getBarberSubmission(realBarbers[0]?.user_id || '');
                if (submission?.media_url) {
                  return <VideoPlayer src={submission.media_url} className="w-full h-full" muted={true} />;
                } else if (canUserUpload(realBarbers[0]?.user_id || '')) {
                  return (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 group-hover:from-primary/20 group-hover:to-primary/40 transition-all duration-300" onClick={handleVideoUpload}>
                      <Upload className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white/60 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                    </div>
                  );
                } else {
                  return (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 group-hover:from-primary/20 group-hover:to-primary/40 transition-all duration-300">
                      <Play className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white/60 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                    </div>
                  );
                }
              })()}
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
            
            {/* Vote Percentage - Responsive */}
            <div className="absolute top-1 sm:top-2 lg:top-3 left-1 sm:left-2 lg:left-3 z-10">
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5">
                <span className="text-white font-bold text-xs sm:text-sm lg:text-lg xl:text-xl">{displayPercentages.barber1}%</span>
              </div>
            </div>

            {/* Vertical Action Buttons - Mobile optimized */}
            <div className="absolute left-1 sm:left-2 lg:left-3 top-[35%] sm:top-[30%] z-10 flex flex-col gap-1 sm:gap-2 mx-[10px]">
              <button 
                className={`w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)] ${
                  barber1LikeQuery.data ? 'bg-red-500/80 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                onClick={e => {
                  e.stopPropagation();
                  handleLike(realBarbers[0]?.user_id || '');
                }}
              >
                <Heart className={`w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 ${barber1LikeQuery.data ? 'fill-current' : ''}`} />
              </button>
              <button 
                className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]" 
                onClick={e => {
                  e.stopPropagation();
                  handleShare();
                }}
              >
                <Share2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
              </button>
              <button 
                className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-green-500/40 transition-all duration-300 shadow-[0_0_10px_rgba(34,197,94,0.4)] hover:shadow-[0_0_15px_rgba(34,197,94,0.7)]"
                onClick={e => {
                  e.stopPropagation();
                  handleDonate(realBarbers[0]?.user_id || '', realBarbers[0]?.name || '');
                }}
              >
                <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
              </button>
              <button 
                className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]" 
                onClick={e => {
                  e.stopPropagation();
                  toast.info("Feature coming soon!");
                }}
              >
                <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
              </button>
            </div>
          </div>

          {/* Vertical Advertisement Bar - Mobile optimized */}
          <div className="absolute left-1/2 top-0 bottom-0 transform -translate-x-1/2 z-20 w-10 sm:w-14 lg:w-20">
            <div className="h-full bg-gradient-to-b from-black/80 via-black/60 to-black/80 backdrop-blur-sm border-x border-white/20 sm:border-x-2 flex flex-col">
              {/* Ad Spot 1 */}
              <div className="flex-1 border-b border-white/20 flex items-center justify-center group hover:bg-white/10 transition-colors cursor-pointer">
                <div className="text-center">
                  <div className="text-white/60 text-[8px] sm:text-xs font-medium">AD</div>
                  <div className="text-white/40 text-[6px] sm:text-[10px]">SPOT 1</div>
                </div>
              </div>
              
              {/* VS Center - Mobile optimized */}
              <div className="h-10 sm:h-16 lg:h-20 flex items-center justify-center bg-white/10">
                <div className="bg-white rounded-full w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 flex items-center justify-center shadow-2xl border border-primary sm:border-2">
                  <span className="text-[8px] sm:text-xs lg:text-sm font-bold text-primary">VS</span>
                </div>
              </div>
              
              {/* Ad Spot 2 */}
              <div className="flex-1 border-b border-white/20 flex items-center justify-center group hover:bg-white/10 transition-colors cursor-pointer">
                <div className="text-center">
                  <div className="text-white/60 text-[8px] sm:text-xs font-medium">AD</div>
                  <div className="text-white/40 text-[6px] sm:text-[10px]">SPOT 2</div>
                </div>
              </div>
              
              {/* Ad Spot 3 */}
              <div className="flex-1 border-b border-white/20 flex items-center justify-center group hover:bg-white/10 transition-colors cursor-pointer">
                <div className="text-center">
                  <div className="text-white/60 text-[8px] sm:text-xs font-medium">AD</div>
                  <div className="text-white/40 text-[6px] sm:text-[10px]">SPOT 3</div>
                </div>
              </div>
              
              {/* Ad Spot 4 */}
              <div className="flex-1 flex items-center justify-center group hover:bg-white/10 transition-colors cursor-pointer">
                <div className="text-center">
                  <div className="text-white/60 text-[8px] sm:text-xs font-medium">AD</div>
                  <div className="text-white/40 text-[6px] sm:text-[10px]">SPOT 4</div>
                </div>
              </div>
            </div>
          </div>

          {/* Barber 2 Side */}
          <div className="flex-1 relative overflow-hidden" onClick={() => toast.info(`Check out ${realBarbers[1]?.name}'s profile!`)}>
            {/* Flag Background */}
            <div className="absolute inset-0" style={{
              backgroundImage: `url(${getFlagImageUrl(realBarbers[1]?.country_code || 'ca')})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.3
            }} />
            
            {/* Barber Photo - Responsive sizing based on aspect ratio */}
            <div className="absolute top-[12%] right-1/2 transform translate-x-1/2 w-[20vw] h-[20vw] max-w-[80px] max-h-[80px] sm:max-w-[120px] sm:max-h-[120px] lg:max-w-[160px] lg:max-h-[160px] rounded-full overflow-hidden border-2 sm:border-4 border-white/80 shadow-xl sm:shadow-2xl">
              <img src={barber2Photo} alt={realBarbers[1]?.name} className="w-full h-full object-cover" />
            </div>

            {/* Barber Name - Under profile photo */}
            <div className="absolute top-[32%] right-1/2 transform translate-x-1/2 text-center z-10">
              <h3 className="text-white text-[8px] xs:text-[10px] sm:text-sm lg:text-base font-bold drop-shadow-lg bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">{realBarbers[1]?.name}</h3>
            </div>

            {/* Video Box */}
            <div className="absolute top-[45%] right-1/2 transform translate-x-1/2 w-[35vw] h-[35vw] max-w-[140px] max-h-[140px] sm:max-w-[200px] sm:max-h-[200px] lg:max-w-[260px] lg:max-h-[260px] bg-black/80 border border-white/30 rounded-lg overflow-hidden shadow-lg cursor-pointer group hover:bg-primary/20 transition-all duration-300">
              {(() => {
                const submission = getBarberSubmission(realBarbers[1]?.user_id || '');
                if (submission?.media_url) {
                  return <VideoPlayer src={submission.media_url} className="w-full h-full" muted={true} />;
                } else if (canUserUpload(realBarbers[1]?.user_id || '')) {
                  return (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 group-hover:from-primary/20 group-hover:to-primary/40 transition-all duration-300" onClick={handleVideoUpload}>
                      <Upload className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white/60 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                    </div>
                  );
                } else {
                  return (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 group-hover:from-primary/20 group-hover:to-primary/40 transition-all duration-300">
                      <Play className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white/60 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                    </div>
                  );
                }
              })()}
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/40 to-black/60" />
            
            {/* Vote Percentage - Responsive */}
            <div className="absolute top-1 sm:top-2 lg:top-3 right-1 sm:right-2 lg:right-3 z-10">
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5">
                <span className="text-white font-bold text-xs sm:text-sm lg:text-lg xl:text-xl">{displayPercentages.barber2}%</span>
              </div>
            </div>

            {/* Vertical Action Buttons - Mobile optimized */}
            <div className="absolute right-1 sm:right-2 lg:right-3 top-[35%] sm:top-[30%] z-10 flex flex-col gap-1 sm:gap-2 mx-[10px]">
              <button 
                className={`w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)] ${
                  barber2LikeQuery.data ? 'bg-red-500/80 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                onClick={e => {
                  e.stopPropagation();
                  handleLike(realBarbers[1]?.user_id || '');
                }}
              >
                <Heart className={`w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 ${barber2LikeQuery.data ? 'fill-current' : ''}`} />
              </button>
              <button 
                className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]" 
                onClick={e => {
                  e.stopPropagation();
                  handleShare();
                }}
              >
                <Share2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
              </button>
              <button 
                className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-green-500/40 transition-all duration-300 shadow-[0_0_10px_rgba(34,197,94,0.4)] hover:shadow-[0_0_15px_rgba(34,197,94,0.7)]"
                onClick={e => {
                  e.stopPropagation();
                  handleDonate(realBarbers[1]?.user_id || '', realBarbers[1]?.name || '');
                }}
              >
                <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
              </button>
              <button 
                className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]" 
                onClick={e => {
                  e.stopPropagation();
                  toast.info("Feature coming soon!");
                }}
              >
                <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
              </button>
            </div>

            {/* Hover Effect */}
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        </div>

        {/* Action Buttons - Bottom Left */}
        <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 z-10 flex gap-1 sm:gap-2">
          {/* Placeholder for additional bottom buttons if needed */}
        </div>
      </div>
      
      {/* Desktop Comments Panel */}
      <div className="hidden lg:block lg:w-80">
        <BattleCommentsPanel battleId={battle?.id || 'no-battle'} isOpen={isPanelOpen} onToggle={() => setIsPanelOpen(!isPanelOpen)} />
      </div>

      {/* Mobile Comments Panel */}
      <div className="lg:hidden mt-6">
        <BattleCommentsPanel battleId={battle?.id || 'no-battle'} isOpen={isPanelOpen} onToggle={() => setIsPanelOpen(!isPanelOpen)} />
      </div>

      {/* Donation Modal */}
      <DonationModal 
        isOpen={isDonationModalOpen} 
        onClose={() => setIsDonationModalOpen(false)} 
        creatorId={selectedBarberId || ''} 
        creatorName={selectedBarberName} 
      />
      
      {/* Add Funds Modal */}
      <AddFundsModal 
        isOpen={showAddFundsModal} 
        onClose={() => setShowAddFundsModal(false)} 
      />
      
      {/* Upload Modal */}
      {showUploadModal && battle && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Upload Battle Video</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowUploadModal(false)} 
                className="text-muted-foreground hover:text-white"
              >
                ✕
              </Button>
            </div>
            <div className="p-4">
              <VideoUpload 
                battleId={battle.id} 
                onVideoUploaded={() => {
                  setShowUploadModal(false);
                  refetchSubmissions();
                  toast.success('Video uploaded successfully!');
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};