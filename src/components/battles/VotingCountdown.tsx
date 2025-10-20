import { useEffect, useState } from 'react';
import { Clock, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface VotingCountdownProps {
  battleId: string;
  votingEndsAt: string;
  status: string;
  isOrganizer?: boolean;
}

export const VotingCountdown = ({ battleId, votingEndsAt, status, isOrganizer }: VotingCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const queryClient = useQueryClient();

  const closeVotingMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('close-voting', {
        body: { battleId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Voting closed successfully!');
      queryClient.invalidateQueries({ queryKey: ['battle', battleId] });
      queryClient.invalidateQueries({ queryKey: ['battles'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to close voting');
    }
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const endTime = new Date(votingEndsAt).getTime();
      const now = new Date().getTime();
      const difference = endTime - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft('Voting has ended');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [votingEndsAt]);

  if (status !== 'voting') {
    return null;
  }

  return (
    <Card className={isExpired ? 'border-destructive/50 bg-destructive/5' : 'border-primary/50 bg-primary/5'}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isExpired ? 'bg-destructive/20' : 'bg-primary/20'
            }`}>
              {isExpired ? (
                <Trophy className={`w-5 h-5 ${isExpired ? 'text-destructive' : 'text-primary'}`} />
              ) : (
                <Clock className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {isExpired ? 'Voting Period Ended' : 'Voting Ends In'}
              </p>
              <p className={`text-lg font-bold ${
                isExpired ? 'text-destructive' : 'text-primary'
              }`}>
                {timeLeft}
              </p>
            </div>
          </div>

          {isExpired && isOrganizer && (
            <Button
              onClick={() => closeVotingMutation.mutate()}
              disabled={closeVotingMutation.isPending}
              variant="destructive"
              size="sm"
            >
              <Trophy className="w-4 h-4 mr-2" />
              {closeVotingMutation.isPending ? 'Closing...' : 'Close Voting'}
            </Button>
          )}
        </div>

        {isExpired && !isOrganizer && (
          <p className="text-xs text-muted-foreground mt-2">
            Results will be calculated automatically shortly...
          </p>
        )}

        {!isExpired && (
          <p className="text-xs text-muted-foreground mt-2">
            Cast your vote before time runs out! Voting closes automatically.
          </p>
        )}
      </CardContent>
    </Card>
  );
};