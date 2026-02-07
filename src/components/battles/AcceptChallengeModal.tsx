import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Swords, Coins, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBarberBucks } from '@/hooks/useBarberBucks';

interface Challenge {
  id: string;
  challenger_username: string;
  title: string;
  stake_amount?: number | null;
  pot_total?: number | null;
}

interface AcceptChallengeModalProps {
  challenge: Challenge;
  isOpen: boolean;
  onClose: () => void;
}

export const AcceptChallengeModal = ({ challenge, isOpen, onClose }: AcceptChallengeModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { barberBucks: balance } = useBarberBucks();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stakeRequired = challenge.stake_amount || 100;
  const hasEnoughBalance = (balance || 0) >= stakeRequired;

  const handleAccept = async () => {
    if (!hasEnoughBalance) {
      toast({
        title: "Insufficient Barber Bucks",
        description: `You need ${stakeRequired} BB but have ${balance || 0} BB`,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('match-challenge-stake', {
        body: {
          challenge_id: challenge.id,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Challenge Accepted! 🎉",
        description: `You matched the ${stakeRequired} BB stake. The battle is on!`
      });

      if (data?.battle_id) {
        setTimeout(() => {
          navigate(`/battles/${data.battle_id}`);
        }, 1000);
      }

      onClose();
    } catch (error: any) {
      console.error('Error accepting challenge:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept challenge",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" />
            Accept Challenge
          </DialogTitle>
          <DialogDescription>
            You're accepting <span className="font-bold text-foreground">{challenge.challenger_username}'s</span> challenge: "{challenge.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-500">
            UNOFFICIAL — No Ranking Impact
          </Badge>

          {/* Stake Info */}
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-yellow-500">
              <Coins className="w-5 h-5" />
              <h4 className="font-semibold">Stake to Match</h4>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Required Stake</span>
              <span className="font-bold text-lg text-foreground">{stakeRequired} BB</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Your Balance</span>
              <span className={`font-bold ${hasEnoughBalance ? 'text-green-500' : 'text-destructive'}`}>
                {balance?.toLocaleString() || 0} BB
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-yellow-500/20 pt-2">
              <span className="text-sm text-muted-foreground">Total Pot</span>
              <span className="font-bold text-yellow-500">{stakeRequired * 2} BB</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Winner takes the pot minus 5% platform fee. Your stake is held in escrow until the battle concludes.
            </p>
          </div>

          {!hasEnoughBalance && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>You need {stakeRequired - (balance || 0)} more BB. Purchase Barber Bucks to accept this challenge.</span>
            </div>
          )}

          <Button
            onClick={handleAccept}
            disabled={isSubmitting || !hasEnoughBalance}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Matching Stake...
              </>
            ) : (
              `Match ${stakeRequired} BB & Accept Challenge`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
