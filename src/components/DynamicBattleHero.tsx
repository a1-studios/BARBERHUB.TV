import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Share2, Play, Heart, TrendingUp, Users, DollarSign, Upload, ExternalLink } from "lucide-react";
import { BattleCommentsPanel } from "./BattleCommentsPanel";
import { DonationModal } from "./DonationModal";
import { VideoPlayer } from "./VideoPlayer";
import { VideoUpload } from "./VideoUpload";
import { VerificationBadge } from "./VerificationBadge";
import { AddFundsModal } from "./AddFundsModal";
import { YouTubeStreamPlayer } from "./battles/YouTubeStreamPlayer";
import { BarberVideoSection } from "./barber/BarberVideoSection";
import { BattleVotingView } from "./battles/BattleVotingView";
import { BattleResultsView } from "./battles/BattleResultsView";
import { FullscreenBattleVideoModal } from "./battles/FullscreenBattleVideoModal";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLikes } from "@/hooks/useLikes";
import { useBarberBucks } from "@/hooks/useBarberBucks";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import confetti from 'canvas-confetti';
interface Battle {
  id: string;
  title: string;
  barber1_id: string;
  barber2_id: string;
  vote_count1: number;
  vote_count2: number;
  status: string;
  youtube_stream_url?: string;
  youtube_vod_url?: string;
  barber_1_video_url?: string;
  barber_2_video_url?: string;
}
interface BarberProfile {
  id: string;
  user_id: string;
  name: string;
  country_code?: string;
  is_live?: boolean;
  live_video_id?: string | null;
  featured_video_id?: string | null;
  avatar_url?: string;
  display_name?: string;
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
  youtube_vod_url?: string;
  is_live_stream?: boolean;
  stream_started_at?: string;
  stream_ended_at?: string;
}
export const DynamicBattleHero = () => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    profile,
    isFan,
    isBarber,
    isVerified
  } = useUserProfile();
  const {
    toggleLike
  } = useLikes();
  const {
    checkFunds,
    showAddFundsModal,
    setShowAddFundsModal
  } = useBarberBucks();
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [selectedBarberName, setSelectedBarberName] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const [userVotedFor, setUserVotedFor] = useState<string | null>(null);
  const [isFullscreenVideoOpen, setIsFullscreenVideoOpen] = useState(false);

  // Fetch active battle
  const {
    data: battle,
    isLoading: battleLoading
  } = useQuery({
    queryKey: ['activeBattle'],
    queryFn: async () => {
      // First try to find a voting battle
      let {
        data,
        error
      } = await supabase.from('battles').select('*').eq('status', 'voting').not('barber1_id', 'is', null).not('barber2_id', 'is', null).order('created_at', {
        ascending: false
      }).limit(1).maybeSingle();

      // If no voting battle, try upcoming battles
      if (!data) {
        const upcomingResult = await supabase.from('battles').select('*').eq('status', 'upcoming').not('barber1_id', 'is', null).not('barber2_id', 'is', null).order('created_at', {
          ascending: false
        }).limit(1).maybeSingle();
        data = upcomingResult.data;
        error = upcomingResult.error;
      }
      if (error) throw error;
      return data as Battle | null;
    },
    refetchInterval: 5000 // Refresh every 5 seconds for live updates
  });

  // Fetch barber profiles for the battle with live status, video data, and avatar
  const {
    data: barbers,
    isLoading: barbersLoading
  } = useQuery({
    queryKey: ['battleBarbers', battle?.barber1_id, battle?.barber2_id],
    queryFn: async () => {
      if (!battle?.barber1_id || !battle?.barber2_id) return [];

      // Fetch barber profiles with live status and video IDs
      const {
        data: barberProfiles,
        error: barberError
      } = await supabase
        .from('barber_profiles')
        .select('id, user_id, name, country_code, is_live, live_video_id, featured_video_id')
        .in('id', [battle.barber1_id, battle.barber2_id]);
      if (barberError) throw barberError;

      // Fetch user profiles for country_code and avatar_url
      const userIds = barberProfiles?.map(b => b.user_id) || [];
      const {
        data: userProfiles,
        error: profileError
      } = await supabase
        .from('profiles')
        .select('user_id, country_code, avatar_url, display_name')
        .in('user_id', userIds);
      if (profileError) throw profileError;

      // Merge the data, prioritizing barber_profiles country_code and adding avatar
      const mergedData = barberProfiles?.map(barber => {
        const userProfile = userProfiles?.find(p => p.user_id === barber.user_id);
        return {
          ...barber,
          country_code: barber.country_code || userProfile?.country_code || 'us',
          avatar_url: userProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${barber.id}`,
          display_name: userProfile?.display_name || barber.name
        };
      });
      return mergedData;
    },
    enabled: !!battle?.barber1_id && !!battle?.barber2_id
  });

  // Get like states for real barbers
  const barber1LikeQuery = useQuery({
    queryKey: ['user_like', battle?.barber1_id, user?.id],
    queryFn: async () => {
      if (!user || !battle?.barber1_id) return false;
      const {
        data,
        error
      } = await supabase.from('creator_likes').select('id').eq('creator_id', battle.barber1_id).eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!battle?.barber1_id
  });
  const barber2LikeQuery = useQuery({
    queryKey: ['user_like', battle?.barber2_id, user?.id],
    queryFn: async () => {
      if (!user || !battle?.barber2_id) return false;
      const {
        data,
        error
      } = await supabase.from('creator_likes').select('id').eq('creator_id', battle.barber2_id).eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!battle?.barber2_id
  });

  // Fetch battle submissions
  const {
    data: submissions,
    refetch: refetchSubmissions
  } = useQuery({
    queryKey: ['battleSubmissions', battle?.id],
    queryFn: async () => {
      if (!battle?.id) return [];
      const {
        data,
        error
      } = await supabase.from('battle_submissions').select('*').eq('battle_id', battle.id);
      if (error) throw error;
      return data as BattleSubmission[];
    },
    enabled: !!battle?.id
  });
  // Fetch user's vote if logged in
  const { data: userVote } = useQuery({
    queryKey: ['user-vote', battle?.id, user?.id],
    queryFn: async () => {
      if (!user?.id || !battle?.id) return null;
      
      const { data, error } = await supabase
        .from('battle_votes')
        .select('submission_id')
        .eq('battle_id', battle.id)
        .eq('voter_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data?.submission_id || null;
    },
    enabled: !!user?.id && !!battle?.id
  });

  // Update user voted state
  useEffect(() => {
    if (userVote && submissions) {
      const submission = submissions.find(s => s.id === userVote);
      if (submission) {
        setUserVotedFor(submission.user_id);
      }
    }
  }, [userVote, submissions]);

  // Confetti effect when voting closes
  useEffect(() => {
    if (battle?.status === 'completed' && previousStatus === 'voting') {
      // Fire confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FFA500', '#FF6347']
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FFA500', '#FF6347']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
    setPreviousStatus(battle?.status || null);
  }, [battle?.status]);

  const handleVote = async (barberId: string) => {
    if (!user || !battle) {
      toast.error("Please sign in to vote");
      return;
    }

    // Prevent clicking on "No battle" message
    if (!barberId) {
      toast.info("Voting will be available when a battle is live");
      return;
    }
    try {
      // Find the submission for this barber
      const barberSubmission = submissions?.find(sub => sub.user_id === barberId);
      if (!barberSubmission) {
        toast.error("No submission found for this barber");
        return;
      }
      const {
        error
      } = await supabase.from('battle_votes').insert({
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
    if (!barberId) {
      toast.info("No active battle yet");
      return;
    }
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
    toggleLike.mutate({
      creatorId: barberId,
      isLiked
    });
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

  const handleFollow = async (barberId: string) => {
    if (!user) {
      toast.error("Please sign in to follow barbers");
      return;
    }
    
    try {
      const { data: existingFollow } = await supabase
        .from('creator_follows')
        .select('id')
        .eq('creator_id', barberId)
        .eq('follower_id', user.id)
        .maybeSingle();
      
      if (existingFollow) {
        await supabase
          .from('creator_follows')
          .delete()
          .eq('id', existingFollow.id);
        toast.success("Unfollowed successfully");
      } else {
        await supabase
          .from('creator_follows')
          .insert({ creator_id: barberId, follower_id: user.id });
        toast.success("Following successfully");
      }
    } catch (error) {
      toast.error("Failed to update follow status");
      console.error("Follow error:", error);
    }
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
    return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)));
  };
  const getFlagImageUrl = (countryCode?: string) => {
    if (!countryCode) return "";
    return `https://flagcdn.com/w1600/${countryCode.toLowerCase()}.jpg`;
  };
  const calculatePercentages = () => {
    if (!battle) return {
      barber1: 50,
      barber2: 50
    };
    const total = battle.vote_count1 + battle.vote_count2;
    if (total === 0) return {
      barber1: 50,
      barber2: 50
    };
    return {
      barber1: Math.round(battle.vote_count1 / total * 100),
      barber2: Math.round(battle.vote_count2 / total * 100)
    };
  };
  if (battleLoading || barbersLoading) {
    return <div className="pt-24 lg:pt-28 pb-8 px-4 max-w-7xl mx-auto">
        <div className="aspect-video bg-card rounded-2xl shadow-2xl border-2 border-primary/50 animate-glow flex items-center justify-center">
          <div className="animate-pulse text-lg text-muted-foreground">Loading battle...</div>
        </div>
      </div>;
  }

  // Fallback wireframe when no real battle exists (keeps layout/buttons/ads)
  if (!battle || !barbers || barbers.length < 2) {
    return <div className="pt-20 sm:pt-24 lg:pt-32 pb-4 sm:pb-6 lg:pb-8 px-1 sm:px-2 lg:px-4 max-w-[95vw] sm:max-w-4xl lg:max-w-5xl mx-auto">
        <div className="w-full portrait:aspect-[3/4] sm:portrait:aspect-[4/5] landscape:aspect-[16/10] lg:landscape:aspect-[16/9] bg-card rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl sm:shadow-2xl border border-primary/30 sm:border-2 sm:border-primary/50 animate-glow overflow-hidden relative transform-gpu will-change-transform mx-0 my-[24px] py-0 px-0">
          <div className="h-full flex">
            {/* Left Side */}
            <div className="flex-1 relative overflow-hidden" onClick={() => toast.info("Voting will be available when a battle is live")}>
              {/* Flag Background */}
              <div className="absolute inset-0" style={{
              backgroundImage: `url(${getFlagImageUrl(barbers?.[0]?.country_code || 'us')})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.3
            }} />

              {/* Barber Photo */}
              <div className="absolute top-[12%] left-1/2 transform -translate-x-1/2 w-[20vw] h-[20vw] max-w-[80px] max-h-[80px] sm:max-w-[120px] sm:max-h-[120px] lg:max-w-[160px] lg:max-h-[160px] rounded-full overflow-hidden border-2 sm:border-4 border-white/80 shadow-xl sm:shadow-2xl">
                <img 
                  src={barbers?.[0]?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${barbers?.[0]?.id}`} 
                  alt={barbers?.[0]?.display_name || barbers?.[0]?.name || 'Barber 1'} 
                  className="w-full h-full object-cover" 
                />
              </div>

              {/* Barber Name */}
              <div className="absolute top-[32%] left-1/2 transform -translate-x-1/2 text-center z-10">
                <h3 className="text-white text-[8px] xs:text-[10px] sm:text-sm lg:text-base font-bold drop-shadow-lg bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                  {barbers?.[0]?.display_name || barbers?.[0]?.name || 'Barber 1'}
                </h3>
              </div>

              {/* Video Box - Placeholder */}
              <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 w-[35vw] h-[35vw] max-w-[140px] max-h-[140px] sm:max-w-[200px] sm:max-h-[200px] lg:max-w-[260px] lg:max-h-[260px] bg-black/80 border border-white/30 rounded-lg overflow-hidden shadow-lg cursor-pointer group hover:bg-primary/20 transition-all duration-300">
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 group-hover:from-primary/20 group-hover:to-primary/40 transition-all duration-300">
                  <Play className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white/60 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                </div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />

              {/* Vote Percentage */}
              <div className="absolute top-1 sm:top-2 lg:top-3 left-1 sm:left-2 lg:left-3 z-10">
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5">
                  <span className="text-white font-bold text-xs sm:text-sm lg:text-lg xl:text-xl">50%</span>
                </div>
              </div>

              {/* Vertical Action Buttons */}
              
            </div>

            {/* Vertical Advertisement Bar */}
            <div className="absolute left-1/2 top-0 bottom-0 transform -translate-x-1/2 z-20 w-10 sm:w-14 lg:w-20">
              <div className="h-full bg-gradient-to-b from-black/80 via-black/60 to-black/80 backdrop-blur-sm border-x border-white/20 sm:border-x-2 flex flex-col">
                <div className="flex-1 border-b border-white/20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-white/60 text-[8px] sm:text-xs font-medium">AD</div>
                    <div className="text-white/40 text-[6px] sm:text-[10px]">SPOT 1</div>
                  </div>
                </div>
                <div className="flex-1 border-b border-white/20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-white/60 text-[8px] sm:text-xs font-medium">AD</div>
                    <div className="text-white/40 text-[6px] sm:text-[10px]">SPOT 2</div>
                  </div>
                </div>
                <div className="flex-1 border-b border-white/20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-white/60 text-[8px] sm:text-xs font-medium">AD</div>
                    <div className="text-white/40 text-[6px] sm:text-[10px]">SPOT 3</div>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-white/60 text-[8px] sm:text-xs font-medium">AD</div>
                    <div className="text-white/40 text-[6px] sm:text-[10px]">SPOT 4</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex-1 relative overflow-hidden" onClick={() => toast.info("Voting will be available when a battle is live")}>
              {/* Flag Background */}
              <div className="absolute inset-0" style={{
              backgroundImage: `url(${getFlagImageUrl(barbers?.[1]?.country_code || 'ca')})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.3
            }} />

              {/* Barber Photo */}
              <div className="absolute top-[12%] right-1/2 transform translate-x-1/2 w-[20vw] h-[20vw] max-w-[80px] max-h-[80px] sm:max-w-[120px] sm:max-h-[120px] lg:max-w-[160px] lg:max-h-[160px] rounded-full overflow-hidden border-2 sm:border-4 border-white/80 shadow-xl sm:shadow-2xl">
                <img 
                  src={barbers?.[1]?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${barbers?.[1]?.id}`} 
                  alt={barbers?.[1]?.display_name || barbers?.[1]?.name || 'Barber 2'} 
                  className="w-full h-full object-cover" 
                />
              </div>

              {/* Barber Name */}
              <div className="absolute top-[32%] right-1/2 transform translate-x-1/2 text-center z-10">
                <h3 className="text-white text-[8px] xs:text-[10px] sm:text-sm lg:text-base font-bold drop-shadow-lg bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                  {barbers?.[1]?.display_name || barbers?.[1]?.name || 'Barber 2'}
                </h3>
              </div>

              {/* Video Box */}
              <div className="absolute top-[45%] right-1/2 transform translate-x-1/2 w-[35vw] h-[35vw] max-w-[140px] max-h-[140px] sm:max-w-[200px] sm:max-h-[200px] lg:max-w-[260px] lg:max-h-[260px] bg-black/80 border border-white/30 rounded-lg overflow-hidden shadow-lg cursor-pointer group hover:bg-primary/20 transition-all duration-300">
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 group-hover:from-primary/20 group-hover:to-primary/40 transition-all duration-300">
                  <Play className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white/60 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                </div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/40 to-black/60" />

              {/* Vote Percentage */}
              <div className="absolute top-1 sm:top-2 lg:top-3 right-1 sm:right-2 lg:right-3 z-10">
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5">
                  <span className="text-white font-bold text-xs sm:text-sm lg:text-lg xl:text-xl">50%</span>
                </div>
              </div>

              {/* Vertical Action Buttons */}
              
            </div>
          </div>

          {/* Bottom Action Buttons (Left) */}
          <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 z-10 flex gap-1 sm:gap-2">
            <Button variant="secondary" size="sm" onClick={e => {
            e.stopPropagation();
            handleLike(battle?.barber1_id || '');
          }} className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm px-2 sm:px-3">
              <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden xs:inline">Like</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={e => {
            e.stopPropagation();
            handleDonate(battle?.barber1_id || '', barbers?.[0]?.name || 'Barber 1');
          }} className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm px-2 sm:px-3">
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden xs:inline">Donate</span>
            </Button>
          </div>
        </div>
      </div>;
  }
  const barber1 = barbers.find(b => b.id === battle.barber1_id);
  const barber2 = barbers.find(b => b.id === battle.barber2_id);
  const percentages = calculatePercentages();

  // Get barber photos from profiles
  const barber1Photo = barber1?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${barber1?.id}`;
  const barber2Photo = barber2?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${barber2?.id}`;

  // Determine render mode based on battle status
  const renderMode = battle.status === 'voting' ? 'voting' : battle.status === 'completed' ? 'results' : 'preview';

  // Enhanced Voting Mode - Uses BattleVotingView
  if (renderMode === 'voting') {
    const barber1Submission = getBarberSubmission(barber1?.user_id || '');
    const barber2Submission = getBarberSubmission(barber2?.user_id || '');
    
    return (
      <div className="pt-24 lg:pt-28 pb-8 px-2 sm:px-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Main Voting Card - Full Width */}
          <div className="flex-1 max-w-7xl mx-auto">
            <div className="w-full h-[calc(100vh-200px)] bg-card rounded-2xl shadow-2xl border-2 border-primary/50 animate-glow overflow-hidden relative">
              <BattleVotingView
                barber1={{
                  id: barber1?.id || '',
                  user_id: barber1?.user_id || '',
                  name: barber1?.name || 'Barber 1',
                  country_code: barber1?.country_code,
                  photo: barber1Photo,
                  videoUrl: barber1Submission?.youtube_vod_url || battle.barber_1_video_url,
                  isLive: barber1?.is_live || false
                }}
                barber2={{
                  id: barber2?.id || '',
                  user_id: barber2?.user_id || '',
                  name: barber2?.name || 'Barber 2',
                  country_code: barber2?.country_code,
                  photo: barber2Photo,
                  videoUrl: barber2Submission?.youtube_vod_url || battle.barber_2_video_url,
                  isLive: barber2?.is_live || false
                }}
                percentages={percentages}
                totalVotes={battle.vote_count1 + battle.vote_count2}
                userVoted={userVotedFor}
                onVote={handleVote}
                onViewProfile={(barberId) => navigate(`/barber/${barberId}`)}
                isVoting={false}
              />
            </div>
          </div>

          {/* Desktop Comments Panel */}
          <div className="hidden lg:block lg:w-80">
            <BattleCommentsPanel 
              battleId={battle.id} 
              isOpen={isPanelOpen} 
              onToggle={() => setIsPanelOpen(!isPanelOpen)} 
            />
          </div>
        </div>

        {/* Mobile Comments Panel */}
        <div className="lg:hidden mt-6">
          <BattleCommentsPanel 
            battleId={battle.id} 
            isOpen={isPanelOpen} 
            onToggle={() => setIsPanelOpen(!isPanelOpen)} 
          />
        </div>

        {/* Modals */}
        <DonationModal 
          isOpen={isDonationModalOpen} 
          onClose={() => setIsDonationModalOpen(false)} 
          creatorId={selectedBarberId || ''} 
          creatorName={selectedBarberName} 
        />
        <AddFundsModal 
          isOpen={showAddFundsModal} 
          onClose={() => setShowAddFundsModal(false)} 
        />
      </div>
    );
  }

  // Results Mode - Uses BattleResultsView
  if (renderMode === 'results') {
    const barber1Submission = getBarberSubmission(barber1?.user_id || '');
    const barber2Submission = getBarberSubmission(barber2?.user_id || '');
    const winner = battle.vote_count1 > battle.vote_count2 ? 'barber1' : 
                   battle.vote_count2 > battle.vote_count1 ? 'barber2' : 'tie';
    
    return (
      <div className="pt-24 lg:pt-28 pb-8 px-2 sm:px-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Main Results Card */}
          <div className="flex-1 max-w-7xl mx-auto">
            <div className="w-full min-h-[calc(100vh-200px)] bg-card rounded-2xl shadow-2xl border-2 border-primary/50 overflow-hidden relative">
              <BattleResultsView
                barber1={{
                  id: barber1?.id || '',
                  user_id: barber1?.user_id || '',
                  name: barber1?.name || 'Barber 1',
                  country_code: barber1?.country_code,
                  photo: barber1Photo,
                  videoUrl: barber1Submission?.youtube_vod_url || battle.barber_1_video_url,
                  votes: battle.vote_count1
                }}
                barber2={{
                  id: barber2?.id || '',
                  user_id: barber2?.user_id || '',
                  name: barber2?.name || 'Barber 2',
                  country_code: barber2?.country_code,
                  photo: barber2Photo,
                  videoUrl: barber2Submission?.youtube_vod_url || battle.barber_2_video_url,
                  votes: battle.vote_count2
                }}
                winner={winner}
                percentages={percentages}
                onViewProfile={(barberId) => navigate(`/barber/${barberId}`)}
              />
            </div>
          </div>

          {/* Desktop Comments Panel */}
          <div className="hidden lg:block lg:w-80">
            <BattleCommentsPanel 
              battleId={battle.id} 
              isOpen={isPanelOpen} 
              onToggle={() => setIsPanelOpen(!isPanelOpen)} 
            />
          </div>
        </div>

        {/* Mobile Comments Panel */}
        <div className="lg:hidden mt-6">
          <BattleCommentsPanel 
            battleId={battle.id} 
            isOpen={isPanelOpen} 
            onToggle={() => setIsPanelOpen(!isPanelOpen)} 
          />
        </div>

        {/* Modals */}
        <DonationModal 
          isOpen={isDonationModalOpen} 
          onClose={() => setIsDonationModalOpen(false)} 
          creatorId={selectedBarberId || ''} 
          creatorName={selectedBarberName} 
        />
        <AddFundsModal 
          isOpen={showAddFundsModal} 
          onClose={() => setShowAddFundsModal(false)} 
        />
      </div>
    );
  }

  // Preview Mode - Original Layout (for upcoming/active battles)
  return <div className="pt-24 lg:pt-28 pb-8 px-2 sm:px-4 max-w-5xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Main Battle Card - 30% smaller */}
        <div className="flex-1 max-w-3xl mx-auto lg:mx-0">
          <div className="w-full aspect-[16/9] sm:aspect-[16/10] bg-card rounded-xl sm:rounded-2xl shadow-2xl border-2 border-primary/50 animate-glow overflow-hidden relative transform-gpu will-change-transform">
            <div className="h-full flex">
              {/* Barber 1 Side */}
              <div className="flex-1 relative overflow-hidden" onClick={() => handleVote(barber1?.user_id || '')}>
                {/* Flag Background */}
                <div className="absolute inset-0" style={{
                backgroundImage: `url(${getFlagImageUrl(barber1?.country_code || 'us')})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.3
              }} />
                
                {/* Barber Photo - Smaller and Clearer */}
                <div className="absolute top-[25%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-white/80 shadow-2xl">
                  <img src={barber1Photo} alt={barber1?.name} className="w-full h-full object-cover" />
                </div>

                {/* Barber Name - Under profile photo */}
                <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 text-center z-10">
                  <h3 className="text-white text-xs sm:text-sm lg:text-base font-bold drop-shadow-lg bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">{barber1?.name}</h3>
                </div>

                {/* Portrait Video Box - Shows live stream or featured video */}
                <div 
                  className="absolute top-[55%] left-1/2 transform -translate-x-1/2 w-28 h-40 sm:w-36 sm:h-52 lg:w-44 lg:h-64 rounded-lg overflow-hidden shadow-2xl cursor-pointer hover:ring-4 hover:ring-primary/50 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFullscreenVideoOpen(true);
                  }}
                >
                  {(() => {
                  const submission = getBarberSubmission(barber1?.user_id || '');
                  const barberData = barbers?.find(b => b.user_id === barber1?.user_id);
                  
                  // Priority: submission video > live stream > featured video > upload button > placeholder
                  const youtubeUrl = submission?.youtube_vod_url || battle?.youtube_vod_url;
                  const isSubmissionLive = battle?.status === 'live' && submission?.is_live_stream;
                  
                  if (youtubeUrl) {
                    return <YouTubeStreamPlayer videoUrl={youtubeUrl} isLive={isSubmissionLive} title={submission?.title} />;
                  }
                  
                  // Show barber's live stream or featured video
                  if (barberData && (barberData.is_live || barberData.featured_video_id)) {
                    return <BarberVideoSection
                      videoId={barberData.is_live ? barberData.live_video_id : barberData.featured_video_id}
                      isLive={barberData.is_live || false}
                      aspectRatio="portrait"
                    />;
                  }
                  
                  if (canUserUpload(barber1?.user_id || '')) {
                    return <button onClick={e => {
                      e.stopPropagation();
                      handleVideoUpload();
                    }} className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40 hover:from-primary/30 hover:to-primary/50 transition-all duration-300">
                          <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-white mb-1" />
                          <span className="text-white text-[8px] sm:text-xs">Upload Video</span>
                        </button>;
                  }
                  return <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 group-hover:from-primary/20 group-hover:to-primary/40 transition-all duration-300 cursor-pointer">
                        <Play className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white/60 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                      </div>;
                })()}
                </div>

                {/* View Profile Button */}
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-10">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/barber/${barber1?.user_id}`);
                    }}
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30 text-xs px-3"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Profile
                  </Button>
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
                
                {/* Vote Percentage */}
                <div className="absolute top-3 sm:top-6 left-3 sm:left-6 z-10">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-2 sm:px-3 py-1 sm:py-1.5">
                    <span className="text-white font-bold text-sm sm:text-lg lg:text-xl">{percentages.barber1}%</span>
                  </div>
                </div>

                {/* Vertical Stats Bar */}
                <div className="absolute left-3 sm:left-6 top-1/2 transform -translate-y-1/2 z-10 flex flex-col gap-2 bg-black/60 backdrop-blur-sm rounded-lg p-2">
                  <div className="flex items-center gap-1 text-white text-xs">
                    <TrendingUp className="w-3 h-3" />
                    <span>#5</span>
                  </div>
                  <div className="flex items-center gap-1 text-white text-xs">
                    <Heart className="w-3 h-3" />
                    <span>{battle.vote_count1}</span>
                  </div>
                  <div className="flex items-center gap-1 text-white text-xs">
                    <Users className="w-3 h-3" />
                    <span>1.2k</span>
                  </div>
                  <div className="flex items-center gap-1 text-white text-xs">
                    <DollarSign className="w-3 h-3" />
                    <span>$320</span>
                  </div>
                </div>

              </div>

              {/* Vertical Advertisement Bar */}
              <div className="absolute left-1/2 top-0 bottom-0 transform -translate-x-1/2 z-20 w-16 sm:w-20 lg:w-24">
                <div className="h-full bg-gradient-to-b from-black/80 via-black/60 to-black/80 backdrop-blur-sm border-x-2 border-white/20 flex flex-col">
                  {/* Ad Spot 1 */}
                  <div className="flex-1 border-b border-white/20 flex items-center justify-center group hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="text-center">
                      <div className="text-white/60 text-xs font-medium">AD</div>
                      <div className="text-white/40 text-[10px]">SPOT 1</div>
                    </div>
                  </div>
                  
                  {/* VS Center */}
                  <div className="h-16 sm:h-20 lg:h-24 flex items-center justify-center bg-white/10">
                    <div className="bg-white rounded-full w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 flex items-center justify-center shadow-2xl border-2 border-primary">
                      <span className="text-xs sm:text-sm font-bold text-primary">VS</span>
                    </div>
                  </div>
                  
                  {/* Ad Spot 2 */}
                  <div className="flex-1 border-b border-white/20 flex items-center justify-center group hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="text-center">
                      <div className="text-white/60 text-xs font-medium">AD</div>
                      <div className="text-white/40 text-[10px]">SPOT 2</div>
                    </div>
                  </div>
                  
                  {/* Ad Spot 3 */}
                  <div className="flex-1 border-b border-white/20 flex items-center justify-center group hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="text-center">
                      <div className="text-white/60 text-xs font-medium">AD</div>
                      <div className="text-white/40 text-[10px]">SPOT 3</div>
                    </div>
                  </div>
                  
                  {/* Ad Spot 4 */}
                  <div className="flex-1 flex items-center justify-center group hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="text-center">
                      <div className="text-white/60 text-xs font-medium">AD</div>
                      <div className="text-white/40 text-[10px]">SPOT 4</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barber 2 Side */}
              <div className="flex-1 relative overflow-hidden" onClick={() => handleVote(barber2?.user_id || '')}>
                {/* Flag Background */}
                <div className="absolute inset-0" style={{
                backgroundImage: `url(${getFlagImageUrl(barber2?.country_code || 'ca')})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.3
              }} />
                
                {/* Barber Photo - Smaller and Clearer */}
                <div className="absolute top-[25%] right-1/2 transform translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-white/80 shadow-2xl">
                  <img src={barber2Photo} alt={barber2?.name} className="w-full h-full object-cover" />
                </div>

                {/* Barber Name - Under profile photo */}
                <div className="absolute top-[40%] right-1/2 transform translate-x-1/2 text-center z-10">
                  <h3 className="text-white text-xs sm:text-sm lg:text-base font-bold drop-shadow-lg bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">{barber2?.name}</h3>
                </div>

                {/* Portrait Video Box - Shows live stream or featured video */}
                <div 
                  className="absolute top-[55%] right-1/2 transform translate-x-1/2 w-28 h-40 sm:w-36 sm:h-52 lg:w-44 lg:h-64 rounded-lg overflow-hidden shadow-2xl cursor-pointer hover:ring-4 hover:ring-primary/50 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFullscreenVideoOpen(true);
                  }}
                >
                  {(() => {
                  const submission = getBarberSubmission(barber2?.user_id || '');
                  const barberData = barbers?.find(b => b.user_id === barber2?.user_id);
                  
                  // Priority: submission video > live stream > featured video > upload button > placeholder
                  const youtubeUrl = submission?.youtube_vod_url || battle?.youtube_vod_url;
                  const isSubmissionLive = battle?.status === 'live' && submission?.is_live_stream;
                  
                  if (youtubeUrl) {
                    return <YouTubeStreamPlayer videoUrl={youtubeUrl} isLive={isSubmissionLive} title={submission?.title} />;
                  }
                  
                  // Show barber's live stream or featured video
                  if (barberData && (barberData.is_live || barberData.featured_video_id)) {
                    return <BarberVideoSection
                      videoId={barberData.is_live ? barberData.live_video_id : barberData.featured_video_id}
                      isLive={barberData.is_live || false}
                      aspectRatio="portrait"
                    />;
                  }
                  
                  if (canUserUpload(barber2?.user_id || '')) {
                    return <button onClick={e => {
                      e.stopPropagation();
                      handleVideoUpload();
                    }} className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40 hover:from-primary/30 hover:to-primary/50 transition-all duration-300">
                          <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-white mb-1" />
                          <span className="text-white text-[8px] sm:text-xs">Upload Video</span>
                        </button>;
                  }
                  return <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 group-hover:from-primary/20 group-hover:to-primary/40 transition-all duration-300 cursor-pointer">
                        <Play className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white/60 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                      </div>;
                })()}
                </div>

                {/* View Profile Button */}
                <div className="absolute bottom-3 right-1/2 transform translate-x-1/2 z-10">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/barber/${barber2?.user_id}`);
                    }}
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30 text-xs px-3"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Profile
                  </Button>
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/40 to-black/60" />
                
                {/* Vote Percentage */}
                <div className="absolute top-3 sm:top-6 right-3 sm:right-6 z-10">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-2 sm:px-3 py-1 sm:py-1.5">
                    <span className="text-white font-bold text-sm sm:text-lg lg:text-xl">{percentages.barber2}%</span>
                  </div>
                </div>

                {/* Vertical Stats Bar */}
                <div className="absolute right-3 sm:right-6 top-1/2 transform -translate-y-1/2 z-10 flex flex-col gap-2 bg-black/60 backdrop-blur-sm rounded-lg p-2">
                  <div className="flex items-center gap-1 text-white text-xs">
                    <TrendingUp className="w-3 h-3" />
                    <span>#3</span>
                  </div>
                  <div className="flex items-center gap-1 text-white text-xs">
                    <Heart className="w-3 h-3" />
                    <span>{battle.vote_count2}</span>
                  </div>
                  <div className="flex items-center gap-1 text-white text-xs">
                    <Users className="w-3 h-3" />
                    <span>2.1k</span>
                  </div>
                  <div className="flex items-center gap-1 text-white text-xs">
                    <DollarSign className="w-3 h-3" />
                    <span>$890</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Action Buttons - Bottom Left */}
            <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 z-10 flex gap-1 sm:gap-2">
              <Button variant="secondary" size="sm" onClick={e => {
              e.stopPropagation();
              handleLike(barber1?.user_id || '');
            }} className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm px-2 sm:px-3">
                <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden xs:inline">Like</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={e => {
              e.stopPropagation();
              handleDonate(barber1?.user_id || '', barber1?.name || '');
            }} className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm px-2 sm:px-3">
                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden xs:inline">Donate</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Comments Panel */}
        <div className="hidden lg:block lg:w-80">
          <BattleCommentsPanel battleId={battle.id} isOpen={isPanelOpen} onToggle={() => setIsPanelOpen(!isPanelOpen)} />
        </div>
      </div>

      {/* Mobile Comments Panel */}
      <div className="lg:hidden mt-6">
        <BattleCommentsPanel battleId={battle.id} isOpen={isPanelOpen} onToggle={() => setIsPanelOpen(!isPanelOpen)} />
      </div>

      {/* Donation Modal */}
      <DonationModal isOpen={isDonationModalOpen} onClose={() => setIsDonationModalOpen(false)} creatorId={selectedBarberId || ''} creatorName={selectedBarberName} />
      
      {/* Add Funds Modal */}
      <AddFundsModal isOpen={showAddFundsModal} onClose={() => setShowAddFundsModal(false)} />
      
      {/* Upload Modal */}
      {showUploadModal && battle && <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Upload Battle Video</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowUploadModal(false)} className="text-muted-foreground hover:text-white">
                ✕
              </Button>
            </div>
            <div className="p-4">
              <VideoUpload battleId={battle.id} onVideoUploaded={() => {
            setShowUploadModal(false);
            refetchSubmissions();
            toast.success('Video uploaded successfully!');
          }} />
            </div>
          </div>
        </div>}

      {/* Fullscreen Video Modal */}
      {isFullscreenVideoOpen && barbers && barbers.length >= 2 && (
        <FullscreenBattleVideoModal
          isOpen={isFullscreenVideoOpen}
          onClose={() => setIsFullscreenVideoOpen(false)}
          barber1={{
            id: barbers[0]?.id || '',
            user_id: barbers[0]?.user_id || '',
            name: barbers[0]?.display_name || barbers[0]?.name || 'Barber 1',
            country_code: barbers[0]?.country_code,
            photo: barber1Photo,
            videoUrl: getBarberSubmission(barbers[0]?.user_id || '')?.youtube_vod_url,
            isLive: barbers[0]?.is_live,
            submission: getBarberSubmission(barbers[0]?.user_id || '')
          }}
          barber2={{
            id: barbers[1]?.id || '',
            user_id: barbers[1]?.user_id || '',
            name: barbers[1]?.display_name || barbers[1]?.name || 'Barber 2',
            country_code: barbers[1]?.country_code,
            photo: barber2Photo,
            videoUrl: getBarberSubmission(barbers[1]?.user_id || '')?.youtube_vod_url,
            isLive: barbers[1]?.is_live,
            submission: getBarberSubmission(barbers[1]?.user_id || '')
          }}
          percentages={percentages}
          userVotedFor={userVotedFor}
          onVote={handleVote}
          onLike={handleLike}
          onDonate={handleDonate}
          onFollow={handleFollow}
        />
      )}
    </div>;
};