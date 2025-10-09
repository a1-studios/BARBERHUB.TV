import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";

interface TournamentBracketProps {
  tournamentId: string;
  phaseId?: string;
}

export const TournamentBracket = ({ tournamentId, phaseId }: TournamentBracketProps) => {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["bracket-matches", tournamentId, phaseId],
    queryFn: async () => {
      let query = supabase
        .from("bracket_matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("round_number", { ascending: true })
        .order("match_number", { ascending: true });

      if (phaseId) {
        query = query.eq("phase_id", phaseId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch barber details
      const barberIds = data?.flatMap(m => [m.barber1_id, m.barber2_id].filter(Boolean)) || [];
      const { data: barbers } = await supabase
        .from("barber_profiles")
        .select("id, name, country_code")
        .in("id", barberIds);

      return data?.map(match => ({
        ...match,
        barber1: barbers?.find(b => b.id === match.barber1_id),
        barber2: barbers?.find(b => b.id === match.barber2_id),
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Bracket will be generated after qualification phase
        </p>
      </div>
    );
  }

  // Group matches by round
  const rounds = matches.reduce((acc, match) => {
    const round = match.round_name;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {} as Record<string, typeof matches>);

  return (
    <div className="space-y-8">
      {Object.entries(rounds).map(([roundName, roundMatches]) => (
        <div key={roundName}>
          <h3 className="text-xl font-bold mb-4">{roundName}</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roundMatches.map((match) => (
              <Card key={match.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Match {match.match_number}</span>
                    <Badge variant={
                      match.status === "completed" ? "outline" : 
                      match.status === "active" ? "destructive" : "secondary"
                    }>
                      {match.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">#{match.seed1}</span>
                      <span className="font-medium">
                        {match.barber1?.name || "TBD"}
                      </span>
                      {match.barber1?.country_code && (
                        <span className="text-sm">{match.barber1.country_code}</span>
                      )}
                    </div>
                    {match.winner_id === match.barber1_id && (
                      <Badge variant="default">W</Badge>
                    )}
                  </div>

                  <div className="text-center text-xs text-muted-foreground">vs</div>

                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">#{match.seed2}</span>
                      <span className="font-medium">
                        {match.barber2?.name || "TBD"}
                      </span>
                      {match.barber2?.country_code && (
                        <span className="text-sm">{match.barber2.country_code}</span>
                      )}
                    </div>
                    {match.winner_id === match.barber2_id && (
                      <Badge variant="default">W</Badge>
                    )}
                  </div>

                  {match.youtube_stream_url && (
                    <a
                      href={match.youtube_stream_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Watch Stream
                    </a>
                  )}

                  {match.scheduled_at && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(match.scheduled_at).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
