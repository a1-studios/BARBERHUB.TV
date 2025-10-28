import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Loader2, Youtube, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { extractYouTubeVideoId } from "@/utils/youtubeHelpers";

export const TournamentRegistration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState('');
  const [videoIdError, setVideoIdError] = useState('');

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

  const validateYouTubeInput = (input: string) => {
    if (!input) {
      setVideoIdError('YouTube Video ID is required');
      return false;
    }

    const videoId = extractYouTubeVideoId(input);
    if (!videoId) {
      setVideoIdError('Please enter a valid YouTube URL or Video ID');
      return false;
    }
    
    setVideoIdError('');
    return true;
  };

  const handleYoutubeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setYoutubeVideoId(input);
    if (input) {
      validateYouTubeInput(input);
    } else {
      setVideoIdError('');
    }
  };

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!activeTournament?.id || !user?.id) throw new Error("Missing data");

      // Validate YouTube input
      if (!validateYouTubeInput(youtubeVideoId)) {
        throw new Error("Valid YouTube Video ID is required");
      }

      const videoId = extractYouTubeVideoId(youtubeVideoId);
      if (!videoId) {
        throw new Error("Invalid YouTube Video ID");
      }

      // Create a dummy battle for tournament registration
      const { data: battle, error: battleError } = await supabase
        .from("battles")
        .insert({
          tournament_id: activeTournament.id,
          title: `Tournament Registration - ${user.id}`,
          organizer_id: user.id,
          status: "upcoming",
          is_tournament_match: true,
          barber1_youtube_video_id: videoId,
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
      setIsDialogOpen(false);
      setYoutubeVideoId('');
      setVideoIdError('');
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

  const isValidVideoId = youtubeVideoId && !videoIdError && extractYouTubeVideoId(youtubeVideoId) !== null;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Trophy className="h-4 w-4 mr-2" />
          Register for {activeTournament.name}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Tournament Registration
          </DialogTitle>
          <DialogDescription>
            Register for {activeTournament.name} with your YouTube channel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <Alert>
            <Youtube className="h-4 w-4" />
            <AlertDescription className="text-sm">
              You'll need to provide a YouTube Video ID for your tournament battles. 
              This will be used for your live stream submissions during the tournament.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="youtube-video-id" className="flex items-center gap-2">
              YouTube Video ID <span className="text-destructive">*</span>
              {isValidVideoId && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </Label>
            <Input
              id="youtube-video-id"
              type="text"
              placeholder="https://youtube.com/watch?v=... or dQw4w9WgXcQ"
              value={youtubeVideoId}
              onChange={handleYoutubeInputChange}
              disabled={registerMutation.isPending}
              className={videoIdError ? 'border-destructive' : isValidVideoId ? 'border-green-500' : ''}
            />
            <p className="text-xs text-muted-foreground">
              Paste your YouTube Live Stream URL or just the video ID
            </p>
            {videoIdError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {videoIdError}
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={registerMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending || !isValidVideoId}
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Registering...
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4 mr-2" />
                  Complete Registration
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
