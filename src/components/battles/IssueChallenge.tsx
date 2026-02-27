import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Flame, Coins, AlertCircle, Loader2, Clock, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { Badge } from '@/components/ui/badge';

const MIN_STAKE_BB = 100;

export const IssueChallenge = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { barberBucks: balance } = useBarberBucks();
  const { tierName } = useSubscriptionLimits();
  const [title, setTitle] = useState('');
  const [stakeAmount, setStakeAmount] = useState<string>(String(MIN_STAKE_BB));
  const [challengeMessage, setChallengeMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSilverPlus = ['silver', 'gold', 'diamond'].includes(tierName);
  const stakeValue = parseInt(stakeAmount) || 0;
  const isValidStake = stakeValue >= MIN_STAKE_BB;
  const hasEnoughBalance = (balance || 0) >= stakeValue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !isSilverPlus) return;

    if (!isValidStake) {
      toast({ title: "Invalid Stake", description: `Minimum stake is ${MIN_STAKE_BB} BB`, variant: "destructive" });
      return;
    }

    if (!hasEnoughBalance) {
      toast({ title: "Insufficient Barber Bucks", description: `You need ${stakeValue} BB but have ${balance || 0} BB`, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-challenge-stake', {
        body: {
          title,
          stake_amount: stakeValue,
          challenge_message: challengeMessage || null,
          duration_minutes: 60,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "🔥 Challenge Issued!", description: `${stakeValue} BB staked. Expires in 1 hour!` });
      setTitle('');
      setStakeAmount(String(MIN_STAKE_BB));
      setChallengeMessage('');
    } catch (error: any) {
      console.error('Error issuing challenge:', error);
      toast({ title: "Error", description: error.message || "Failed to issue challenge", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Silver+ gate
  if (!isSilverPlus) {
    return (
      <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6 text-center space-y-4">
        <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
        <h3 className="text-lg font-bold text-foreground">Silver+ Required</h3>
        <p className="text-sm text-muted-foreground">
          Upgrade to Silver tier or above to issue and accept challenges.
        </p>
        <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-500">
          Current: {tierName || 'Free'}
        </Badge>
      </div>
    );
  }

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg">
          <Flame className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Issue a Challenge</h3>
          <p className="text-sm text-muted-foreground">Stake BB and challenge the arena</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-500">
          UNOFFICIAL — No Ranking Impact
        </Badge>
        <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-500">
          <Clock className="w-3 h-3 mr-1" />
          1 Hour Limit
        </Badge>
      </div>

      {/* Balance display */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-4 border border-border/50">
        <span className="text-sm text-muted-foreground">Your Balance</span>
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <Coins className="w-4 h-4 text-yellow-500" />
          {balance?.toLocaleString() || 0} BB
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="challenge-title">Challenge Title</Label>
          <Input id="challenge-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Best Fade in Miami - Come at me!" required className="mt-1" />
        </div>

        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-yellow-500">
            <Coins className="w-5 h-5" />
            <h4 className="font-semibold">Stake Amount (BB)</h4>
          </div>
          <div>
            <Label htmlFor="stakeAmount">Barber Bucks to Stake</Label>
            <Input id="stakeAmount" type="number" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} placeholder={String(MIN_STAKE_BB)} min={MIN_STAKE_BB} className="mt-1" required />
            {!isValidStake && stakeAmount && (
              <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                Minimum stake is {MIN_STAKE_BB} BB
              </div>
            )}
            {isValidStake && !hasEnoughBalance && (
              <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                Insufficient balance ({balance || 0} BB)
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Opponent must match your stake. Winner takes the pot (minus 5% platform fee to jackpot).
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="challengeMessage">Challenge Message (Optional)</Label>
          <Textarea id="challengeMessage" value={challengeMessage} onChange={(e) => setChallengeMessage(e.target.value)} placeholder="I can beat you doing a flat top!" className="mt-1" rows={2} />
        </div>

        <Button type="submit" disabled={isSubmitting || !title || !isValidStake || !hasEnoughBalance} className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-600">
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Challenge...</>
          ) : (
            `🔥 Stake ${stakeValue} BB & Issue Challenge`
          )}
        </Button>
      </form>
    </div>
  );
};
