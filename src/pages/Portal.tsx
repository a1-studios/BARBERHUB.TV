import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfileValidator } from "@/hooks/useProfileValidator";
import { ProfileSetupPrompt } from "@/components/auth/ProfileSetupPrompt";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TournamentRegistration } from "@/components/tournament/TournamentRegistration";
import { TournamentQueueStatus } from "@/components/tournament/TournamentQueueStatus";
import { LiveMatchCounter } from "@/components/tournament/LiveMatchCounter";
import { MyBattlesSection } from "@/components/barber/MyBattlesSection";
import { SubscriptionStatusCard } from "@/components/barber/SubscriptionStatusCard";
import { Trophy, Users, Clock, Vote, DollarSign, Play, Calendar, Target, Scissors, Loader2, BarChart3 } from "lucide-react";
import { OpenChallengeQueue } from "@/components/battles/OpenChallengeQueue";
import DisplayCards from "@/components/ui/display-cards";
import { formatDistanceToNow } from "date-fns";
import { FactionBannerRow } from "@/components/portal/FactionBannerRow";

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
  const { user, loading } = useAuth();
  const { isBarber, isFan, isLoading: rolesLoading } = useUserRole();
  const { hasProfile, needsSetup, isLoading: validationLoading, profileType } = useProfileValidator();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreatingBattle, setIsCreatingBattle] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
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
  if (loading || rolesLoading || validationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

  // Show profile setup if specialized profile doesn't exist
  if (needsSetup && profileType) {
    return <ProfileSetupPrompt type={profileType} />;
  }
  return <div className="min-h-screen">
      <Header />
      <main className="pt-20 sm:pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Portal Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-4 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">2026 Global Championship</h1>
              <LiveMatchCounter />
            </div>
            <p className="text-sm text-muted-foreground">
              Live battles every Sunday, 10:00 AM - 6:00 PM EST
            </p>
          </div>

          {/* Faction Banners - Show for All Users */}
          <div className="mb-10">
            <FactionBannerRow
              onSelectCategory={(categoryId) => {
                setSelectedCategory(categoryId);
                if (isBarber) {
                  toast({
                    title: `${categoryId.replace('_', ' ').toUpperCase()} Selected`,
                    description: "Scroll down to register for this category"
                  });
                }
              }}
              selectedCategory={selectedCategory}
            />
          </div>

          {/* Subscription Status for Barbers */}
          {isBarber && (
            <div className="mb-8">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <SubscriptionStatusCard />
                </div>
                <Link to="/analytics">
                  <Button variant="outline" size="lg" className="h-full">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    <div className="text-left">
                      <div className="font-semibold">Analytics</div>
                      <div className="text-xs text-muted-foreground">View Stats</div>
                    </div>
                  </Button>
                </Link>
              </div>
            </div>
          )}

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
            <div className="mb-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">
                  My Active Battles
                </h2>
              </div>
              
              {/* Tournament Registration & Queue Status */}
              <div className="space-y-4">
                <TournamentRegistration />
                <TournamentQueueStatus />
              </div>
              
              <MyBattlesSection userId={user.id} />
            </div>
          )}

          {/* Open Challenge Queue - Barber Only */}
          {isBarber && <OpenChallengeQueue />}

          {/* Live Battles Section */}
          {liveBattles && liveBattles.length > 0 && <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
                🔴 Live Now
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
...
              </div>
            </div>}

          {/* Sunday Schedule with Stacked Cards */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              This Sunday's Schedule
            </h2>
            {upcomingBattles && upcomingBattles.length > 0 ? (
              <div className="flex justify-center">
                <DisplayCards
                  cards={upcomingBattles.slice(0, 3).map((battle, index) => ({
                    icon: <Scissors className="size-4 text-orange-300" />,
                    title: battle.title,
                    description: `Prize: ${battle.currency} $${battle.prize_amount}`,
                    date: battle.starts_at 
                      ? formatDistanceToNow(new Date(battle.starts_at), { addSuffix: true })
                      : 'Time TBD',
                    iconClassName: "bg-orange-800",
                    titleClassName: "text-orange-500",
                    onClick: () => navigate(`/battles/${battle.id}`),
                    className: index === 0 
                      ? "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0"
                      : index === 1
                      ? "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0"
                      : "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10"
                  }))}
                />
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