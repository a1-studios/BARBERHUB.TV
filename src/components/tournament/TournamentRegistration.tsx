import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const TournamentRegistration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activeTournament, isLoading: tournamentLoading } = useQuery({
    queryKey: ["active-tournament"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("status", "registration")
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const { data: isRegistered } = useQuery({
    queryKey: ["tournament-registration", activeTournament?.id, user?.id],
    queryFn: async () => {
      if (!activeTournament?.id || !user?.id) return false;
      const { data } = await supabase
        .from("battle_participants")
        .select("id")
        .eq("tournament_id", activeTournament.id)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!activeTournament && !!user,
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!activeTournament?.id || !user?.id) throw new Error("Missing data");

      // Create a dummy battle for tournament registration
      const { data: battle, error: battleError } = await supabase
        .from("battles")
        .insert({
          tournament_id: activeTournament.id,
          title: `Tournament Registration - ${user.id}`,
          organizer_id: user.id,
          status: "upcoming",
          is_tournament_match: true,
        })
        .select()
        .single();

      if (battleError) throw battleError;

      const { error } = await supabase
        .from("battle_participants")
        .insert({
          battle_id: battle.id,
          user_id: user.id,
          tournament_id: activeTournament.id,
          status: "active",
        });

      if (error) throw error;

      // Update tournament participant count
      const { error: updateError } = await supabase
        .from("tournaments")
        .update({ total_registered: (activeTournament.total_registered || 0) + 1 })
        .eq("id", activeTournament.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({
        title: "Registration Successful!",
        description: `You've been registered for ${activeTournament?.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["tournament-registration"] });
      queryClient.invalidateQueries({ queryKey: ["active-tournament"] });
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (tournamentLoading) {
    return (
      <Button disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    );
  }

  if (!activeTournament) {
    return null;
  }

  if (isRegistered) {
    return (
      <Button variant="outline" disabled>
        <Trophy className="h-4 w-4 mr-2" />
        Registered for {activeTournament.name}
      </Button>
    );
  }

  return (
    <Button
      onClick={() => registerMutation.mutate()}
      disabled={registerMutation.isPending}
    >
      {registerMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Trophy className="h-4 w-4 mr-2" />
      )}
      Register for {activeTournament.name}
    </Button>
  );
};
