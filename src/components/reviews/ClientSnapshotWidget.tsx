import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Star, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientSnapshotWidgetProps {
  clientId: string;
  className?: string;
}

interface RepScore {
  avg_star_rating: number;
  total_reviews: number;
  top_tags: Array<{ slug: string; count: number; is_negative: boolean }>;
  internal_top_tags: Array<{ slug: string; count: number; is_negative: boolean }>;
  risk_flags: Record<string, number>;
}

export function ClientSnapshotWidget({ clientId, className }: ClientSnapshotWidgetProps) {
  const { data } = useQuery({
    queryKey: ['client-reputation', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_client_reputation', {
        target_user_id: clientId,
      });
      if (error) throw error;
      return (data as unknown as RepScore[])?.[0] || null;
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });

  if (!data || data.total_reviews === 0) return null;

  const riskEntries = Object.entries(data.risk_flags || {}).filter(([, v]) => (v as number) >= 2);
  const hasRisk = riskEntries.length > 0;

  return (
    <div className={cn('rounded-lg border p-2 space-y-1.5', hasRisk ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/30', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          <span className="text-sm font-semibold">{Number(data.avg_star_rating).toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground">({data.total_reviews} reviews)</span>
        </div>
        {hasRisk && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
      </div>

      {/* Internal tags for barber eyes */}
      {Array.isArray(data.internal_top_tags) && data.internal_top_tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.internal_top_tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag.slug}
              variant="outline"
              className={cn(
                'text-[9px] py-0',
                tag.is_negative ? 'border-destructive/30 text-destructive' : 'border-primary/30 text-primary'
              )}
            >
              {tag.slug.replace(/-/g, ' ')} ({tag.count})
            </Badge>
          ))}
        </div>
      )}

      {/* Risk flags */}
      {hasRisk && (
        <div className="flex flex-wrap gap-1">
          {riskEntries.map(([flag, count]) => (
            <Badge key={flag} variant="destructive" className="text-[9px] py-0">
              🚩 {flag.replace(/-|_/g, ' ')} ×{count as number}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
