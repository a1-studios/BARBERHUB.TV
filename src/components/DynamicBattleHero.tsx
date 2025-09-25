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
  user_id: string;
  display_name: string;
  avatar_url?: string;
  country_code?: string;
  bio?: string;
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

  // Fetch active battle
  const { data: battle, isLoading: battleLoading } = useQuery({
    queryKey: ['activeBattle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .in('status', ['voting', 'active'])
        .not('barber1_id', 'is', null)
        .not('barber2_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as Battle | null;
    },
    refetchInterval: 5000
  });

  // Fetch barber profiles with additional data
  const { data: barberProfiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['barberProfilesData', battle?.barber1_id, battle?.barber2_id],
    queryFn: async () => {
      if (!battle?.barber1_id || !battle?.barber2_id) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, country_code, bio')
        .in('user_id', [battle.barber1_id, battle.barber2_id]);
      
      if (error) throw error;
      return data;
    },
    enabled: !!battle?.barber1_id && !!battle?.barber2_id
  });

  // Get like states for real barbers
  const barber1LikeQuery = useQuery({
    queryKey: ['user_like', battle?.barber1_id, user?.id],
    queryFn: async () => {
      if (!user || !battle?.barber1_id) return false;
      const { data, error } = await supabase
        .from('creator_likes')
        .select('id')
        .eq('creator_id', battle.barber1_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!battle?.barber1_id
  });

  const barber2LikeQuery = useQuery({
    queryKey: ['user_like', battle?.barber2_id, user?.id],
    queryFn: async () => {
      if (!user || !battle?.barber2_id) return false;
      const { data, error } = await supabase
        .from('creator_likes')
        .select('id')
        .eq('creator_id', battle.barber2_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!battle?.barber2_id
  });

  const handleVote = async (barberId: string) => {
    if (!user || !battle) {
      toast.error("Please sign in to vote");
      return;
    }

    if (!isFan) {
      toast.error("Only fans can vote in battles");
      return;
    }

    try {
      const { error } = await supabase.from('battle_votes').insert({
        battle_id: battle.id,
        voter_id: user.id,
        submission_id: barberId // This would need proper submission lookup
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
    if (barberId === battle?.barber1_id) {
      isLiked = barber1LikeQuery.data || false;
    } else if (barberId === battle?.barber2_id) {
      isLiked = barber2LikeQuery.data || false;
    }
    
    toggleLike.mutate({ creatorId: barberId, isLiked });
  };

  const handleDonate = (barberId: string, barberName: string) => {
    if (!user) {
      toast.error("Please sign in to donate");
      return;
    }
    
    if (!checkFunds(5)) {
      return;
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
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      } catch (clipboardError) {
        toast.error("Unable to share or copy link");
      }
    }
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

  if (battleLoading || profilesLoading) {
    return (
      <div className="pt-24 lg:pt-28 pb-8 px-4 max-w-7xl mx-auto">
        <div className="aspect-video bg-card rounded-2xl shadow-2xl border-2 border-primary/50 animate-glow flex items-center justify-center">
          <div className="animate-pulse text-lg text-muted-foreground">Loading battle...</div>
        </div>
      </div>
    );
  }

  // Fetch random barbers for display when no active battle
  const { data: fallbackBarbers } = useQuery({
    queryKey: ['fallbackBarbers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, country_code, bio')
        .eq('user_type', 'barber')
        .limit(8);
      
      if (error) throw error;
      return data;
    },
    enabled: !battle || !barberProfiles || barberProfiles.length < 2
  });

  // Show barbers from database when no active battle exists
  if (!battle || !barberProfiles || barberProfiles.length < 2) {
    if (!fallbackBarbers || fallbackBarbers.length < 2) {
      return (
        <div className="pt-24 lg:pt-28 pb-8 px-4 max-w-7xl mx-auto">
          <div className="aspect-video bg-card rounded-2xl shadow-2xl border-2 border-primary/50 animate-glow flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg text-muted-foreground mb-2">Loading barber profiles...</div>
              <div className="text-sm text-muted-foreground">Setting up your barber experience!</div>
            </div>
          </div>
        </div>
      );
    }

    // Use first two barbers from database
    const displayBarber1 = fallbackBarbers[0];
    const displayBarber2 = fallbackBarbers[1];
    const displayPercentages = { barber1: 50, barber2: 50 };
    const displayBarber1Photo = displayBarber1.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop&crop=face";
    const displayBarber2Photo = displayBarber2.avatar_url || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=800&fit=crop&crop=face";

    return (
      <div className="pt-20 sm:pt-24 lg:pt-32 pb-4 sm:pb-6 lg:pb-8 px-1 sm:px-2 lg:px-4 max-w-[95vw] sm:max-w-4xl lg:max-w-5xl mx-auto">
        <div className="w-full portrait:aspect-[3/4] sm:portrait:aspect-[4/5] landscape:aspect-[16/10] lg:landscape:aspect-[16/9] bg-card rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl sm:shadow-2xl border border-primary/30 sm:border-2 sm:border-primary/50 animate-glow overflow-hidden relative transform-gpu will-change-transform mx-0 my-[24px] py-0 px-0">
          <div className="h-full flex">
            {/* Barber 1 Side */}
            <div className="flex-1 relative overflow-hidden" onClick={() => toast.info("This is a preview - check back for live battles!")}>
              <div className="absolute inset-0" style={{
                backgroundImage: `url(${getFlagImageUrl(displayBarber1.country_code)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.3
              }} />
              
              <div className="absolute top-[12%] left-1/2 transform -translate-x-1/2 w-[20vw] h-[20vw] max-w-[80px] max-h-[80px] sm:max-w-[120px] sm:max-h-[120px] lg:max-w-[160px] lg:max-h-[160px] rounded-full overflow-hidden border-2 sm:border-4 border-white/80 shadow-xl sm:shadow-2xl">
                <img src={displayBarber1Photo} alt={displayBarber1.display_name || 'Barber 1'} className="w-full h-full object-cover" />
              </div>

              <div className="absolute top-[32%] left-1/2 transform -translate-x-1/2 text-center z-10">
                <h3 className="text-white text-[8px] xs:text-[10px] sm:text-sm lg:text-base font-bold drop-shadow-lg bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">{displayBarber1.display_name || 'Barber 1'}</h3>
              </div>

              {/* Video Box */}
              <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 w-[35vw] h-[35vw] max-w-[140px] max-h-[140px] sm:max-w-[200px] sm:max-h-[200px] lg:max-w-[260px] lg:max-h-[260px] bg-black/80 border border-white/30 rounded-lg overflow-hidden shadow-lg cursor-pointer group hover:bg-primary/20 transition-all duration-300">
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 group-hover:from-primary/20 group-hover:to-primary/40 transition-all duration-300">
                  <Play className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white/60 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                </div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
              
              <div className="absolute top-1 sm:top-2 lg:top-3 left-1 sm:left-2 lg:left-3 z-10">
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5">
                  <span className="text-white font-bold text-xs sm:text-sm lg:text-lg xl:text-xl">{displayPercentages.barber1}%</span>
                </div>
              </div>

              <div className="absolute left-1 sm:left-2 lg:left-3 top-[35%] sm:top-[30%] z-10 flex flex-col gap-1 sm:gap-2 mx-[10px]">
                <button 
                  className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]"
                  onClick={e => {
                    e.stopPropagation();
                    handleLike(displayBarber1.user_id);
                  }}
                >
                  <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </button>
                <button className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]" onClick={e => {
                  e.stopPropagation();
                  handleShare();
                }}>
                  <Share2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </button>
                <button 
                  className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-green-500/40 transition-all duration-300 shadow-[0_0_10px_rgba(34,197,94,0.4)] hover:shadow-[0_0_15px_rgba(34,197,94,0.7)]"
                  onClick={e => {
                    e.stopPropagation();
                    handleDonate(displayBarber1.user_id, displayBarber1.display_name || 'Barber 1');
                  }}
                >
                  <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </button>
                <button className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]" onClick={e => {
                  e.stopPropagation();
                  toast.info("Feature coming soon!");
                }}>
                  <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </button>
              </div>
            </div>

            {/* VS Center */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
              <div className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent text-lg sm:text-xl lg:text-2xl font-bold drop-shadow-2xl animate-pulse">
                VS
              </div>
            </div>

            {/* Barber 2 Side */}
            <div className="flex-1 relative overflow-hidden" onClick={() => toast.info("This is a preview - check back for live battles!")}>
              <div className="absolute inset-0" style={{
                backgroundImage: `url(${getFlagImageUrl(displayBarber2.country_code)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.3
              }} />
              
              <div className="absolute top-[12%] right-1/2 transform translate-x-1/2 w-[20vw] h-[20vw] max-w-[80px] max-h-[80px] sm:max-w-[120px] sm:max-h-[120px] lg:max-w-[160px] lg:max-h-[160px] rounded-full overflow-hidden border-2 sm:border-4 border-white/80 shadow-xl sm:shadow-2xl">
                <img src={displayBarber2Photo} alt={displayBarber2.display_name || 'Barber 2'} className="w-full h-full object-cover" />
              </div>

              <div className="absolute top-[32%] right-1/2 transform translate-x-1/2 text-center z-10">
                <h3 className="text-white text-[8px] xs:text-[10px] sm:text-sm lg:text-base font-bold drop-shadow-lg bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">{displayBarber2.display_name || 'Barber 2'}</h3>
              </div>

              {/* Video Box */}
              <div className="absolute top-[45%] right-1/2 transform translate-x-1/2 w-[35vw] h-[35vw] max-w-[140px] max-h-[140px] sm:max-w-[200px] sm:max-h-[200px] lg:max-w-[260px] lg:max-h-[260px] bg-black/80 border border-white/30 rounded-lg overflow-hidden shadow-lg cursor-pointer group hover:bg-primary/20 transition-all duration-300">
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 group-hover:from-primary/20 group-hover:to-primary/40 transition-all duration-300">
                  <Play className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white/60 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                </div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/40 to-black/60" />
              
              <div className="absolute top-1 sm:top-2 lg:top-3 right-1 sm:right-2 lg:right-3 z-10">
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5">
                  <span className="text-white font-bold text-xs sm:text-sm lg:text-lg xl:text-xl">{displayPercentages.barber2}%</span>
                </div>
              </div>

              <div className="absolute right-1 sm:right-2 lg:right-3 top-[35%] sm:top-[30%] z-10 flex flex-col gap-1 sm:gap-2 mx-[10px]">
                <button 
                  className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]"
                  onClick={e => {
                    e.stopPropagation();
                    handleLike(displayBarber2.user_id);
                  }}
                >
                  <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </button>
                <button className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]" onClick={e => {
                  e.stopPropagation();
                  handleShare();
                }}>
                  <Share2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </button>
                <button 
                  className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-green-500/40 transition-all duration-300 shadow-[0_0_10px_rgba(34,197,94,0.4)] hover:shadow-[0_0_15px_rgba(34,197,94,0.7)]"
                  onClick={e => {
                    e.stopPropagation();
                    handleDonate(displayBarber2.user_id, displayBarber2.display_name || 'Barber 2');
                  }}
                >
                  <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </button>
                <button className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]" onClick={e => {
                  e.stopPropagation();
                  toast.info("Feature coming soon!");
                }}>
                  <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Preview Badge */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-black/80 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20">
              <span className="text-white/70 text-xs font-medium">Preview Mode - Real Battles Coming Soon!</span>
            </div>
          </div>
        </div>

        {/* Modals */}
        {selectedBarberId && (
          <DonationModal
            isOpen={isDonationModalOpen}
            onClose={() => setIsDonationModalOpen(false)}
            creatorId={selectedBarberId}
            creatorName={selectedBarberName}
          />
        )}

        <AddFundsModal
          isOpen={showAddFundsModal}
          onClose={() => setShowAddFundsModal(false)}
        />
      </div>
    );
  }

  // Get barber data
  const barber1 = barberProfiles.find(p => p.user_id === battle.barber1_id);
  const barber2 = barberProfiles.find(p => p.user_id === battle.barber2_id);
  
  if (!barber1 || !barber2) {
    return (
      <div className="pt-24 lg:pt-28 pb-8 px-4 max-w-7xl mx-auto">
        <div className="aspect-video bg-card rounded-2xl shadow-2xl border-2 border-primary/50 animate-glow flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg text-muted-foreground mb-2">Battle data loading...</div>
            <div className="text-sm text-muted-foreground">Please wait while we load the barber profiles</div>
          </div>
        </div>
      </div>
    );
  }

  const percentages = calculatePercentages();
  const barber1Photo = barber1.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop&crop=face";
  const barber2Photo = barber2.avatar_url || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=800&fit=crop&crop=face";

  return (
    <div className="pt-20 sm:pt-24 lg:pt-32 pb-4 sm:pb-6 lg:pb-8 px-1 sm:px-2 lg:px-4 max-w-[95vw] sm:max-w-4xl lg:max-w-5xl mx-auto">
      <div className="w-full portrait:aspect-[3/4] sm:portrait:aspect-[4/5] landscape:aspect-[16/10] lg:landscape:aspect-[16/9] bg-card rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl sm:shadow-2xl border border-primary/30 sm:border-2 sm:border-primary/50 animate-glow overflow-hidden relative transform-gpu will-change-transform mx-0 my-[24px] py-0 px-0">
        <div className="h-full flex">
          {/* Barber 1 Side */}
          <div className="flex-1 relative overflow-hidden" onClick={() => handleVote(battle.barber1_id)}>
            <div className="absolute inset-0" style={{
              backgroundImage: `url(${getFlagImageUrl(barber1.country_code)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.3
            }} />
            
            <div className="absolute top-[12%] left-1/2 transform -translate-x-1/2 w-[20vw] h-[20vw] max-w-[80px] max-h-[80px] sm:max-w-[120px] sm:max-h-[120px] lg:max-w-[160px] lg:max-h-[160px] rounded-full overflow-hidden border-2 sm:border-4 border-white/80 shadow-xl sm:shadow-2xl">
              <img src={barber1Photo} alt={barber1.display_name || 'Barber 1'} className="w-full h-full object-cover" />
            </div>

            <div className="absolute top-[32%] left-1/2 transform -translate-x-1/2 text-center z-10">
              <h3 className="text-white text-[8px] xs:text-[10px] sm:text-sm lg:text-base font-bold drop-shadow-lg bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">{barber1.display_name || 'Barber 1'}</h3>
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
            
            <div className="absolute top-1 sm:top-2 lg:top-3 left-1 sm:left-2 lg:left-3 z-10">
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5">
                <span className="text-white font-bold text-xs sm:text-sm lg:text-lg xl:text-xl">{percentages.barber1}%</span>
              </div>
            </div>

            <div className="absolute left-1 sm:left-2 lg:left-3 top-[35%] sm:top-[30%] z-10 flex flex-col gap-1 sm:gap-2 mx-[10px]">
              <button 
                className={`w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)] ${
                  barber1LikeQuery.data ? 'bg-red-500/80 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                onClick={e => {
                  e.stopPropagation();
                  handleLike(barber1.user_id);
                }}
              >
                <Heart className={`w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 ${barber1LikeQuery.data ? 'fill-current' : ''}`} />
              </button>
              <button 
                className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-green-500/40 transition-all duration-300 shadow-[0_0_10px_rgba(34,197,94,0.4)] hover:shadow-[0_0_15px_rgba(34,197,94,0.7)]"
                onClick={e => {
                  e.stopPropagation();
                  handleDonate(barber1.user_id, barber1.display_name || 'Barber 1');
                }}
              >
                <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
              </button>
            </div>
          </div>

          {/* Barber 2 Side */}
          <div className="flex-1 relative overflow-hidden" onClick={() => handleVote(battle.barber2_id)}>
            <div className="absolute inset-0" style={{
              backgroundImage: `url(${getFlagImageUrl(barber2.country_code)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.3
            }} />
            
            <div className="absolute top-[12%] right-1/2 transform translate-x-1/2 w-[20vw] h-[20vw] max-w-[80px] max-h-[80px] sm:max-w-[120px] sm:max-h-[120px] lg:max-w-[160px] lg:max-h-[160px] rounded-full overflow-hidden border-2 sm:border-4 border-white/80 shadow-xl sm:shadow-2xl">
              <img src={barber2Photo} alt={barber2.display_name || 'Barber 2'} className="w-full h-full object-cover" />
            </div>

            <div className="absolute top-[32%] right-1/2 transform translate-x-1/2 text-center z-10">
              <h3 className="text-white text-[8px] xs:text-[10px] sm:text-sm lg:text-base font-bold drop-shadow-lg bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">{barber2.display_name || 'Barber 2'}</h3>
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/40 to-black/60" />
            
            <div className="absolute top-1 sm:top-2 lg:top-3 right-1 sm:right-2 lg:right-3 z-10">
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5">
                <span className="text-white font-bold text-xs sm:text-sm lg:text-lg xl:text-xl">{percentages.barber2}%</span>
              </div>
            </div>

            <div className="absolute right-1 sm:right-2 lg:right-3 top-[35%] sm:top-[30%] z-10 flex flex-col gap-1 sm:gap-2 mx-[10px]">
              <button 
                className={`w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)] ${
                  barber2LikeQuery.data ? 'bg-red-500/80 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                onClick={e => {
                  e.stopPropagation();
                  handleLike(barber2.user_id);
                }}
              >
                <Heart className={`w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 ${barber2LikeQuery.data ? 'fill-current' : ''}`} />
              </button>
              <button 
                className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-green-500/40 transition-all duration-300 shadow-[0_0_10px_rgba(34,197,94,0.4)] hover:shadow-[0_0_15px_rgba(34,197,94,0.7)]"
                onClick={e => {
                  e.stopPropagation();
                  handleDonate(barber2.user_id, barber2.display_name || 'Barber 2');
                }}
              >
                <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedBarberId && (
        <DonationModal
          isOpen={isDonationModalOpen}
          onClose={() => setIsDonationModalOpen(false)}
          creatorId={selectedBarberId}
          creatorName={selectedBarberName}
        />
      )}

      <AddFundsModal
        isOpen={showAddFundsModal}
        onClose={() => setShowAddFundsModal(false)}
      />
    </div>
  );
};

export default DynamicBattleHero;