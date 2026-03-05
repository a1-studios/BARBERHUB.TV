import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Coins, Home } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Bounty {
  id: string;
  client_id: string;
  location_text: string;
  service_description: string | null;
  bounty_amount_bb: number;
  preferred_date: string | null;
  status: string;
  expires_at: string;
  created_at: string;
}

export function BountyBoard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: bounties, isLoading } = useQuery({
    queryKey: ['open-bounties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('house_call_bounties')
        .select('*')
        .eq('status', 'open')
        .order('bounty_amount_bb', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as Bounty[];
    },
    refetchInterval: 30000,
  });

  const claimMutation = useMutation({
    mutationFn: async (bountyId: string) => {
      const { data, error } = await supabase.functions.invoke('claim-bounty', {
        body: { bounty_id: bountyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-bounties'] });
      queryClient.invalidateQueries({ queryKey: ['my-appointments-barber'] });
      toast.success('Bounty claimed! Appointment created.');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to claim bounty'),
  });

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading bounties...</div>;
  }

  if (!bounties?.length) {
    return (
      <div className="py-8 text-center space-y-2">
        <Home className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">No open bounties right now</p>
        <p className="text-[10px] text-muted-foreground">Check back soon — clients post house call requests here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        Open Bounties ({bounties.length})
      </p>
      {bounties.map((bounty) => {
        const expiresAt = new Date(bounty.expires_at);
        const isExpired = expiresAt < new Date();
        const isOwnBounty = bounty.client_id === user?.id;

        return (
          <Card key={bounty.id} className="border-accent/20 hover:border-accent/40 transition-colors">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="font-semibold text-sm">{bounty.location_text}</span>
                  </div>
                  {bounty.service_description && (
                    <p className="text-xs text-muted-foreground pl-5">✂️ {bounty.service_description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground pl-5">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {isExpired ? 'Expired' : `Expires ${formatDistanceToNow(expiresAt, { addSuffix: true })}`}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5 text-primary" />
                    <span className="text-lg font-black text-primary">{bounty.bounty_amount_bb.toLocaleString()}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">BB</span>
                </div>
              </div>

              {!isOwnBounty && !isExpired && (
                <Button
                  className="w-full h-9 font-bold text-xs bg-accent hover:bg-accent/90 text-accent-foreground"
                  disabled={claimMutation.isPending}
                  onClick={() => claimMutation.mutate(bounty.id)}
                >
                  {claimMutation.isPending ? 'Claiming...' : 'CLAIM THIS BOUNTY'}
                </Button>
              )}
              {isOwnBounty && (
                <Badge variant="outline" className="text-[10px]">Your bounty</Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
