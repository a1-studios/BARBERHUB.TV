import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TransactionHistoryProps {
  compact?: boolean;
}

export const TransactionHistory = ({ compact = false }: TransactionHistoryProps) => {
  const { user } = useAuth();

  const { data: transactions } = useQuery({
    queryKey: ['transactionHistory', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data } = await supabase
        .from('barber_bucks_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(compact ? 5 : 10);

      return data || [];
    },
    enabled: !!user?.id
  });

  const content = (
    <ScrollArea className={compact ? 'h-[200px]' : 'h-[400px] pr-4'}>
      <div className={compact ? 'space-y-2' : 'space-y-3'}>
        {transactions?.map((tx) => (
          <div
            key={tx.id}
            className={`flex items-center justify-between rounded-lg bg-muted/50 ${compact ? 'p-2' : 'p-3'}`}
          >
            <div className="flex items-center gap-2">
              <div className={`rounded-full ${compact ? 'p-1' : 'p-2'} ${
                tx.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                {tx.amount > 0 ? (
                  <ArrowUpRight className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-green-500`} />
                ) : (
                  <ArrowDownRight className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-red-500`} />
                )}
              </div>
              <div>
                <p className={`font-medium text-foreground ${compact ? 'text-xs' : ''}`}>
                  {tx.description || tx.transaction_type}
                </p>
                <p className={`text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>
                  {format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-bold ${compact ? 'text-xs' : ''} ${
                tx.amount > 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {tx.amount > 0 ? '+' : ''}{tx.amount} BB
              </p>
              {!compact && (
                <p className="text-xs text-muted-foreground">
                  Balance: {tx.balance_after} BB
                </p>
              )}
            </div>
          </div>
        ))}
        {transactions?.length === 0 && (
          <p className={`text-center text-muted-foreground ${compact ? 'py-4 text-xs' : 'py-8'}`}>
            No transactions yet
          </p>
        )}
      </div>
    </ScrollArea>
  );

  if (compact) return content;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};
