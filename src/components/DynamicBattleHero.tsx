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
    return `https://flagsapi.com/${countryCode.toUpperCase()}/flat/64.png`;
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
    <section className="relative h-[80vh] overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/5" />
      
      {/* Main Battle Display */}
      <div className="relative h-full flex">
        {/* Left Barber */}
        <div className="flex-1 relative group cursor-pointer" onClick={() => handleVote('barber1')}>
          {/* Flag Background */}
          <div className="absolute inset-0 opacity-20">
            {battle.barber1.country_code ? (
              <img 
                src={getCountryFlag(battle.barber1.country_code)}
                alt={`${battle.barber1.country_code} flag`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/20" />
            )}
          </div>
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent" />
          
          {/* Content */}
          <div className="relative h-full flex flex-col justify-center p-8 lg:p-12">
            {/* Country Badge */}
            {battle.barber1.country_code && (
              <Badge className="w-fit mb-4 bg-primary/20 text-primary border-primary/30">
                <img 
                  src={getCountryFlag(battle.barber1.country_code)}
                  alt="flag"
                  className="w-4 h-4 mr-2"
                />
                {battle.barber1.country_code.toUpperCase()}
              </Badge>
            )}
            
            {/* Barber Name */}
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-2">
              {battle.barber1.name}
            </h2>
            
            {/* Nickname */}
            {battle.barber1.nickname && (
              <p className="text-xl lg:text-2xl text-primary mb-6">
                "{battle.barber1.nickname}"
              </p>
            )}
            
            {/* Vote Count */}
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-6 h-6 text-primary" />
              <span className="text-2xl lg:text-3xl font-bold text-foreground">
                {battle.barber1.votes.toLocaleString()}
              </span>
              <span className="text-muted-foreground">votes</span>
            </div>
            
            {/* Vote Button */}
            {user && profile?.user_type === 'fan' && (
              <Button 
                size="lg" 
                className="w-fit bg-primary hover:bg-primary/90 text-primary-foreground group-hover:scale-105 transition-transform"
              >
                <Heart className="w-5 h-5 mr-2" />
                VOTE FOR {battle.barber1.nickname || battle.barber1.name.split(' ')[0]}
              </Button>
            )}
          </div>
        </div>

        {/* Center VS Section */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="text-center">
            {/* Battle Title */}
            <div className="mb-6">
              <Badge className="bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold mb-2">
                {battle.status === 'voting' ? 'VOTING NOW' : 'LIVE BATTLE'}
              </Badge>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                {battle.title}
              </h1>
            </div>
            
            {/* VS Circle */}
            <div className="relative mb-6">
              <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-background border-4 border-primary flex items-center justify-center">
                {battle.stream_url ? (
                  <Play className="w-8 h-8 lg:w-12 lg:h-12 text-primary" />
                ) : (
                  <span className="text-2xl lg:text-3xl font-bold text-primary">VS</span>
                )}
              </div>
              
              {/* Live Indicator */}
              {battle.status === 'active' && (
                <div className="absolute -top-2 -right-2">
                  <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                    LIVE
                  </div>
                </div>
              )}
            </div>
            
            {/* Viewer Count */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{battle.live_viewers.toLocaleString()} watching</span>
            </div>
          </div>
        </div>

        {/* Right Barber */}
        <div className="flex-1 relative group cursor-pointer" onClick={() => handleVote('barber2')}>
          {/* Flag Background */}
          <div className="absolute inset-0 opacity-20">
            {battle.barber2.country_code ? (
              <img 
                src={getCountryFlag(battle.barber2.country_code)}
                alt={`${battle.barber2.country_code} flag`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-bl from-secondary/10 to-secondary/20" />
            )}
          </div>
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-l from-background/80 via-background/40 to-transparent" />
          
          {/* Content */}
          <div className="relative h-full flex flex-col justify-center items-end text-right p-8 lg:p-12">
            {/* Country Badge */}
            {battle.barber2.country_code && (
              <Badge className="w-fit mb-4 bg-primary/20 text-primary border-primary/30">
                <img 
                  src={getCountryFlag(battle.barber2.country_code)}
                  alt="flag"
                  className="w-4 h-4 mr-2"
                />
                {battle.barber2.country_code.toUpperCase()}
              </Badge>
            )}
            
            {/* Barber Name */}
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-2">
              {battle.barber2.name}
            </h2>
            
            {/* Nickname */}
            {battle.barber2.nickname && (
              <p className="text-xl lg:text-2xl text-primary mb-6">
                "{battle.barber2.nickname}"
              </p>
            )}
            
            {/* Vote Count */}
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-6 h-6 text-primary" />
              <span className="text-2xl lg:text-3xl font-bold text-foreground">
                {battle.barber2.votes.toLocaleString()}
              </span>
              <span className="text-muted-foreground">votes</span>
            </div>
            
            {/* Vote Button */}
            {user && profile?.user_type === 'fan' && (
              <Button 
                size="lg" 
                className="w-fit bg-primary hover:bg-primary/90 text-primary-foreground group-hover:scale-105 transition-transform"
              >
                <Heart className="w-5 h-5 mr-2" />
                VOTE FOR {battle.barber2.nickname || battle.barber2.name.split(' ')[0]}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Next Battle Message */}
            <div className="text-center sm:text-left">
              <h3 className="text-xl font-bold text-foreground mb-1">
                NEXT BATTLE: YOUR ARENA AWAITS
              </h3>
              <p className="text-muted-foreground">
                {battle.status === 'voting' ? 'Vote now and support your favorite!' : 'Join the live battle experience'}
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              {/* Barber Bucks Display */}
              {user && (
                <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
                  <Coins className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-foreground">BB {userBarberBucks}</span>
                </div>
              )}
              
              {/* Main Action Button */}
              {user ? (
                <Button 
                  size="lg" 
                  onClick={() => navigate(`/battles/${battle.id}`)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                >
                  {battle.status === 'voting' ? (
                    <>
                      <Heart className="w-5 h-5 mr-2" />
                      VOTE NOW FOR YOUR FAVORITE!
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      WATCH LIVE BATTLE
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  onClick={() => navigate('/auth')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  JOIN THE BATTLE!
                </Button>
              )}
              
              {/* Donate Button */}
              {user && (
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={handleDonate}
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Heart className="w-5 h-5 mr-2" />
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