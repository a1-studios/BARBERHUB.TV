import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Clock, Vote, Plus, Scissors, Gift, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HaircutAdvisorModal } from "./HaircutAdvisorModal";
import { useQuery } from "@tanstack/react-query";
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
  const navigate = useNavigate();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHaircutModalOpen, setIsHaircutModalOpen] = useState(false);

  // Fetch user profile
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
    if (user) {
      fetchFeaturedBattles();
    }
  }, [user]);
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
          battle_participants(count)
        `).in('status', ['upcoming', 'active', 'voting']).order('created_at', {
        ascending: false
      }).limit(3);
      if (error) throw error;
      const formattedBattles: Battle[] = (battlesData || []).map(battle => ({
        id: battle.id,
        title: battle.title,
        description: battle.description || '',
        status: battle.status,
        participants: battle.battle_participants?.length || 0,
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
    const isBarber = profile?.user_type === 'barber';
    
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
  return <section id="battles" className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Battles </span>
            <span className="text-primary">Arena</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {profile?.user_type === 'barber' 
              ? "Compete with the best barbers worldwide. Show your skills, win prizes, and earn legendary status."
              : "Watch epic barber battles from around the world. Vote for your favorites and support the community."
            }
          </p>
        </div>

        {/* Hide barber actions for fans - Remove Create Battle, Join Battle, Join Waitlist, Start Your Journey */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
          <Button size="lg" onClick={() => navigate('/battles')} className="text-lg px-8">
            <Trophy className="mr-2 h-5 w-5" />
            View All Battles
          </Button>
          {/* Only show barber-specific buttons to barbers */}
          {user && profile?.user_type === 'barber' && (
            <Button size="lg" variant="outline" onClick={() => navigate('/battles/create')} className="text-lg px-8">
              <Plus className="mr-2 h-5 w-5" />
              Create Battle
            </Button>
          )}
          <Button 
            size="lg" 
            onClick={() => setIsHaircutModalOpen(true)}
            className="text-lg px-8 bg-gradient-to-r from-primary to-orange-500 hover:from-orange-500 hover:to-primary shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <Scissors className="mr-2 h-5 w-5" />
            AI Haircut Advisor
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/grants')}
            className="text-lg px-8"
          >
            <Gift className="mr-2 h-5 w-5" />
            Barber Grants
          </Button>
          <Button
            size="lg"
            onClick={() => navigate('/portal')}
            className="text-lg px-8 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
          >
            <Zap className="mr-2 h-5 w-5" />
            Battle Portal
          </Button>
        </div>

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

        {/* CTA Section - Hide "Start Your Journey" for fans */}
        {user && profile?.user_type === 'barber' && (
          <div className="text-center">
            <Card className="p-8 border border-border/50 shadow-lg backdrop-blur-sm bg-card/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(24_100%_52%/0.5),inset_0_0_20px_hsl(24_100%_52%/0.15)] hover:border-primary/30" style={{
              borderRadius: '1.5rem'
            }}>
              <h3 className="text-2xl font-bold text-white mb-4">Ready to Join the Battle?</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Create your profile, showcase your skills, and compete with barbers from around the world. 
                Every battle is a chance to prove you're among the legends.
              </p>
              <Button size="lg" className="text-lg px-8" onClick={() => navigate('/battles/create')}>
                Start Your Journey
              </Button>
            </Card>
          </div>
        )}
      </div>
      
      <HaircutAdvisorModal 
        isOpen={isHaircutModalOpen} 
        onClose={() => setIsHaircutModalOpen(false)} 
      />
    </section>;
};
export default BattlesSection;