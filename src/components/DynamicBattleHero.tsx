import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Trophy, Users, Heart, Coins, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

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

  const handleDonate = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    // TODO: Implement donation modal
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
    <section className="relative min-h-[80vh] lg:h-[80vh] overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/5" />
      
      {/* Main Battle Display */}
      <div className="relative h-full flex flex-col lg:flex-row">
        {/* Left Barber */}
        <div className="flex-1 relative group cursor-pointer order-1" onClick={() => handleVote('barber1')}>
          {/* Flag Background */}
          <div className="absolute inset-0 opacity-50 lg:opacity-40">
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
            <div className={`w-full h-full bg-gradient-to-br from-primary/20 to-primary/30 ${battle.barber1.country_code ? 'hidden' : ''}`} />
          </div>
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-background/30 lg:to-transparent" />
          
          {/* Content */}
          <div className="relative h-full min-h-[40vh] lg:min-h-0 flex flex-col justify-center p-4 sm:p-6 lg:p-8 xl:p-12">
            {/* Country Badge */}
            {battle.barber1.country_code && (
              <Badge className="w-fit mb-2 lg:mb-4 bg-primary/20 text-primary border-primary/30 text-xs sm:text-sm">
                <span className="text-base mr-1">{getFlagEmoji(battle.barber1.country_code)}</span>
                {battle.barber1.country_code.toUpperCase()}
              </Badge>
            )}
            
            {/* Barber Name */}
            <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-5xl font-bold text-foreground mb-1 lg:mb-2 leading-tight">
              {battle.barber1.name}
            </h2>
            
            {/* Nickname */}
            {battle.barber1.nickname && (
              <p className="text-sm sm:text-lg lg:text-xl xl:text-2xl text-primary mb-3 lg:mb-6">
                "{battle.barber1.nickname}"
              </p>
            )}
            
            {/* Vote Count */}
            <div className="flex items-center gap-2 mb-3 lg:mb-4">
              <Trophy className="w-4 h-4 lg:w-6 lg:h-6 text-primary" />
              <span className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-foreground">
                {battle.barber1.votes.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-sm lg:text-base">votes</span>
            </div>
            
            {/* Vote Button - Hidden on mobile, shown on desktop */}
            {user && profile?.user_type === 'fan' && (
              <Button 
                size="sm"
                className="w-fit bg-primary hover:bg-primary/90 text-primary-foreground group-hover:scale-105 transition-transform hidden lg:flex lg:size-default"
              >
                <Heart className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                <span className="text-xs lg:text-sm xl:text-base">VOTE FOR {(battle.barber1.nickname || battle.barber1.name.split(' ')[0]).toUpperCase()}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Center VS Section */}
        <div className="order-2 flex-shrink-0 lg:absolute lg:left-1/2 lg:top-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:z-20">
          <div className="text-center py-4 lg:py-0">
            {/* Battle Title */}
            <div className="mb-3 lg:mb-6">
              <Badge className="bg-primary text-primary-foreground px-3 py-1 lg:px-4 lg:py-2 text-xs lg:text-sm font-semibold mb-1 lg:mb-2">
                {battle.status === 'voting' ? 'VOTING NOW' : 'LIVE BATTLE'}
              </Badge>
              <h1 className="text-sm sm:text-base lg:text-xl xl:text-2xl font-bold text-foreground px-4 lg:px-0">
                {battle.title}
              </h1>
            </div>
            
            {/* VS Circle */}
            <div className="relative mb-3 lg:mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-32 xl:h-32 mx-auto rounded-full bg-background border-2 lg:border-4 border-primary flex items-center justify-center shadow-lg">
                {battle.stream_url ? (
                  <Play className="w-6 h-6 sm:w-8 sm:h-8 lg:w-8 lg:h-8 xl:w-12 xl:h-12 text-primary" />
                ) : (
                  <span className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-primary">VS</span>
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
            <div className="flex items-center justify-center gap-1 lg:gap-2 text-muted-foreground">
              <Users className="w-3 h-3 lg:w-4 lg:h-4" />
              <span className="text-xs lg:text-sm">{battle.live_viewers.toLocaleString()} watching</span>
            </div>
          </div>
        </div>

        {/* Right Barber */}
        <div className="flex-1 relative group cursor-pointer order-3" onClick={() => handleVote('barber2')}>
          {/* Flag Background */}
          <div className="absolute inset-0 opacity-50 lg:opacity-40">
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
            <div className={`w-full h-full bg-gradient-to-bl from-secondary/20 to-secondary/30 ${battle.barber2.country_code ? 'hidden' : ''}`} />
          </div>
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-l from-background/90 via-background/50 to-background/30 lg:to-transparent" />
          
          {/* Content */}
          <div className="relative h-full min-h-[40vh] lg:min-h-0 flex flex-col justify-center items-start lg:items-end text-left lg:text-right p-4 sm:p-6 lg:p-8 xl:p-12">
            {/* Country Badge */}
            {battle.barber2.country_code && (
              <Badge className="w-fit mb-2 lg:mb-4 bg-primary/20 text-primary border-primary/30 text-xs sm:text-sm">
                <span className="text-base mr-1">{getFlagEmoji(battle.barber2.country_code)}</span>
                {battle.barber2.country_code.toUpperCase()}
              </Badge>
            )}
            
            {/* Barber Name */}
            <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-5xl font-bold text-foreground mb-1 lg:mb-2 leading-tight">
              {battle.barber2.name}
            </h2>
            
            {/* Nickname */}
            {battle.barber2.nickname && (
              <p className="text-sm sm:text-lg lg:text-xl xl:text-2xl text-primary mb-3 lg:mb-6">
                "{battle.barber2.nickname}"
              </p>
            )}
            
            {/* Vote Count */}
            <div className="flex items-center gap-2 mb-3 lg:mb-4">
              <Trophy className="w-4 h-4 lg:w-6 lg:h-6 text-primary" />
              <span className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-foreground">
                {battle.barber2.votes.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-sm lg:text-base">votes</span>
            </div>
            
            {/* Vote Button - Hidden on mobile, shown on desktop */}
            {user && profile?.user_type === 'fan' && (
              <Button 
                size="sm"
                className="w-fit bg-primary hover:bg-primary/90 text-primary-foreground group-hover:scale-105 transition-transform hidden lg:flex lg:size-default"
              >
                <Heart className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                <span className="text-xs lg:text-sm xl:text-base">VOTE FOR {(battle.barber2.nickname || battle.barber2.name.split(' ')[0]).toUpperCase()}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="lg:absolute lg:bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="container mx-auto px-4 py-4 lg:py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-4">
            {/* Next Battle Message */}
            <div className="text-center lg:text-left">
              <h3 className="text-lg lg:text-xl font-bold text-foreground mb-1">
                NEXT BATTLE: YOUR ARENA AWAITS
              </h3>
              <p className="text-sm lg:text-base text-muted-foreground">
                {battle.status === 'voting' ? 'Vote now and support your favorite!' : 'Join the live battle experience'}
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 lg:gap-4 w-full lg:w-auto">
              {/* Barber Bucks Display */}
              {user && (
                <div className="flex items-center gap-2 bg-primary/10 px-3 py-2 lg:px-4 lg:py-2 rounded-lg">
                  <Coins className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                  <span className="font-semibold text-foreground text-sm lg:text-base">BB {userBarberBucks}</span>
                </div>
              )}
              
              {/* Main Action Button */}
              {user ? (
                <Button 
                  size="lg" 
                  onClick={() => navigate(`/battles/${battle.id}`)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 lg:px-8 w-full sm:w-auto text-sm lg:text-base"
                >
                  {battle.status === 'voting' ? (
                    <>
                      <Heart className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                      <span className="hidden sm:inline">VOTE NOW FOR YOUR FAVORITE!</span>
                      <span className="sm:hidden">VOTE NOW!</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                      <span className="hidden sm:inline">WATCH LIVE BATTLE</span>
                      <span className="sm:hidden">WATCH LIVE</span>
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  onClick={() => navigate('/auth')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 lg:px-8 w-full sm:w-auto text-sm lg:text-base"
                >
                  <Zap className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                  JOIN THE BATTLE!
                </Button>
              )}
              
              {/* Donate Button - Hidden on mobile */}
              {user && (
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={handleDonate}
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground hidden lg:flex text-sm lg:text-base"
                >
                  <Heart className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                  DONATE & CHEER
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DynamicBattleHero;