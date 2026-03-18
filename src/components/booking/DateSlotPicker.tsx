import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Zap, ChevronDown } from 'lucide-react';

interface DateSlotPickerProps {
  getAvailableSlots: (date: Date) => string[];
  selectedSlot: string | null;
  onSelectSlot: (slot: string) => void;
}

function getQuickPicks(slots: string[]): string[] {
  if (slots.length <= 4) return slots;

  // Bucket slots into morning (<12), midday (12-15), afternoon (15-18), evening (18+)
  const buckets: Record<string, string[]> = { morning: [], midday: [], afternoon: [], evening: [] };
  for (const slot of slots) {
    const h = new Date(slot).getHours();
    if (h < 12) buckets.morning.push(slot);
    else if (h < 15) buckets.midday.push(slot);
    else if (h < 18) buckets.afternoon.push(slot);
    else buckets.evening.push(slot);
  }

  const picks: string[] = [];
  // Take first from each non-empty bucket
  for (const key of ['morning', 'midday', 'afternoon', 'evening'] as const) {
    if (buckets[key].length > 0 && picks.length < 4) {
      picks.push(buckets[key][0]);
    }
  }
  // If still < 4, fill from remaining slots not already picked
  if (picks.length < 4) {
    for (const slot of slots) {
      if (!picks.includes(slot) && picks.length < 4) {
        picks.push(slot);
      }
    }
  }
  return picks.sort();
}

export function DateSlotPicker({ getAvailableSlots, selectedSlot, onSelectSlot }: DateSlotPickerProps) {
  const [selectedDateIndex, setSelectedDateIndex] = useState<string>('0');
  const [showAllSlots, setShowAllSlots] = useState(false);

  const dates = useMemo(() => {
    const result: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      d.setHours(0, 0, 0, 0);
      result.push(d);
    }
    return result;
  }, []);

  const selectedDate = dates[parseInt(selectedDateIndex)] || dates[0];
  const slots = useMemo(() => getAvailableSlots(selectedDate), [selectedDate, getAvailableSlots]);
  const quickPicks = useMemo(() => getQuickPicks(slots), [slots]);

  const formatDateOption = (d: Date, i: number) => {
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return i === 0 ? `Today — ${label}` : label;
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="space-y-3 w-full">
      {/* Date Dropdown */}
      <div className="space-y-1">
        <Label className="text-sm text-muted-foreground">Date</Label>
        <Select value={selectedDateIndex} onValueChange={(v) => { setSelectedDateIndex(v); setShowAllSlots(false); }}>
          <SelectTrigger className="w-full h-10">
            <SelectValue placeholder="Select date" />
          </SelectTrigger>
          <SelectContent>
            {dates.map((d, i) => (
              <SelectItem key={i} value={String(i)}>
                {formatDateOption(d, i)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick Picks */}
      {quickPicks.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            Quick Picks
          </Label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickPicks.map((slot) => (
              <Button
                key={slot}
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'text-sm font-medium px-4 py-2 h-9 shrink-0 border-cyan-500/40',
                  selectedSlot === slot
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                )}
                onClick={() => onSelectSlot(slot)}
              >
                {formatTime(slot)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* All Time Slots (collapsible) */}
      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-4 text-center">
          No available slots for this day
        </p>
      ) : slots.length > quickPicks.length ? (
        <Collapsible open={showAllSlots} onOpenChange={setShowAllSlots}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground gap-1">
              Show all {slots.length} slots
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showAllSlots && 'rotate-180')} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto pt-1">
              {slots.map((slot) => (
                <Button
                  key={slot}
                  type="button"
                  variant={selectedSlot === slot ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'text-xs',
                    selectedSlot === slot && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => onSelectSlot(slot)}
                >
                  {formatTime(slot)}
                </Button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}
