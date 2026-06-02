import { useAuth } from '@/hooks/useAuth';
import { useMyChairListings, useToggleListingActive } from '../hooks/useChairListings';
import { Switch } from '@/components/ui/switch';
import { Loader2, MapPin } from 'lucide-react';

export function MyChairsList() {
  const { user } = useAuth();
  const { data: listings = [], isLoading } = useMyChairListings(user?.id);
  const { mutate: toggle } = useToggleListingActive();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  if (!listings.length) return <p className="text-center text-sm text-muted-foreground py-8">You haven't posted any chairs yet.</p>;

  return (
    <div className="space-y-3">
      {listings.map((l: any) => (
        <div key={l.id} className="p-4 rounded-xl bg-card/40 border border-border/40 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-xl">🪑</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{l.chair_name}</div>
            <div className="text-xs text-muted-foreground truncate">{l.shop_name || '—'}</div>
            {l.address && <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{l.address}</div>}
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-[hsl(187,80%,55%)]">{l.daily_rate_bb} BB/day</div>
            <div className="flex items-center gap-1.5 mt-1 justify-end">
              <span className="text-[10px] text-muted-foreground">{l.is_active ? 'Live' : 'Paused'}</span>
              <Switch checked={l.is_active} onCheckedChange={(v) => toggle({ id: l.id, isActive: v })} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
