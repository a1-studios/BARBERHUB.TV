import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TournamentRegistration } from "@/components/tournament/TournamentRegistration";
import { LiveMatchCounter } from "@/components/tournament/LiveMatchCounter";
import { MyBattlesSection } from "@/components/barber/MyBattlesSection";
import { Trophy, Users, Clock, Vote, DollarSign, Play, Calendar, Target } from "lucide-react";
interface Battle {
  id: string;
  title: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  voting_ends_at: string | null;
  category: string | null;
  prize_amount: number;
  currency: string;
  organizer_id: string;
}
const Portal = () => {
  const { user } = useAuth();
  const { isBarber, isFan } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreatingBattle, setIsCreatingBattle] = useState(false);
  const {
    data: upcomingBattles,
    refetch: refetchBattles
  } = useQuery({
    queryKey: ['portal-battles', 'upcoming'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('battles').select('*').in('status', ['upcoming', 'active']).order('starts_at', {
        ascending: true
      }).limit(6);
      if (error) throw error;
      return data as Battle[];
    },
    enabled: !!user
  });

  // Fetch live battles (active with current time between starts_at and ends_at)
  const {
    data: liveBattles
  } = useQuery({
    queryKey: ['portal-battles', 'live'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const {
        data,
        error
      } = await supabase.from('battles').select('*').eq('status', 'active').lte('starts_at', now).gte('ends_at', now).order('starts_at', {
        ascending: true
      });
      if (error) throw error;
      return data as Battle[];
    },
    enabled: !!user
  });

  const handleEnterTournament = async () => {
    if (!user) return;
    setIsCreatingBattle(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('create-battle-entry', {
        body: {
          amount: 5000,
          // $50.00 in cents
          category: 'general'
        }
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating battle entry:', error);
      toast({
        title: "Error",
        description: "Failed to process tournament entry. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingBattle(false);
    }
  };
  if (!user) {
    return <div className="min-h-screen">
        <Header />
        <main className="pt-20 sm:pt-24 pb-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">Barber Battle Portal</h1>
            <p className="text-xl text-muted-foreground mb-8">Please sign in to access the battle portal</p>
            <Button onClick={() => navigate('/')} size="lg">
              Go to Sign In
            </Button>
          </div>
        </main>
        <Footer />
      </div>;
  }
  return <div className="min-h-screen">
      <Header />
      <main className="pt-20 sm:pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Portal Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-3">
              <h1 className="text-3xl font-bold text-foreground">Barber Battle Portal</h1>
              <LiveMatchCounter />
            </div>
            <p className="text-lg text-muted-foreground mb-1">
              Year-round single-elimination tournament
            </p>
            <p className="text-sm text-muted-foreground">
              Live battles every Sunday, 10:00 AM - 6:00 PM
            </p>
          </div>

          {/* Fan Hub - Show only for fans */}
          {isFan && (
            <div className="mb-8">
              <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-center">Fan Hub</CardTitle>
                  <CardDescription className="text-center">
                    Watch live battles, vote, and support your favorite barbers
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button size="lg" onClick={() => liveBattles && liveBattles.length > 0 ? navigate(`/battles/${liveBattles[0].id}`) : toast({
                      title: "No live battles",
                      description: "Check back on Sunday!"
                    })} className="px-6">
                      <Play className="mr-2 h-4 w-4" />
                      Watch Live
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate('/battles')} className="px-6">
                      <Vote className="mr-2 h-4 w-4" />
                      Vote
                    </Button>
                    <Button size="lg" variant="secondary" onClick={() => toast({
                      title: "Coming Soon",
                      description: "Donation feature will be available soon!"
                    })} className="px-6">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Donate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* My Battles Section - Barber Only */}
          {isBarber && user && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">
                  My Active Battles
                </h2>
                <TournamentRegistration />
              </div>
              <MyBattlesSection userId={user.id} />
            </div>
          )}

          {/* Live Battles Section */}
          {liveBattles && liveBattles.length > 0 && <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
                🔴 Live Now
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
...
              </div>
            </div>}

          {/* Sunday Schedule */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
              This Sunday's Schedule
            </h2>
            {upcomingBattles && upcomingBattles.length > 0 ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingBattles.map(battle => <Card key={battle.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{battle.status}</Badge>
                        <Badge variant="outline">{battle.category}</Badge>
                      </div>
                      <CardTitle>{battle.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="mr-2 h-4 w-4" />
                          {battle.starts_at ? new Date(battle.starts_at).toLocaleString() : 'Time TBD'}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Trophy className="mr-2 h-4 w-4" />
                          Prize: {battle.currency} ${battle.prize_amount}
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => navigate(`/battles/${battle.id}`)}>
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>)}
              </div> : <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No battles scheduled</h3>
                  <p className="text-muted-foreground">
                    Check back later for this Sunday's battle lineup!
                  </p>
                </CardContent>
              </Card>}
          </div>

          {/* Tournament Bracket Placeholder */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
              Tournament Bracket
            </h2>
            <Card>
              <CardContent className="text-center py-8">
                <Target className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-lg font-semibold mb-1">Coming Soon</h3>
                <p className="text-sm text-muted-foreground">
                  Interactive tournament bracket will be displayed here
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Portal Stats */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-primary">
                  {liveBattles?.length || 0}
                </CardTitle>
                <CardDescription>Live Battles</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-primary">
                  {upcomingBattles?.length || 0}
                </CardTitle>
                <CardDescription>Upcoming This Sunday</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-primary">
                  $50
                </CardTitle>
                <CardDescription>Tournament Entry Fee</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>;
};
export default Portal;