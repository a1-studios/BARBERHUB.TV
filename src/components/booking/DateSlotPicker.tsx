import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface DateSlotPickerProps {
  getAvailableSlots: (date: Date) => string[];
  selectedSlot: string | null;
  onSelectSlot: (slot: string) => void;
}

export function DateSlotPicker({ getAvailableSlots, selectedSlot, onSelectSlot }: DateSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Generate next 14 days
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

  const slots = useMemo(() => getAvailableSlots(selectedDate), [selectedDate, getAvailableSlots]);

  const formatDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short' });
  const formatDate = (d: Date) => d.getDate().toString();
  const formatMonth = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <div className="space-y-4">
      {/* Date Scroller */}
      <div className="space-y-1">
        <Label className="text-sm text-muted-foreground">Date</Label>
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {dates.map((d, i) => (
              <Button
                key={i}
                type="button"
                variant={isSameDay(d, selectedDate) ? 'default' : 'outline'}
                className={cn(
                  'flex-shrink-0 flex flex-col items-center h-16 w-14 p-1',
                  isSameDay(d, selectedDate) && 'bg-primary text-primary-foreground'
                )}
                onClick={() => setSelectedDate(d)}
              >
                <span className="text-[10px] uppercase">{formatDay(d)}</span>
                <span className="text-lg font-bold leading-tight">{formatDate(d)}</span>
                <span className="text-[10px]">{formatMonth(d)}</span>
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Time Slots */}
      <div className="space-y-1">
        <Label className="text-sm text-muted-foreground">
          Available Times {slots.length > 0 && `(${slots.length})`}
        </Label>
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4 text-center">
            No available slots for this day
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
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
        )}
      </div>
    </div>
  );
}
