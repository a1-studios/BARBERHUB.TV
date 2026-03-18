import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Sun, Sunset, Moon, ChevronDown } from 'lucide-react';

interface DateSlotPickerProps {
  getAvailableSlots: (date: Date) => string[];
  selectedSlot: string | null;
  onSelectSlot: (slot: string) => void;
}

type Period = 'Morning' | 'Afternoon' | 'Evening';

function getPeriod(iso: string): Period {
  const h = new Date(iso).getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

const periodIcon: Record<Period, typeof Sun> = {
  Morning: Sun,
  Afternoon: Sunset,
  Evening: Moon,
};

function getQuickPicks(slots: string[]): { period: Period; slot: string }[] {
  const picks: { period: Period; slot: string }[] = [];
  const morning = slots.find(s => new Date(s).getHours() < 12);
  const afternoon = slots.find(s => { const h = new Date(s).getHours(); return h >= 12 && h < 17; });
  const evening = slots.find(s => new Date(s).getHours() >= 17);

  if (morning) picks.push({ period: 'Morning', slot: morning });
  if (afternoon) picks.push({ period: 'Afternoon', slot: afternoon });
  if (evening) picks.push({ period: 'Evening', slot: evening });
  return picks;
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

      {/* Quick Picks — 3 period-based */}
      {quickPicks.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Quick Picks</Label>
          <div className="grid grid-cols-3 gap-2">
            {quickPicks.map(({ period, slot }) => {
              const Icon = periodIcon[period];
              return (
                <Button
                  key={slot}
                  type="button"
                  variant="outline"
                  className={cn(
                    'flex flex-col items-center gap-1 h-auto py-3 px-2 border-cyan-500/40',
                    selectedSlot === slot
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                  )}
                  onClick={() => onSelectSlot(slot)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px] font-medium opacity-70">{period}</span>
                  <span className="text-sm font-bold">{formatTime(slot)}</span>
                </Button>
              );
            })}
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
