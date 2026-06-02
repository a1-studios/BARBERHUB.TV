import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StandingsTable } from "@/components/tournament/StandingsTable";
import { TournamentBracket } from "@/components/tournament/TournamentBracket";
import { PrizePoolCard } from "@/components/tournament/PrizePoolCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Trophy, Users, DollarSign, MapPin } from "lucide-react";
import { format } from "date-fns";
import { Helmet } from "react-helmet";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function TournamentDetails() {
  const { tournamentId } = useParams<{ tournamentId: string }>();

  const { data: tournament, isLoading: tournamentLoading } = useQuery({
    queryKey: ["tournament", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tournamentId,
  });

  const { data: phases, isLoading: phasesLoading } = useQuery({
    queryKey: ["tournament-phases", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_phases")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("phase_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!tournamentId,
  });

  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ["tournament-matches", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("battles")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tournamentId,
  });

  const currentPhase = phases?.find((p) => p.status === "active") || phases?.[0];

  if (tournamentLoading || phasesLoading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
        <Footer />
      </>
    );
  }

  if (!tournament) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-12 text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Tournament Not Found</h2>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{tournament.name} | BARBER-HUB Tournament</title>
        <meta
          name="description"
          content={`${tournament.name} — elite barber tournament on BARBER-HUB${
            tournament.start_date ? `, starting ${format(new Date(tournament.start_date), 'PPP')}` : ''
          }. View brackets, standings, and prize pool.`}
        />
        <link rel="canonical" href={`https://barberhub.tv/tournaments/${tournamentId}`} />
        <meta property="og:title" content={`${tournament.name} | BARBER-HUB Tournament`} />
        <meta
          property="og:description"
          content={`${tournament.name} — elite barber tournament on BARBER-HUB. View brackets, standings, and prize pool.`}
        />
        <meta property="og:url" content={`https://barberhub.tv/tournaments/${tournamentId}`} />
        <meta property="og:type" content="event" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: tournament.name,
          startDate: tournament.start_date ?? undefined,
          endDate: (tournament as any).end_date ?? undefined,
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
          description:
            (tournament as any).description ??
            `${tournament.name} — elite barber tournament on BARBER-HUB.`,
          url: `https://barberhub.tv/tournaments/${tournamentId}`,
          organizer: {
            '@type': 'Organization',
            name: 'BARBER-HUB',
            url: 'https://barberhub.tv/',
          },
        })}</script>
      </Helmet>
      
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
          {/* Hero */}
          <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-xl p-8">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-6 w-6 text-primary" />
              <Badge>{tournament.status}</Badge>
            </div>
            <h1 className="text-4xl font-bold mb-2">{tournament.name}</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-background/50 rounded-lg p-3">
                <Calendar className="h-5 w-5 mb-2" />
                <p className="text-sm">{format(new Date(tournament.start_date), "MMM d")}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <Users className="h-5 w-5 mb-2" />
                <p className="text-sm">{tournament.min_participants || "Open"}</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="standings">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="standings">Standings</TabsTrigger>
              <TabsTrigger value="bracket">Bracket</TabsTrigger>
              <TabsTrigger value="matches">Matches</TabsTrigger>
            </TabsList>

            <TabsContent value="standings">
              <Card>
                <CardHeader><CardTitle>Standings</CardTitle></CardHeader>
                <CardContent>
                  <StandingsTable tournamentId={tournamentId!} phaseId={currentPhase?.id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bracket">
              <Card>
                <CardHeader><CardTitle>Bracket</CardTitle></CardHeader>
                <CardContent>
                  <TournamentBracket tournamentId={tournamentId!} phaseId={currentPhase?.id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="matches">
              <Card>
                <CardHeader><CardTitle>Matches</CardTitle></CardHeader>
                <CardContent>
                  {matches?.length ? (
                    <div className="space-y-4">
                      {matches.map((m: any) => (
                        <div key={m.id} className="border p-4 rounded-lg">
                          <p className="font-semibold">{m.title}</p>
                          <Badge>{m.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">No matches yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </>
  );
}
