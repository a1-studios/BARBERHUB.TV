import { useAuth } from '@/hooks/useAuth';
import { useMyBookings } from '../hooks/useBookChair';
import { Loader2, Calendar } from 'lucide-react';

export function MyBookingsList() {
  const { user } = useAuth();
  const { data: bookings = [], isLoading } = useMyBookings(user?.id);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  if (!bookings.length) return <p className="text-center text-sm text-muted-foreground py-8">No chair bookings yet.</p>;

  return (
    <div className="space-y-3">
      {bookings.map((b) => {
        const isRenter = b.renter_user_id === user?.id;
        return (
          <div key={b.id} className="p-4 rounded-xl bg-card/40 border border-border/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(187,80%,40%)]/15 border border-[hsl(187,80%,40%)]/30 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[hsl(187,80%,55%)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{isRenter ? 'Renting' : 'Hosting'}</div>
              <div className="text-sm font-semibold">{b.start_date} → {b.end_date}</div>
            </div>
            <div className="text-right text-sm font-semibold">
              <span className={isRenter ? 'text-red-400' : 'text-emerald-400'}>
                {isRenter ? '-' : '+'}{b.total_bb} BB
              </span>
              <div className="text-[10px] text-muted-foreground">{b.status}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
