import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Calendar, Users, DollarSign, Clock, MapPin, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Helmet } from "react-helmet";

export default function Tournaments() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("active");

  const { data: tournaments, isLoading } = useQuery({
    queryKey: ["tournaments", activeTab],
    queryFn: async () => {
      let query = supabase
        .from("tournaments")
        .select(`
          *,
          tournament_phases(count)
        `)
        .order("start_date", { ascending: false });

      if (activeTab === "active") {
        query = query.in("status", ["registration", "qualification", "elimination"]);
      } else if (activeTab === "upcoming") {
        query = query.eq("status", "registration");
      } else if (activeTab === "completed") {
        query = query.eq("status", "completed");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const statusColors = {
    registration: "bg-blue-500",
    qualification: "bg-yellow-500",
    elimination: "bg-orange-500",
    completed: "bg-green-500",
    cancelled: "bg-red-500"
  };

  return (
    <>
      <Helmet>
        <title>Barber Tournaments | Global Barber Battle Championships</title>
        <meta name="description" content="Join elite barber tournaments and compete for cash prizes. Watch live battles, vote for champions, and follow the world's best barbers in action." />
        <meta property="og:title" content="Global Barber Tournaments | Barber Boost Blaze" />
        <meta property="og:description" content="Elite barber tournaments with live battles, global rankings, and prize pools. Join the competition today!" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <Header />
        
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Hero Section */}
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Elite Competitions</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Global Tournaments
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Compete in elite barber tournaments, showcase your skills, and win cash prizes
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-8">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-32 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : tournaments && tournaments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tournaments.map((tournament: any) => (
                    <Card 
                      key={tournament.id} 
                      className="hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => navigate(`/tournaments/${tournament.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <Badge className={statusColors[tournament.status as keyof typeof statusColors]}>
                            {tournament.status}
                          </Badge>
                          <Trophy className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                        </div>
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {tournament.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {tournament.description || "Elite barber competition"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {format(new Date(tournament.start_date), "MMM d, yyyy")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {tournament.max_participants || "Unlimited"}
                            </span>
                          </div>
                          {tournament.prize_pool && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-primary">
                                ${(tournament.prize_pool / 100).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {tournament.region && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {tournament.region}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Progress Indicator */}
                        {tournament.status === "qualification" && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Qualification Phase</span>
                              <TrendingUp className="h-3 w-3 text-primary" />
                            </div>
                          </div>
                        )}

                        <Button className="w-full" variant="outline">
                          View Tournament
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Tournaments Found</h3>
                  <p className="text-muted-foreground mb-6">
                    {activeTab === "active" 
                      ? "There are no active tournaments at the moment. Check back soon!"
                      : activeTab === "upcoming"
                      ? "No upcoming tournaments scheduled yet."
                      : "No completed tournaments to display."}
                  </p>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader>
                <Trophy className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Compete</CardTitle>
                <CardDescription>
                  Enter tournaments and battle the best barbers worldwide
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardHeader>
                <DollarSign className="h-8 w-8 text-blue-500 mb-2" />
                <CardTitle>Win Prizes</CardTitle>
                <CardDescription>
                  Compete for cash prizes and exclusive rewards
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-purple-500 mb-2" />
                <CardTitle>Rise Up</CardTitle>
                <CardDescription>
                  Climb the global rankings and earn recognition
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}