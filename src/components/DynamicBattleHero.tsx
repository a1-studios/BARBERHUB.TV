import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Trophy, Users, Heart, Coins, Zap, Gift, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { DonationModal } from "@/components/DonationModal";
import { BattleCommentsPanel } from "@/components/BattleCommentsPanel";

interface BattleData {
  id: string;
  title: string;
  status: string;
  stream_url?: string;
  live_viewers: number;
  barber1: {
    name: string;
    nickname?: string;
    country_code?: string;
    avatar_url?: string;
    votes: number;
  };
  barber2: {
    name: string;
    nickname?: string;
    country_code?: string;
    avatar_url?: string;
    votes: number;
  };
}

const DynamicBattleHero = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [userBarberBucks, setUserBarberBucks] = useState(0);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [selectedBarberForDonation, setSelectedBarberForDonation] = useState<{id: string, name: string} | null>(null);
  const [isCommentsPanelOpen, setIsCommentsPanelOpen] = useState(false);

  // Fetch user profile for barber bucks
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (profile) {
      setUserBarberBucks(profile.barber_bucks || 0);
    }
  }, [profile]);

  useEffect(() => {
    fetchFeaturedBattle();
  }, []);

  const fetchFeaturedBattle = async () => {
    try {
      // Fetch active battle with head-to-head setup
      const { data: battleData, error } = await supabase
        .from('battles')
        .select(`
          id,
          title,
          status,
          stream_url,
          live_viewers,
          barber1_id,
          barber2_id,
          vote_count1,
          vote_count2
        `)
        .in('status', ['active', 'voting'])
        .not('barber1_id', 'is', null)
        .not('barber2_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !battleData) {
        // Fallback to mock data for demonstration
        setBattle({
          id: "demo-battle",
          title: "WORLD CHAMPIONSHIP SEMIFINALS",
          status: "voting",
          stream_url: null,
          live_viewers: 1247,
          barber1: {
            name: "MARCUS 'THE BLADE' JOHNSON",
            nickname: "THE BLADE",
            country_code: "US",
            avatar_url: null,
            votes: 1834
          },
          barber2: {
            name: "ALESSANDRO 'ARTISTA' ROSSI",
            nickname: "ARTISTA", 
            country_code: "IT",
            avatar_url: null,
            votes: 1729
          }
        });
        return;
      }

      // Fetch barber profiles
      const [barber1Response, barber2Response] = await Promise.all([
        supabase
          .from('barber_profiles')
          .select('name, nickname, country_code, user_id')
          .eq('id', battleData.barber1_id)
          .single(),
        supabase
          .from('barber_profiles')
          .select('name, nickname, country_code, user_id')
          .eq('id', battleData.barber2_id)
          .single()
      ]);

      if (barber1Response.data && barber2Response.data) {
        setBattle({
          id: battleData.id,
          title: battleData.title,
          status: battleData.status,
          stream_url: battleData.stream_url,
          live_viewers: battleData.live_viewers || 0,
          barber1: {
            name: barber1Response.data.name,
            nickname: barber1Response.data.nickname,
            country_code: barber1Response.data.country_code,
            avatar_url: null,
            votes: battleData.vote_count1 || 0
          },
          barber2: {
            name: barber2Response.data.name,
            nickname: barber2Response.data.nickname,
            country_code: barber2Response.data.country_code,
            avatar_url: null,
            votes: battleData.vote_count2 || 0
          }
        });
      }
    } catch (error) {
      console.error('Error fetching battle:', error);
    }
  };

  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) return "🌍";
    return `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`;
  };

  const getFlagEmoji = (countryCode?: string) => {
    if (!countryCode) return "🌍";
    const flags: Record<string, string> = {
      'US': '🇺🇸', 'IT': '🇮🇹', 'BR': '🇧🇷', 'FR': '🇫🇷', 'DE': '🇩🇪', 
      'UK': '🇬🇧', 'ES': '🇪🇸', 'JP': '🇯🇵', 'CA': '🇨🇦', 'AU': '🇦🇺'
    };
    return flags[countryCode.toUpperCase()] || "🌍";
  };

  const handleVote = (barberId: 'barber1' | 'barber2') => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (profile?.user_type !== 'fan') {
      return; // Only fans can vote
    }

    navigate(`/battles/${battle?.id}`);
  };

  const handleDonate = (barberName: string, barberId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setSelectedBarberForDonation({ id: barberId, name: barberName });
    setIsDonationModalOpen(true);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: battle?.title || 'Barber Battle',
        text: 'Check out this epic barber battle!',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // Could add toast notification here
    }
  };

  const getTotalVotes = () => {
    if (!battle) return 0;
    return battle.barber1.votes + battle.barber2.votes;
  };

  const getVotePercentage = (votes: number) => {
    const total = getTotalVotes();
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  if (!battle) {
    return (
      <section className="relative h-[80vh] flex items-center justify-center">
        <div className="animate-pulse text-2xl text-muted-foreground">
          Loading featured battle...
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[80vh] lg:h-[80vh] overflow-hidden bg-black">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900/95 to-black" />
      
      {/* Main Battle Display */}
      <div className="relative h-full flex">
        {/* Left and Right Barbers Container */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Left Barber */}
          <div className="flex-1 relative group cursor-pointer order-1 hover:scale-105 transition-transform duration-300" onClick={() => handleVote('barber1')}>
          {/* Flag Background */}
          <div className="absolute inset-0 opacity-60 lg:opacity-50">
            {battle.barber1.country_code ? (
              <img 
                src={getCountryFlag(battle.barber1.country_code)}
                alt={`${battle.barber1.country_code} flag`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling!.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-full h-full bg-gradient-to-br from-blue-600/60 to-red-600/60 ${battle.barber1.country_code ? 'hidden' : ''}`} />
          </div>
          
          {/* Dark Overlay for better text contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30 lg:to-transparent" />
          
          {/* Barber Portrait */}
          <div className="absolute inset-0 flex items-center justify-center lg:justify-start">
            <div className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 xl:w-96 xl:h-96 rounded-lg overflow-hidden shadow-2xl ml-0 lg:ml-8 xl:ml-12">
              <img 
                src={battle.barber1.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face"}
                alt={battle.barber1.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face";
                }}
              />
            </div>
          </div>
          
          {/* Content Overlay */}
          <div className="relative z-10 h-full min-h-[40vh] lg:min-h-0 flex flex-col justify-end p-4 sm:p-6 lg:p-8 xl:p-12">
            {/* Country Badge */}
            {battle.barber1.country_code && (
              <Badge className="w-fit mb-2 lg:mb-4 bg-black/70 text-white border-white/30 text-xs sm:text-sm">
                <span className="text-base mr-1">{getFlagEmoji(battle.barber1.country_code)}</span>
                {battle.barber1.country_code.toUpperCase()}
              </Badge>
            )}
            
            {/* Barber Name */}
            <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-1 lg:mb-2 leading-tight drop-shadow-lg">
              {battle.barber1.name}
            </h2>
            
            {/* Nickname */}
            {battle.barber1.nickname && (
              <p className="text-sm sm:text-lg lg:text-xl xl:text-2xl text-orange-400 mb-3 lg:mb-6 drop-shadow-lg">
                "{battle.barber1.nickname}"
              </p>
            )}
            
            {/* Vote Count and Percentage */}
            <div className="flex flex-col gap-2 mb-3 lg:mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 lg:w-6 lg:h-6 text-orange-400" />
                <span className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-white drop-shadow-lg">
                  {battle.barber1.votes.toLocaleString()}
                </span>
                <span className="text-gray-300 text-sm lg:text-base">votes</span>
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-orange-400 drop-shadow-lg">
                {getVotePercentage(battle.barber1.votes)}%
              </div>
            </div>
            
            {/* Vote Button - Hidden on mobile, shown on desktop */}
            {user && profile?.user_type === 'fan' && (
              <Button 
                size="sm"
                className="w-fit bg-orange-500 hover:bg-orange-600 text-white group-hover:scale-105 transition-transform hidden lg:flex lg:size-default"
              >
                <Heart className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                <span className="text-xs lg:text-sm xl:text-base">VOTE FOR {(battle.barber1.nickname || battle.barber1.name.split(' ')[0]).toUpperCase()}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Center VS Section */}
        <div className="order-2 flex-shrink-0 lg:absolute lg:left-1/2 lg:top-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:z-30">
          <div className="text-center py-4 lg:py-0">
            {/* Battle Title */}
            <div className="mb-3 lg:mb-6">
              <Badge className="bg-orange-500 text-white px-3 py-1 lg:px-4 lg:py-2 text-xs lg:text-sm font-semibold mb-1 lg:mb-2 animate-pulse">
                {battle.status === 'voting' ? 'VOTING NOW' : 'LIVE BATTLE'}
              </Badge>
              <h1 className="text-sm sm:text-base lg:text-xl xl:text-2xl font-bold text-white px-4 lg:px-0 drop-shadow-lg">
                {battle.title}
              </h1>
            </div>
            
            {/* VS Circle */}
            <div className="relative mb-3 lg:mb-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 xl:w-40 xl:h-40 mx-auto rounded-full bg-black/80 border-4 border-orange-500 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300">
                {battle.stream_url ? (
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-16 xl:h-16 text-orange-500" />
                ) : (
                  <span className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-orange-500">VS</span>
                )}
              </div>
              
              {/* Live Indicator */}
              {battle.status === 'active' && (
                <div className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2">
                  <div className="bg-red-500 text-white px-1 py-0.5 lg:px-2 lg:py-1 rounded-full text-xs font-bold animate-pulse">
                    LIVE
                  </div>
                </div>
              )}
            </div>
            
            {/* Viewer Count */}
            <div className="flex items-center justify-center gap-1 lg:gap-2 text-gray-300">
              <Users className="w-3 h-3 lg:w-4 lg:h-4" />
              <span className="text-xs lg:text-sm">{battle.live_viewers.toLocaleString()} watching</span>
            </div>
          </div>
        </div>

        {/* Right Barber */}
        <div className="flex-1 relative group cursor-pointer order-3 hover:scale-105 transition-transform duration-300" onClick={() => handleVote('barber2')}>
          {/* Flag Background */}
          <div className="absolute inset-0 opacity-60 lg:opacity-50">
            {battle.barber2.country_code ? (
              <img 
                src={getCountryFlag(battle.barber2.country_code)}
                alt={`${battle.barber2.country_code} flag`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling!.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-full h-full bg-gradient-to-bl from-green-600/60 to-red-600/60 ${battle.barber2.country_code ? 'hidden' : ''}`} />
          </div>
          
          {/* Dark Overlay for better text contrast */}
          <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/50 to-black/30 lg:to-transparent" />
          
          {/* Barber Portrait */}
          <div className="absolute inset-0 flex items-center justify-center lg:justify-end">
            <div className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 xl:w-96 xl:h-96 rounded-lg overflow-hidden shadow-2xl mr-0 lg:mr-8 xl:mr-12">
              <img 
                src={battle.barber2.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"}
                alt={battle.barber2.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face";
                }}
              />
            </div>
          </div>
          
          {/* Content Overlay */}
          <div className="relative z-10 h-full min-h-[40vh] lg:min-h-0 flex flex-col justify-end items-start lg:items-end text-left lg:text-right p-4 sm:p-6 lg:p-8 xl:p-12">
            {/* Country Badge */}
            {battle.barber2.country_code && (
              <Badge className="w-fit mb-2 lg:mb-4 bg-black/70 text-white border-white/30 text-xs sm:text-sm">
                <span className="text-base mr-1">{getFlagEmoji(battle.barber2.country_code)}</span>
                {battle.barber2.country_code.toUpperCase()}
              </Badge>
            )}
            
            {/* Barber Name */}
            <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-1 lg:mb-2 leading-tight drop-shadow-lg">
              {battle.barber2.name}
            </h2>
            
            {/* Nickname */}
            {battle.barber2.nickname && (
              <p className="text-sm sm:text-lg lg:text-xl xl:text-2xl text-orange-400 mb-3 lg:mb-6 drop-shadow-lg">
                "{battle.barber2.nickname}"
              </p>
            )}
            
            {/* Vote Count and Percentage */}
            <div className="flex flex-col gap-2 mb-3 lg:mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 lg:w-6 lg:h-6 text-orange-400" />
                <span className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-white drop-shadow-lg">
                  {battle.barber2.votes.toLocaleString()}
                </span>
                <span className="text-gray-300 text-sm lg:text-base">votes</span>
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-orange-400 drop-shadow-lg">
                {getVotePercentage(battle.barber2.votes)}%
              </div>
            </div>
            
            {/* Vote Button - Hidden on mobile, shown on desktop */}
            {user && profile?.user_type === 'fan' && (
              <Button 
                size="sm"
                className="w-fit bg-orange-500 hover:bg-orange-600 text-white group-hover:scale-105 transition-transform hidden lg:flex lg:size-default"
              >
                <Heart className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                <span className="text-xs lg:text-sm xl:text-base">VOTE FOR {(battle.barber2.nickname || battle.barber2.name.split(' ')[0]).toUpperCase()}</span>
              </Button>
            )}
          </div>
        </div>

        </div>

        {/* Right Side Comments Panel - Desktop Only */}
        <div className="hidden xl:block w-80 border-l border-gray-700 bg-black/50">
          <BattleCommentsPanel 
            battleId={battle?.id || ""} 
            onToggle={() => setIsCommentsPanelOpen(!isCommentsPanelOpen)}
          />
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="lg:absolute lg:bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-gray-700">
        <div className="container mx-auto px-4 py-4 lg:py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-4">
            {/* Next Battle Message */}
            <div className="text-center lg:text-left">
              <h3 className="text-lg lg:text-xl font-bold text-white mb-1">
                NEXT BATTLE: YOUR ARENA AWAITS
              </h3>
              <p className="text-sm lg:text-base text-gray-300">
                {battle.status === 'voting' ? 'Vote now and support your favorite!' : 'Join the live battle experience'}
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 lg:gap-3 w-full lg:w-auto">
              {/* Barber Bucks Display */}
              {user && (
                <div className="flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 px-3 py-2 rounded-lg">
                  <Coins className="w-4 h-4 text-orange-400" />
                  <span className="font-semibold text-white text-sm">BB {userBarberBucks}</span>
                </div>
              )}
              
              {/* Donate Button */}
              {user && (
                <Button 
                  size="sm" 
                  onClick={() => handleDonate(battle.barber1.name, "barber1_id")}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 text-sm hover:scale-105 transition-transform"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  DONATE
                </Button>
              )}
              
              {/* Main Action Button */}
              {user ? (
                <Button 
                  size="sm" 
                  onClick={() => navigate(`/battles/${battle.id}`)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 w-full sm:w-auto text-sm hover:scale-105 transition-transform"
                >
                  {battle.status === 'voting' ? (
                    <>
                      <Heart className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">VOTE</span>
                      <span className="sm:hidden">VOTE</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">WATCH</span>
                      <span className="sm:hidden">WATCH</span>
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  onClick={() => navigate('/auth')}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 w-full sm:w-auto text-sm hover:scale-105 transition-transform"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  JOIN!
                </Button>
              )}
              
              {/* Share Button */}
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleShare}
                className="border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white text-sm hover:scale-105 transition-transform"
              >
                <Share2 className="w-4 h-4 mr-2" />
                SHARE
              </Button>

              {/* Comments Toggle - Mobile Only */}
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsCommentsPanelOpen(!isCommentsPanelOpen)}
                className="border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white xl:hidden text-sm hover:scale-105 transition-transform"
              >
                <Users className="w-4 h-4 mr-2" />
                CHAT
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Comments Panel Overlay */}
      {isCommentsPanelOpen && (
        <div className="xl:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-black border-l border-gray-700">
            <BattleCommentsPanel 
              battleId={battle?.id || ""} 
              onToggle={() => setIsCommentsPanelOpen(false)}
              isMobile={true}
            />
          </div>
        </div>
      )}

      {/* Donation Modal */}
      {selectedBarberForDonation && (
        <DonationModal
          isOpen={isDonationModalOpen}
          onClose={() => {
            setIsDonationModalOpen(false);
            setSelectedBarberForDonation(null);
          }}
          creatorId={selectedBarberForDonation.id}
          creatorName={selectedBarberForDonation.name}
        />
      )}
    </section>
  );
};

export default DynamicBattleHero;