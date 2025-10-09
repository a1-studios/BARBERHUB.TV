import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StandingsTable } from "@/components/tournament/StandingsTable";
import { TournamentBracket } from "@/components/tournament/TournamentBracket";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Trophy, Users, ExternalLink } from "lucide-react";
import { format } from "date-fns";

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
        .select(`
          *,
          barber1:barber_profiles!battles_barber1_id_fkey(name, country_code),
          barber2:barber_profiles!battles_barber2_id_fkey(name, country_code)
        `)
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
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold">Tournament not found</h1>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      registration: "secondary",
      qualification: "default",
      elimination: "default",
      completed: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Tournament Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl flex items-center gap-3">
                <Trophy className="h-8 w-8" />
                {tournament.name}
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                Season {tournament.season}
              </CardDescription>
            </div>
            {getStatusBadge(tournament.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{format(new Date(tournament.start_date), "PPP")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Participants</p>
                <p className="font-medium">{tournament.total_registered} / {tournament.min_participants}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Current Phase</p>
                <p className="font-medium">{currentPhase?.phase_name || "Not started"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="standings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="standings">Standings</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Standings</CardTitle>
              <CardDescription>
                {currentPhase?.phase_name || "Overall"} standings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StandingsTable 
                tournamentId={tournamentId!} 
                phaseId={currentPhase?.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Match Schedule</CardTitle>
              <CardDescription>All tournament matches</CardDescription>
            </CardHeader>
            <CardContent>
              {matchesLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : matches && matches.length > 0 ? (
                <div className="space-y-3">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {match.barber1?.name || "TBD"} vs {match.barber2?.name || "TBD"}
                        </p>
                        <p className="text-sm text-muted-foreground">{match.title}</p>
                        {match.starts_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(match.starts_at), "PPP p")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {match.youtube_stream_url && (
                          <a
                            href={match.youtube_stream_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <Badge variant={match.status === "completed" ? "outline" : "default"}>
                          {match.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No matches scheduled yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bracket" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Elimination Bracket</CardTitle>
              <CardDescription>Tournament bracket view</CardDescription>
            </CardHeader>
            <CardContent>
              <TournamentBracket tournamentId={tournamentId!} phaseId={currentPhase?.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
