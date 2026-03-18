import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Star, AlertTriangle, ShieldCheck, UserCheck, Scissors } from 'lucide-react';
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

  // Fetch reliability data from client_profiles
  const { data: clientProfile } = useQuery({
    queryKey: ['client-profile-reliability', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('total_appointments, no_show_count, username, avatar_url')
        .eq('user_id', clientId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });

  // Fetch user status from profiles
  const { data: userProfile } = useQuery({
    queryKey: ['client-status-profile', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified_by_competition, display_name, user_type')
        .eq('user_id', clientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });

  // Fetch last appointment notes
  const { data: lastRequest } = useQuery({
    queryKey: ['client-last-request', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('notes')
        .eq('client_id', clientId)
        .not('notes', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.notes || null;
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });

  // Compute reliability
  const totalAppts = clientProfile?.total_appointments || 0;
  const noShows = clientProfile?.no_show_count || 0;
  const reliability = totalAppts > 0 ? Math.round(((totalAppts - noShows) / totalAppts) * 100) : null;

  // Compute user status
  const isElite = userProfile?.is_verified_by_competition === true;
  const isNewClient = totalAppts < 3;

  const hasRepData = data && data.total_reviews > 0;
  const hasPills = reliability !== null || isElite || isNewClient || lastRequest;
  
  if (!hasRepData && !hasPills) return null;

  const riskEntries = Object.entries(data?.risk_flags || {}).filter(([, v]) => (v as number) >= 2);
  const hasRisk = riskEntries.length > 0;

  return (
    <div className={cn('rounded-lg border p-2 space-y-1.5', hasRisk ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/30', className)}>
      {/* Star rating row */}
      {hasRepData && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="text-sm font-semibold">{Number(data.avg_star_rating).toFixed(1)}</span>
            <span className="text-[10px] text-muted-foreground">({data.total_reviews} reviews)</span>
          </div>
          {hasRisk && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
        </div>
      )}

      {/* Review Pill badges */}
      <div className="flex flex-wrap gap-1">
        {reliability !== null && (
          <Badge
            variant="outline"
            className={cn(
              'text-[9px] py-0',
              reliability >= 90 ? 'border-green-500/30 text-green-400' :
              reliability >= 70 ? 'border-amber-500/30 text-amber-400' :
              'border-destructive/30 text-destructive'
            )}
          >
            <UserCheck className="h-2.5 w-2.5 mr-0.5" />
            {reliability}% Reliable
          </Badge>
        )}
        {isElite && (
          <Badge variant="outline" className="text-[9px] py-0 border-primary/30 text-primary">
            <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
            Elite Voter
          </Badge>
        )}
        {isNewClient && (
          <Badge variant="outline" className="text-[9px] py-0 border-blue-500/30 text-blue-400">
            New Client
          </Badge>
        )}
      </div>

      {/* Last request snippet */}
      {lastRequest && (
        <div className="flex items-start gap-1 text-[10px] text-muted-foreground">
          <Scissors className="h-2.5 w-2.5 mt-0.5 shrink-0" />
          <span className="line-clamp-1">Last: "{lastRequest}"</span>
        </div>
      )}

      {/* Internal tags for barber eyes */}
      {Array.isArray(data?.internal_top_tags) && data.internal_top_tags.length > 0 && (
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
