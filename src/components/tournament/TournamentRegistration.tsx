import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Loader2, Coins, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBarberBucks } from "@/hooks/useBarberBucks";
import { TOURNAMENT_CATEGORIES } from "@/config/categories";
import { TOURNAMENT_CONFIG, formatEntryFee, formatEntryFeeUSD } from "@/config/tournament";
import { AddFundsModal } from "@/components/AddFundsModal";
import { UniversalBarterGateway } from "@/components/barter/UniversalBarterGateway";

export const TournamentRegistration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { barberBucks, isLoading: bbLoading } = useBarberBucks();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showBarter, setShowBarter] = useState(false);

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

  const hasEnoughBB = barberBucks >= TOURNAMENT_CONFIG.ENTRY_FEE_BB;

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !barberProfile?.id || !selectedCategory) {
        throw new Error("Missing required data");
      }

      if (!barberProfile.country_code) {
        throw new Error("Please update your profile with your country before joining the tournament");
      }

      if (!hasEnoughBB) {
        throw new Error(`Insufficient Barber Bucks. You need ${TOURNAMENT_CONFIG.ENTRY_FEE_BB} BB but have ${barberBucks} BB.`);
      }

      // Check if already in queue for this category
      if (isAlreadyInQueue(selectedCategory)) {
        throw new Error(`You're already in the queue for ${selectedCategory}`);
      }

      // Call the BB-based registration function
      const { data, error } = await supabase.functions.invoke("register-tournament-bb", {
        body: {
          category: selectedCategory,
          barber_profile_id: barberProfile.id,
          country_code: barberProfile.country_code,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tournament-queue-entries"] });
      queryClient.invalidateQueries({ queryKey: ["barber_bucks"] });
      setIsDialogOpen(false);
      setSelectedCategory("");
      toast({
        title: "🏆 Tournament Joined!",
        description: `You've joined the ${selectedCategory} queue. ${data.entry_fee_bb} BB deducted.`,
      });
    },
    onError: (error: Error) => {
      if (error.message.includes("Insufficient")) {
        setShowAddFunds(true);
      }
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (queueLoading || bbLoading) {
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
    <>
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
            {/* BB Balance & Entry Fee */}
            <Alert className="bg-primary/10 border-primary/50">
              <Coins className="h-4 w-4" />
              <AlertDescription>
                <div className="flex justify-between items-center">
                  <span>Entry Fee:</span>
                  <span className="font-bold">{formatEntryFee()} <span className="text-xs text-muted-foreground">({formatEntryFeeUSD()})</span></span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span>Your Balance:</span>
                  <span className={`font-bold ${hasEnoughBB ? 'text-green-500' : 'text-red-500'}`}>
                    {barberBucks} BB
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Battle Duration: <strong>{TOURNAMENT_CONFIG.BATTLE_DURATION_MINUTES} minutes</strong>
                  <br />
                  Next Battle Sunday: <strong>10:00 AM ET</strong>
                </div>
              </AlertDescription>
            </Alert>

            {/* Insufficient funds warning */}
            {!hasEnoughBB && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex justify-between items-center">
                  <span>Need {TOURNAMENT_CONFIG.ENTRY_FEE_BB - barberBucks} more BB</span>
                  <Button size="sm" variant="outline" onClick={() => setShowAddFunds(true)}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Funds
                  </Button>
                </AlertDescription>
              </Alert>
            )}

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
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>BB Economy:</strong> Entry fee is paid with Barber Bucks. When matched, your battle will be scheduled for the next Battle Sunday at 10 AM ET.
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending || !selectedCategory || !hasEnoughBB}
              className="w-full"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Coins className="mr-2 h-4 w-4" />
                  Pay {formatEntryFee()} & Join Queue
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddFundsModal isOpen={showAddFunds} onClose={() => setShowAddFunds(false)} />
    </>
  );
};
