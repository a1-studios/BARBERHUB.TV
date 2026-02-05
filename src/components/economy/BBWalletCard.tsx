import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { AddFundsModal } from '@/components/AddFundsModal';
import { RotatingBBCoin } from '@/components/economy/RotatingBBCoin';
import { Coins, Plus, TrendingUp, TrendingDown, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const BBWalletCard = () => {
  const { barberBucks, transactions, isLoading, showAddFundsModal, setShowAddFundsModal } = useBarberBucks();
  const { user } = useAuth();
  const [showHistory, setShowHistory] = useState(false);

  // Fetch user profile for avatar
  const { data: profile } = useQuery({
    queryKey: ['user-profile-avatar', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, display_name')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id
  });

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) return <TrendingUp className="h-3 w-3 text-green-500" />;
    return <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      'purchase': 'Purchase',
      'donation_sent': 'Donation Sent',
      'donation_received': 'Donation Received',
      'tournament_entry': 'Tournament Entry',
      'challenge_stake_escrow': 'Challenge Stake',
      'challenge_win': 'Challenge Won',
      'product_purchase': 'Shop Purchase',
      'battle_donation': 'Battle Support',
      'admin_award': 'Admin Award',
      'referral_bonus': 'Referral Bonus',
    };
    return labels[type] || type.replace(/_/g, ' ');
  };

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotatingBBCoin 
                avatarUrl={profile?.avatar_url} 
                displayName={profile?.display_name} 
                size="sm" 
                animate={true} 
              />
              <CardTitle className="text-lg">BB Wallet</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              <Coins className="h-3 w-3 mr-1" />
              Barber Bucks
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Your in-app currency for all transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Balance Display */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">{barberBucks.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">BB</span>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowAddFundsModal(true)} 
              size="sm" 
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Funds
            </Button>
            <Button 
              onClick={() => setShowHistory(!showHistory)} 
              size="sm" 
              variant="outline"
              className="flex-1"
            >
              <History className="h-4 w-4 mr-1" />
              History
            </Button>
          </div>

          {/* Transaction History */}
          {showHistory && (
            <div className="pt-2 border-t">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                Recent Transactions
              </h4>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {transactions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No transactions yet
                    </p>
                  ) : (
                    transactions.map((tx: any) => (
                      <div 
                        key={tx.id} 
                        className="flex items-center justify-between p-2 rounded-lg bg-background/50 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {getTransactionIcon(tx.transaction_type, tx.amount)}
                          <div className="min-w-0">
                            <p className="font-medium text-xs truncate">
                              {getTransactionLabel(tx.transaction_type)}
                            </p>
                            {tx.description && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                {tx.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className={`text-xs font-semibold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount} BB
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Info Text */}
          <p className="text-[10px] text-muted-foreground text-center">
            Use BB for tournaments, donations, gear & more
          </p>
        </CardContent>
      </Card>

      <AddFundsModal 
        isOpen={showAddFundsModal} 
        onClose={() => setShowAddFundsModal(false)} 
      />
    </>
  );
};
