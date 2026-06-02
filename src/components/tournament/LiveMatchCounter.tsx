import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export const LiveMatchCounter = () => {
  const { data: liveCount = 0 } = useQuery({
    queryKey: ["live-battles-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("battles")
        .select("*", { count: "exact", head: true })
        .eq("status", "voting");
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (liveCount === 0) return null;

  return (
    <Link to="/live">
      <Badge variant="destructive" className="animate-pulse">
        🔴 LIVE: {liveCount} battle{liveCount !== 1 ? "s" : ""} streaming now
      </Badge>
    </Link>
  );
};
