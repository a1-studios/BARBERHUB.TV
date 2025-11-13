import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Loader2, DollarSign, CheckCircle2, AlertCircle, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TOURNAMENT_CATEGORIES } from "@/config/categories";
import { TOURNAMENT_CONFIG, formatEntryFee } from "@/config/tournament";

export const TournamentRegistration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Fetch barber profile for country_code
  const { data: barberProfile } = useQuery({
    queryKey: ["barber-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("barber_profiles")
        .select("id, country_code")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Check existing queue entries
  const { data: queueEntries, isLoading: queueLoading } = useQuery({
    queryKey: ["tournament-queue-entries", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("tournament_queue")
        .select("category, status")
        .eq("user_id", user.id)
        .in("status", ["waiting", "matched"]);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isAlreadyInQueue = (category: string) => {
    return queueEntries?.some(
      (entry) => entry.category === category && entry.status === "waiting"
    );
  };

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !barberProfile?.id || !selectedCategory) {
        throw new Error("Missing required data");
      }

      if (!barberProfile.country_code) {
        throw new Error("Please update your profile with your country before joining the tournament");
      }

      // Check if already in queue for this category
      if (isAlreadyInQueue(selectedCategory)) {
        throw new Error(`You're already in the queue for ${selectedCategory}`);
      }

      // Call the create-battle-entry edge function which handles Stripe payment
      const { data, error } = await supabase.functions.invoke("create-battle-entry", {
        body: {
          amount: TOURNAMENT_CONFIG.ENTRY_FEE_CENTS,
          category: selectedCategory,
          metadata: {
            barber_profile_id: barberProfile.id,
            country_code: barberProfile.country_code,
            user_id: user.id,
          },
        },
      });

      if (error) throw error;

      // Redirect to Stripe checkout
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Failed to create payment session");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (queueLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!barberProfile?.country_code) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please update your barber profile with your country before joining the tournament.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
          <Trophy className="mr-2 h-5 w-5" />
          Join Tournament Queue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Tournament Registration
          </DialogTitle>
          <DialogDescription>
            Join the queue for Battle Sunday tournaments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="bg-primary/10 border-primary/50">
            <DollarSign className="h-4 w-4" />
            <AlertDescription>
              Entry Fee: <strong>{formatEntryFee()}</strong> per category
              <br />
              Battle Duration: <strong>{TOURNAMENT_CONFIG.BATTLE_DURATION_MINUTES} minutes</strong>
              <br />
              Next Battle Sunday: <strong>10:00 AM ET</strong>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="category">
              Select Category <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Choose your category" />
              </SelectTrigger>
              <SelectContent>
                {TOURNAMENT_CATEGORIES.map((category) => {
                  const inQueue = isAlreadyInQueue(category.shortName);
                  return (
                    <SelectItem
                      key={category.id}
                      value={category.shortName}
                      disabled={inQueue}
                    >
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                        {inQueue && (
                          <span className="text-xs text-muted-foreground">(In Queue)</span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              You'll be matched with an opponent from a different country when possible
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              After payment, you'll join the queue. When matched, your battle will be scheduled for the next Battle Sunday at 10 AM ET.
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => registerMutation.mutate()}
            disabled={registerMutation.isPending || !selectedCategory}
            className="w-full"
          >
            {registerMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay {formatEntryFee()} & Join Queue
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
