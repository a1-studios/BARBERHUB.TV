import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const PerformanceMetrics = () => {
  const { user } = useAuth();

  const { data: metrics } = useQuery({
    queryKey: ['performanceMetrics', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get barber profile
      const { data: barberProfile } = await supabase
        .from('barber_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!barberProfile) return [];

      // Get battles with their submissions and votes
      const { data: battles } = await supabase
        .from('battles')
        .select(`
          id,
          title,
          category,
          status
        `)
        .or(`barber1_id.eq.${barberProfile.id},barber2_id.eq.${barberProfile.id}`)
        .eq('status', 'completed')
        .limit(5)
        .order('created_at', { ascending: false });

      if (!battles) return [];

      // Get votes for each battle
      const metricsData = await Promise.all(
        battles.map(async (battle) => {
          const { data: submissions } = await supabase
            .from('battle_submissions')
            .select('id')
            .eq('battle_id', battle.id)
            .eq('user_id', user.id);

          const submissionIds = submissions?.map(s => s.id) || [];

          const { count: votes } = await supabase
            .from('battle_votes')
            .select('*', { count: 'exact', head: true })
            .in('submission_id', submissionIds);

          return {
            name: battle.title.substring(0, 20) + '...',
            category: battle.category || 'General',
            votes: votes || 0
          };
        })
      );

      return metricsData;
    },
    enabled: !!user?.id
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Battle Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={metrics}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
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
            <Legend />
            <Bar 
              dataKey="votes" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
              name="Votes Received"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
