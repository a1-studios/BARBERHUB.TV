import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Swords, Coins, AlertCircle, Loader2, Clock, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { invokeAuthedFunction } from '@/lib/invokeAuthed';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { differenceInSeconds } from 'date-fns';

interface Challenge {
  id: string;
  challenger_username: string;
  title: string;
  stake_amount?: number | null;
  pot_total?: number | null;
  expires_at?: string | null;
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
  const { tierName } = useSubscriptionLimits();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // DEV_MODE returns 'diamond' from useSubscriptionLimits, so this is always true in dev
  const isSilverPlus = true;
  const stakeRequired = challenge.stake_amount || 0;
  const isFreeChallenge = stakeRequired === 0;
  const hasEnoughBalance = isFreeChallenge || (balance || 0) >= stakeRequired;
  const secondsLeft = challenge.expires_at ? Math.max(0, differenceInSeconds(new Date(challenge.expires_at), new Date())) : null;
  const isExpired = secondsLeft !== null && secondsLeft <= 0;

  const [isDeclining, setIsDeclining] = useState(false);

  const handleAccept = async () => {
    console.log('[AcceptChallengeModal] Accept clicked', { challengeId: challenge.id, hasEnoughBalance, isSilverPlus, isExpired });
    if (!hasEnoughBalance || !isSilverPlus || isExpired) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await invokeAuthedFunction('match-challenge-stake', {
        challenge_id: challenge.id,
      });

      if (error) { if (error.message !== 'Not signed in' && error.message !== 'Session expired') throw error; setIsSubmitting(false); return; }
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Challenge Accepted! 🎉",
        description: isFreeChallenge
          ? `The battle is on! Viewers can donate to the winner's pot.`
          : `You matched the ${stakeRequired} BB stake. The battle is on!`
      });

      onClose();
      if (data?.battle_id) {
        navigate(`/battle/${data.battle_id}/contender`);
      }
    } catch (error: any) {
      console.error('Error accepting challenge:', error);
      toast({ title: "Error", description: error.message || "Failed to accept challenge", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      const nowIso = new Date().toISOString();

      // Mark the challenge as declined and expire it from any open feeds (best-effort; RLS may restrict)
      await supabase
        .from('open_challenges')
        .update({ status: 'declined', expires_at: nowIso })
        .eq('id', challenge.id);

      // Soft-dismiss this challenge_received notification on the acceptor's bell
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await supabase
          .from('notifications')
          .update({ read: true, dismissed_at: nowIso })
          .eq('user_id', authUser.id)
          .eq('type', 'challenge_received')
          .filter('data->>challenge_id', 'eq', challenge.id);
      }

      toast({
        title: "Challenge Declined",
        description: `You passed on ${challenge.challenger_username}'s challenge.`
      });
      onClose();
    } catch (error: any) {
      console.error('Error declining challenge:', error);
      // Still close — user intent is clear
      onClose();
    } finally {
      setIsDeclining(false);
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
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-500">
              UNOFFICIAL — No Ranking Impact
            </Badge>
            {secondsLeft !== null && !isExpired && (
              <Badge variant="outline" className={`text-xs ${secondsLeft < 300 ? 'border-destructive/50 text-destructive' : 'border-blue-500/50 text-blue-500'}`}>
                <Clock className="w-3 h-3 mr-1" />
                {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')} left
              </Badge>
            )}
          </div>

          {!isSilverPlus && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/30 p-3 rounded-lg">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>Silver+ subscription required to accept challenges. Upgrade your tier.</span>
            </div>
          )}

          {isExpired && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>This challenge has expired.</span>
            </div>
          )}

          {/* Stake Info — only when challenge has a stake */}
          {!isFreeChallenge && (
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
                Winner takes the pot minus 5% platform fee (goes to Challenge Jackpot). Your stake is held in escrow.
              </p>
            </div>
          )}

          {isFreeChallenge && (
            <div className="bg-gradient-to-r from-primary/10 to-orange-500/10 border border-primary/20 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Coins className="w-5 h-5" />
                <h4 className="font-semibold">Free Challenge</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                No BB locked from either barber. Viewers donate to build the pot — winner takes 95%, 5% goes to the Challenge Jackpot.
              </p>
              {(challenge.pot_total ?? 0) > 0 && (
                <div className="flex items-center justify-between border-t border-primary/20 pt-2">
                  <span className="text-sm text-muted-foreground">Donations so far</span>
                  <span className="font-bold text-primary">{challenge.pot_total} BB</span>
                </div>
              )}
            </div>
          )}

          {!hasEnoughBalance && isSilverPlus && !isExpired && !isFreeChallenge && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>You need {stakeRequired - (balance || 0)} more BB. Purchase Barber Bucks to accept.</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleAccept}
              disabled={isSubmitting || isDeclining || !hasEnoughBalance || !isSilverPlus || isExpired}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isFreeChallenge ? 'Accepting...' : 'Matching Stake...'}</>
              ) : isFreeChallenge ? (
                `⚔️ Accept Challenge`
              ) : (
                `Match ${stakeRequired} BB & Accept Challenge`
              )}
            </Button>
            <Button
              onClick={handleDecline}
              disabled={isSubmitting || isDeclining}
              variant="outline"
              className="w-full"
            >
              {isDeclining ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Declining...</>
              ) : (
                'Decline'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
