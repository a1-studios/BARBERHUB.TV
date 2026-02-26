import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DateSlotPickerProps {
  getAvailableSlots: (date: Date) => string[];
  selectedSlot: string | null;
  onSelectSlot: (slot: string) => void;
}

export function DateSlotPicker({ getAvailableSlots, selectedSlot, onSelectSlot }: DateSlotPickerProps) {
  const [selectedDateIndex, setSelectedDateIndex] = useState<string>('0');

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
        <Select value={selectedDateIndex} onValueChange={setSelectedDateIndex}>
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
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto">
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
