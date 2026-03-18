import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Gift, Scissors, Star, Eye } from 'lucide-react';
import { format } from 'date-fns';

const prizeIcons: Record<string, typeof Gift> = {
  bb: Star,
  free_cut: Scissors,
  visibility_boost: Eye,
  premium_feature: Star,
};

const prizeColors: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  redeemed: 'bg-muted text-muted-foreground border-border',
  expired: 'bg-destructive/20 text-destructive border-destructive/30',
};

export const MyPrizesSection = () => {
  const { user } = useAuth();

  const { data: prizes, isLoading } = useQuery({
    queryKey: ['user_prizes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_prizes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div className="px-4 py-3 text-sm text-muted-foreground animate-pulse">Loading prizes...</div>;
  }

  if (!prizes || prizes.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <Gift className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No prizes yet</p>
        <p className="text-xs text-muted-foreground/60">Spin the wheel to win rewards!</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/20">
      {prizes.map((prize) => {
        const Icon = prizeIcons[prize.prize_type] || Gift;
        const statusClass = prizeColors[prize.status] || prizeColors.active;

        return (
          <div key={prize.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{prize.prize_label}</p>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(prize.claimed_at || prize.created_at), 'MMM d, yyyy')}
                {prize.expires_at && ` · Expires ${format(new Date(prize.expires_at), 'MMM d')}`}
              </p>
            </div>
            <Badge variant="outline" className={`text-[10px] px-1.5 ${statusClass}`}>
              {prize.status}
            </Badge>
          </div>
        );
      })}
    </div>
  );
};
