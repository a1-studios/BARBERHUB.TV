import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coins, Calendar } from 'lucide-react';
import type { ChairListing } from '../types';
import { useBookChair } from '../hooks/useBookChair';
import { useBarberBucks } from '@/hooks/useBarberBucks';

interface Props {
  listing: ChairListing | null;
  defaultStart: string | null;
  defaultEnd: string | null;
  onClose: () => void;
}

export function BookingSummarySheet({ listing, defaultStart, defaultEnd, onClose }: Props) {
  const [start, setStart] = useState(defaultStart || '');
  const [end, setEnd] = useState(defaultEnd || '');
  const { mutateAsync: book, isPending } = useBookChair();
  const { barberBucks } = useBarberBucks();

  if (!listing) return null;

  const days = start && end ? Math.max(1, Math.round((+new Date(end) - +new Date(start)) / 86_400_000) + 1) : 1;
  const useWeekly = listing.weekly_rate_bb && days >= 7;
  const total = useWeekly
    ? Math.floor(days / 7) * (listing.weekly_rate_bb || 0) + (days % 7) * listing.daily_rate_bb
    : days * listing.daily_rate_bb;
  const fee = Math.floor(total * 0.05);

  return (
    <Sheet open={!!listing} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl bg-background/95 backdrop-blur border-t border-primary/30">
        <SheetHeader>
          <SheetTitle className="text-primary">{listing.chair_name}</SheetTitle>
          <SheetDescription className="text-xs">
            {listing.shop_name} {listing.address ? `· ${listing.address}` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">From</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">To</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>

          {!!listing.amenities?.length && (
            <div className="flex flex-wrap gap-1.5">
              {listing.amenities.map((a) => (
                <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/40">
                  {a}
                </span>
              ))}
            </div>
          )}

          <div className="rounded-lg bg-muted/20 border border-border/40 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>{days} day{days > 1 ? 's' : ''}</span><span>{listing.daily_rate_bb} BB / day</span></div>
            <div className="flex justify-between text-muted-foreground text-xs"><span>Platform fee (5%)</span><span>{fee} BB</span></div>
            <div className="flex justify-between font-semibold text-foreground border-t border-border/30 pt-2 mt-1">
              <span className="flex items-center gap-1"><Coins className="w-4 h-4 text-yellow-500" />Total</span>
              <span>{total.toLocaleString()} BB</span>
            </div>
            <div className="text-[11px] text-muted-foreground">Your balance: {barberBucks.toLocaleString()} BB</div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
            disabled={isPending || !start || !end || total > barberBucks}
            onClick={async () => {
              try {
                await book({ listingId: listing.id, startDate: start, endDate: end });
                onClose();
              } catch {/* handled */}
            }}
          >
            <Calendar className="w-4 h-4 mr-2" />
            {isPending ? 'Booking…' : `Reserve for ${total} BB`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
