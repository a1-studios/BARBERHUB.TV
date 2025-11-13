import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, Loader2, Users, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TOURNAMENT_CONFIG, getNextBattleSunday } from "@/config/tournament";
import { getCategoryById } from "@/config/categories";

interface QueueEntry {
  id: string;
  category: string;
  status: string;
  queue_timestamp: string;
  matched_battle_id: string | null;
  country_code: string;
}

export const TournamentQueueStatus = () => {
  const { user } = useAuth();

  const { data: queueEntries, isLoading } = useQuery({
    queryKey: ["tournament-queue", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("tournament_queue")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["waiting", "matched"])
        .order("queue_timestamp", { ascending: false });
      
      if (error) throw error;
      return data as QueueEntry[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="card-gradient">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!queueEntries || queueEntries.length === 0) {
    return null;
  }

  const nextBattleSunday = getNextBattleSunday();

  return (
    <Card className="card-gradient border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Users className="h-5 w-5" />
          Tournament Queue Status
        </CardTitle>
        <CardDescription>
          Your active tournament registrations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {queueEntries.map((entry) => {
          const category = getCategoryById(entry.category);
          const isMatched = entry.status === "matched";
          
          return (
            <div
              key={entry.id}
              className="p-4 rounded-lg bg-background/50 border border-border/50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{category?.icon}</span>
                  <div>
                    <div className="font-semibold">{category?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {entry.country_code}
                    </div>
                  </div>
                </div>
                
                {isMatched ? (
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/50">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Matched
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">
                    <Clock className="h-3 w-3 mr-1" />
                    Waiting
                  </Badge>
                )}
              </div>

              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Joined {formatDistanceToNow(new Date(entry.queue_timestamp), { addSuffix: true })}
                </div>
                
                {isMatched && entry.matched_battle_id && (
                  <div className="flex items-center gap-2 text-green-500">
                    <Calendar className="h-4 w-4" />
                    Battle scheduled for {nextBattleSunday.toLocaleDateString()} at{" "}
                    {nextBattleSunday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ET
                  </div>
                )}
                
                {!isMatched && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Waiting for opponent (max {TOURNAMENT_CONFIG.QUEUE_EXPIRY_HOURS / 24} days)
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
