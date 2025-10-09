import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface StandingsTableProps {
  tournamentId: string;
  phaseId?: string;
}

export const StandingsTable = ({ tournamentId, phaseId }: StandingsTableProps) => {
  const { data: standings, isLoading } = useQuery({
    queryKey: ["tournament-standings", tournamentId, phaseId],
    queryFn: async () => {
      let query = supabase
        .from("tournament_standings")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("rank", { ascending: true });

      if (phaseId) {
        query = query.eq("phase_id", phaseId);
      }

      const { data: standingsData, error } = await query;
      if (error) throw error;

      // Fetch barber profiles separately
      const barberIds = standingsData?.map(s => s.barber_id) || [];
      const { data: barbers } = await supabase
        .from("barber_profiles")
        .select("id, name, country_code, user_id")
        .in("id", barberIds);

      // Combine the data
      return standingsData?.map(standing => ({
        ...standing,
        barber: barbers?.find(b => b.id === standing.barber_id)
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!standings || standings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No standings data available yet
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Barber</TableHead>
            <TableHead className="w-20">Country</TableHead>
            <TableHead className="w-20 text-center">Played</TableHead>
            <TableHead className="w-24 text-center">W-D-L</TableHead>
            <TableHead className="w-20 text-center">Points</TableHead>
            <TableHead className="w-24 text-center">Votes For</TableHead>
            <TableHead className="w-24 text-center">Votes Against</TableHead>
            <TableHead className="w-20 text-center">GD</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((standing) => {
            const voteDifference = standing.votes_for - standing.votes_against;
            const barberName = standing.barber?.name || "Unknown";
            
            return (
              <TableRow key={standing.id}>
                <TableCell className="font-bold">
                  {standing.rank}
                  {standing.rank <= 16 && standing.qualified && (
                    <Badge variant="default" className="ml-2 text-xs">Q</Badge>
                  )}
                </TableCell>
                <TableCell className="font-medium">{barberName}</TableCell>
                <TableCell>
                  {standing.barber?.country_code && (
                    <span className="text-2xl">{standing.barber.country_code}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">{standing.matches_played}</TableCell>
                <TableCell className="text-center">
                  <span className="text-green-600">{standing.wins}</span>-
                  <span className="text-yellow-600">{standing.draws}</span>-
                  <span className="text-red-600">{standing.losses}</span>
                </TableCell>
                <TableCell className="text-center font-bold">{standing.points}</TableCell>
                <TableCell className="text-center">{standing.votes_for}</TableCell>
                <TableCell className="text-center">{standing.votes_against}</TableCell>
                <TableCell className={`text-center font-medium ${
                  voteDifference > 0 ? "text-green-600" : voteDifference < 0 ? "text-red-600" : ""
                }`}>
                  {voteDifference > 0 ? "+" : ""}{voteDifference}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
