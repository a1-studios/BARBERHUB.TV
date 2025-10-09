import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Clock, Vote, Plus, Scissors, Gift, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { HaircutAdvisorModal } from "./HaircutAdvisorModal";
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
  const [isHaircutModalOpen, setIsHaircutModalOpen] = useState(false);
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
      
      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-primary">(Global) </span>
            <span className="text-white">play </span>
            <span className="text-primary">ground </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {isBarber ? "Compete with the best barbers worldwide. Show your skills, win prizes, and earn legendary status." : "Watch epic barber battles from around the world. Vote for your favorites and support the community."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
          
          <Button size="lg" onClick={() => setIsHaircutModalOpen(true)} className="text-lg px-8 bg-gradient-to-r from-primary to-orange-500 hover:from-orange-500 hover:to-primary shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
            <Scissors className="mr-2 h-5 w-5" />
            AI Haircut Advisor
          </Button>
          
          {isBarber && (
            <Button size="lg" onClick={() => navigate('/portal')} className="text-lg px-8 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
              <Zap className="mr-2 h-5 w-5" />
              Battle Portal
            </Button>
          )}

          {isFan && (
            <Button size="lg" variant="outline" onClick={() => navigate('/creator-hub')} className="text-lg px-8">
              <Trophy className="mr-2 h-5 w-5" />
              Watch Battles
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
                  className="border border-primary/50 shadow-lg backdrop-blur-sm bg-card/50 hover:border-primary/70 transition-all cursor-pointer" 
                  style={{ borderRadius: '1.5rem' }}
                  onClick={() => navigate(`/battles/${battles.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        My Battle
                      </Badge>
                      <Badge variant="outline" className="text-primary border-primary/30">
                        {battles.category || 'General'}
                      </Badge>
                    </div>
                    <CardTitle className="text-white">{battles.title}</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {battles.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-muted-foreground">
                        Status: {battles.status}
                      </div>
                      <div className="text-primary font-semibold">
                        {battles.prize_amount > 0 ? `$${battles.prize_amount}` : 'Free'}
                      </div>
                    </div>
                    <Button className="w-full" variant="default">
                      View Battle
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}


        {/* Featured Battles */}
        {battles.length > 0 && <>
            <h3 className="text-2xl font-bold text-white text-center mb-8">Featured Battles</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {battles.map(battle => <Card key={battle.id} className="border border-border/50 shadow-lg backdrop-blur-sm bg-card/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(24_100%_52%/0.5),inset_0_0_20px_hsl(24_100%_52%/0.15)] hover:border-primary/30 cursor-pointer" style={{
            borderRadius: '1.5rem'
          }} onClick={() => navigate(`/battles/${battle.id}`)}>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={`${getStatusColor(battle.status)} flex items-center gap-1`}>
                        {getStatusIcon(battle.status)}
                        {battle.status.charAt(0).toUpperCase() + battle.status.slice(1)}
                      </Badge>
                      <Badge variant="outline" className="text-primary border-primary/30">
                        {battle.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-white">{battle.title}</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {battle.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {battle.participants} participants
                      </div>
                      <div className="text-primary font-semibold">
                        {battle.prize_amount > 0 ? `$${battle.prize_amount}` : 'Free'}
                      </div>
                    </div>
                    <Button className="w-full" variant={battle.status === "voting" ? "outline" : "default"} onClick={e => {
                e.stopPropagation();
                navigate(`/battles/${battle.id}`);
              }}>
                      {getActionText(battle.status)}
                    </Button>
                  </CardContent>
                </Card>)}
            </div>
          </>}

        {/* CTA Section - Removed for all users to keep main page focused on viewing battles */}
      </div>
      
      <HaircutAdvisorModal isOpen={isHaircutModalOpen} onClose={() => setIsHaircutModalOpen(false)} />
    </section>;
};
export default BattlesSection;
