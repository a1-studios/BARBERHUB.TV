import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

export const EarningsChart = () => {
  const { user } = useAuth();

  const { data: chartData } = useQuery({
    queryKey: ['earningsChart', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get last 30 days of transactions
      const thirtyDaysAgo = subDays(new Date(), 30);

      const { data: transactions } = await supabase
        .from('barber_bucks_transactions')
        .select('amount, balance_after, created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (!transactions || transactions.length === 0) return [];

      // Group by day
      const dailyData = transactions.reduce((acc: any[], tx) => {
        const date = format(new Date(tx.created_at), 'MMM dd');
        const existing = acc.find(d => d.date === date);
        
        if (existing) {
          existing.balance = tx.balance_after;
          existing.earned += tx.amount > 0 ? tx.amount : 0;
        } else {
          acc.push({
            date,
            balance: tx.balance_after,
            earned: tx.amount > 0 ? tx.amount : 0
          });
        }
        
        return acc;
      }, []);

      return dailyData;
    },
    enabled: !!user?.id
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Barber Bucks Trend (30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="balance" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Balance"
            />
            <Line 
              type="monotone" 
              dataKey="earned" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              name="Earned"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
