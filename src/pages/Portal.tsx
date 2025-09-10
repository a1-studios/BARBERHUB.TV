import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Trophy, Users, Clock, Vote, Plus, DollarSign, Play, Calendar, Target } from "lucide-react";

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreatingBattle, setIsCreatingBattle] = useState(false);

  // Fetch user profile to determine role
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type, display_name')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch upcoming battles
  const { data: upcomingBattles, refetch: refetchBattles } = useQuery({
    queryKey: ['portal-battles', 'upcoming'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .in('status', ['upcoming', 'active'])
        .order('starts_at', { ascending: true })
        .limit(6);
      
      if (error) throw error;
      return data as Battle[];
    },
    enabled: !!user
  });

  // Fetch live battles (active with current time between starts_at and ends_at)
  const { data: liveBattles } = useQuery({
    queryKey: ['portal-battles', 'live'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .eq('status', 'active')
        .lte('starts_at', now)
        .gte('ends_at', now)
        .order('starts_at', { ascending: true });
      
      if (error) throw error;
      return data as Battle[];
    },
    enabled: !!user
  });

  const handleCreateBattle = () => {
    navigate('/battles/create');
  };

  const handleEnterTournament = async () => {
    if (!user) return;
    
    setIsCreatingBattle(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-battle-entry', {
        body: { 
          amount: 5000, // $50.00 in cents
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
        variant: "destructive",
      });
    } finally {
      setIsCreatingBattle(false);
    }
  };

  const isBarber = profile?.user_type === 'barber';
  const isFan = profile?.user_type === 'fan' || !profile?.user_type;

  if (!user) {
    return (
      <div className="min-h-screen">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20 sm:pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Portal Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Barber Battle Portal
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Year-round single-elimination tournament
            </p>
            <p className="text-lg text-muted-foreground">
              Live battles every Sunday, 10:00 AM - 6:00 PM
            </p>
          </div>

          {/* Role-based Action Section */}
          <div className="mb-12">
            <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  {isBarber ? 'Barber Dashboard' : 'Fan Hub'}
                </CardTitle>
                <CardDescription className="text-center text-lg">
                  {isBarber 
                    ? 'Manage your battles and tournament participation' 
                    : 'Watch live battles, vote, and support your favorite barbers'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 justify-center">
                  {isBarber && (
                    <>
                      <Button 
                        size="lg" 
                        onClick={handleCreateBattle}
                        className="text-lg px-8"
                      >
                        <Plus className="mr-2 h-5 w-5" />
                        Create a Battle
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline"
                        onClick={handleEnterTournament}
                        disabled={isCreatingBattle}
                        className="text-lg px-8"
                      >
                        <DollarSign className="mr-2 h-5 w-5" />
                        Enter Tournament ($50)
                      </Button>
                    </>
                  )}
                  {isFan && (
                    <>
                      <Button 
                        size="lg" 
                        onClick={() => liveBattles && liveBattles.length > 0 ? 
                          navigate(`/battles/${liveBattles[0].id}`) : 
                          toast({ title: "No live battles", description: "Check back on Sunday!" })
                        }
                        className="text-lg px-8"
                      >
                        <Play className="mr-2 h-5 w-5" />
                        Watch Live
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline"
                        onClick={() => navigate('/battles')}
                        className="text-lg px-8"
                      >
                        <Vote className="mr-2 h-5 w-5" />
                        Vote
                      </Button>
                      <Button 
                        size="lg" 
                        variant="secondary"
                        onClick={() => toast({ title: "Coming Soon", description: "Donation feature will be available soon!" })}
                        className="text-lg px-8"
                      >
                        <DollarSign className="mr-2 h-5 w-5" />
                        Donate
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Battles Section */}
          {liveBattles && liveBattles.length > 0 && (
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-6 text-center">
                🔴 Live Now
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {liveBattles.map((battle) => (
                  <Card key={battle.id} className="border-red-500 border-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant="destructive" className="animate-pulse">
                          LIVE
                        </Badge>
                        <Badge variant="outline">{battle.category}</Badge>
                      </div>
                      <CardTitle>{battle.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Trophy className="mr-2 h-4 w-4" />
                          Prize: {battle.currency} ${battle.prize_amount}
                        </div>
                        <Button 
                          className="w-full" 
                          onClick={() => navigate(`/battles/${battle.id}`)}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Watch Battle
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Sunday Schedule */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-6 text-center">
              This Sunday's Schedule
            </h2>
            {upcomingBattles && upcomingBattles.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcomingBattles.map((battle) => (
                  <Card key={battle.id}>
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
                          {battle.starts_at ? 
                            new Date(battle.starts_at).toLocaleString() : 
                            'Time TBD'
                          }
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Trophy className="mr-2 h-4 w-4" />
                          Prize: {battle.currency} ${battle.prize_amount}
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          onClick={() => navigate(`/battles/${battle.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No battles scheduled</h3>
                  <p className="text-muted-foreground">
                    Check back later for this Sunday's battle lineup!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tournament Bracket Placeholder */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-6 text-center">
              Tournament Bracket
            </h2>
            <Card>
              <CardContent className="text-center py-12">
                <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
                <p className="text-muted-foreground">
                  Interactive tournament bracket will be displayed here
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Portal Stats */}
          <div className="grid gap-6 md:grid-cols-3 mb-12">
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
    </div>
  );
};

export default Portal;