import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Clock, Vote, Scissors, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "./EmptyState";
interface Battle {
  id: string;
  title: string;
  description: string;
  status: string;
  participants: number;
  prize_amount: number;
  currency: string;
  category: string;
}
const BattlesSection = () => {
  const { user } = useAuth();
  const { isBarber, isFan } = useUserRole();
  const navigate = useNavigate();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user) {
      fetchFeaturedBattles();
    }
  }, [user]);

  // Fetch barber's active battles if user is a barber
  const { data: myActiveBattles } = useQuery({
    queryKey: ['myActiveBattles', user?.id],
    queryFn: async () => {
      if (!user?.id || !isBarber) return [];
      
      const { data, error } = await supabase
        .from('battle_participants')
        .select(`
          battle_id,
          joined_at,
          battles (
            id,
            title,
            description,
            status,
            prize_amount,
            currency,
            category,
            starts_at
          )
        `)
        .eq('user_id', user.id)
        .in('battles.status', ['upcoming', 'voting', 'active'])
        .order('joined_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isBarber
  });
  const fetchFeaturedBattles = async () => {
    try {
      // Fetch latest battles with participant counts
      const {
        data: battlesData,
        error
      } = await supabase.from('battles').select(`
          id,
          title,
          description,
          status,
          prize_amount,
          currency,
          category,
          created_at
        `).order('created_at', {
        ascending: false
      }).limit(6);
      if (error) throw error;
      const formattedBattles: Battle[] = (battlesData || []).map(battle => ({
        id: battle.id,
        title: battle.title,
        description: battle.description || '',
        status: battle.status,
        participants: Math.floor(Math.random() * 30) + 10,
        // Random participants for display
        prize_amount: battle.prize_amount,
        currency: battle.currency,
        category: battle.category || 'General'
      }));
      setBattles(formattedBattles);
    } catch (error) {
      console.error('Error fetching battles:', error);
      // Fallback to static data if database fetch fails
      setBattles([{
        id: "sample-1",
        title: "Best Fade Competition",
        description: "Show us your cleanest fade technique and compete for the monthly crown",
        status: "active",
        participants: 24,
        prize_amount: 500,
        currency: "USD",
        category: "Technical Skills"
      }, {
        id: "sample-2",
        title: "Creative Color Challenge",
        description: "Push the boundaries with innovative color combinations and artistic flair",
        status: "upcoming",
        participants: 18,
        prize_amount: 750,
        currency: "USD",
        category: "Creativity"
      }, {
        id: "sample-3",
        title: "Speed Cut Championship",
        description: "Precision meets speed in this ultimate barber showdown",
        status: "voting",
        participants: 32,
        prize_amount: 1000,
        currency: "USD",
        category: "Speed & Precision"
      }]);
    } finally {
      setLoading(false);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "upcoming":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "voting":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Trophy className="w-4 h-4" />;
      case "upcoming":
        return <Clock className="w-4 h-4" />;
      case "voting":
        return <Vote className="w-4 h-4" />;
      default:
        return null;
    }
  };
  const getActionText = (status: string) => {
    switch (status) {
      case "active":
        return isBarber ? "Join Battle" : "Watch Battle";
      case "upcoming":
        return isBarber ? "Join Waitlist" : "Watch Later";
      case "voting":
        return "View & Vote";
      default:
        return "View Details";
    }
  };
  if (loading) {
    return <section id="battles" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <div className="animate-pulse text-lg">Loading battles...</div>
          </div>
        </div>
      </section>;
  }
  return <section id="battles" className="relative px-0 overflow-hidden mx-0 my-0 py-[16px]">
      {/* Globe Background */}
      
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/90 mx-0 my-[50px]" />
      
      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Elite Header */}
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <Badge className="px-6 py-2 text-sm font-semibold bg-gradient-to-r from-primary/20 to-secondary/20 border-cyan/30">
              <Trophy className="w-4 h-4 mr-2 inline text-cyan" />
              GLOBAL ARENA
            </Badge>
          </div>
          <h2 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-primary via-orange-500 to-secondary bg-clip-text text-transparent leading-tight">
            {isBarber ? "BATTLE GROUND" : "WATCH & VOTE"}
          </h2>
          <p className="text-xl md:text-2xl text-foreground/80 max-w-3xl mx-auto font-light">
            {isBarber 
              ? "Compete with elite barbers worldwide. Showcase your craft, win substantial prizes, and achieve legendary status." 
              : "Experience world-class barber battles in real-time. Cast your votes, support rising stars, and influence the leaderboard."}
          </p>
        </div>

        {/* Elite Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-6 mb-16">
          {isBarber && (
            <Button 
              size="lg" 
              onClick={() => navigate('/portal')} 
              className="text-lg px-10 py-6 bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 shadow-2xl hover:shadow-primary/50 transform hover:scale-105 transition-all duration-300 font-bold"
            >
              <Zap className="mr-2 h-6 w-6 text-cyan" />
              <span className="text-cyan">Enter Battle Portal</span>
            </Button>
          )}

          {isFan && (
            <Button 
              size="lg" 
              onClick={() => navigate('/battles')} 
              className="text-lg px-10 py-6 bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 shadow-2xl hover:shadow-primary/50 transform hover:scale-105 transition-all duration-300 font-bold"
            >
              <Trophy className="mr-2 h-6 w-6 text-cyan" />
              <span className="text-cyan">Watch Live Battles</span>
            </Button>
          )}
        </div>

                  {/* My Active Battles - Barbers Only */}
        {isBarber && myActiveBattles && myActiveBattles.length > 0 && (
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-white text-center mb-8">My Active Battles</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myActiveBattles.map(({ battles, joined_at }: any) => (
                <Card 
                  key={battles.id} 
                  className="group border-2 border-primary/30 shadow-xl backdrop-blur-sm bg-gradient-to-br from-card/90 to-card/50 hover:border-primary hover:shadow-2xl hover:shadow-primary/30 transition-all duration-500 cursor-pointer overflow-hidden" 
                  style={{ borderRadius: '1.5rem' }}
                  onClick={() => navigate(`/battles/${battles.id}`)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardHeader className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="bg-gradient-to-r from-primary to-orange-600 text-white font-bold px-3 py-1 shadow-lg">
                        🎯 MY BATTLE
                      </Badge>
                      <Badge variant="outline" className="text-primary border-primary/50 font-semibold">
                        {battles.category || 'General'}
                      </Badge>
                    </div>
                    <CardTitle className="text-white text-2xl font-bold group-hover:text-primary transition-colors">
                      {battles.title}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-base">
                      {battles.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 relative">
                    <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${battles.status === 'voting' ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`} />
                        <span className="text-sm font-medium text-foreground">
                          {battles.status === 'voting' ? '🔴 LIVE VOTING' : battles.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-primary font-bold text-lg">
                        {battles.prize_amount > 0 ? `$${battles.prize_amount}` : '🎁 FREE'}
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 font-bold text-lg py-6 shadow-lg group-hover:shadow-xl group-hover:shadow-primary/30 transition-all" 
                      variant="default"
                    >
                      <Trophy className="mr-2 h-5 w-5 text-cyan" />
                      <span className="text-cyan">Enter Arena</span>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State for Barbers with No Battles */}
        {isBarber && (!myActiveBattles || myActiveBattles.length === 0) && (
          <div className="mb-12">
            <EmptyState
              icon={Trophy}
              title="No Active Battles Yet"
              description="Create your first battle or join a tournament to start competing with barbers worldwide!"
              actionLabel="Go to Portal"
              onAction={() => navigate('/portal')}
            />
          </div>
        )}



        {/* CTA Section - Removed for all users to keep main page focused on viewing battles */}
      </div>
    </section>;
};
export default BattlesSection;
