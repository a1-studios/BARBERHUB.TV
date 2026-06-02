import type { CalendarEvent } from '../types';
import { EventChip } from './EventChip';

interface Props {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DayView({ date, events, onEventClick }: Props) {
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

  const visible = events.filter((e) => {
    const t = new Date(e.starts_at);
    return t >= dayStart && t < dayEnd;
  });

  return (
    <div className="border border-border/40 rounded-xl bg-card/20 overflow-hidden max-h-[70vh] overflow-y-auto">
      <div className="grid" style={{ gridTemplateColumns: '60px 1fr' }}>
        {HOURS.map((h) => {
          const slotEvents = visible.filter((e) => new Date(e.starts_at).getHours() === h);
          return (
            <div key={h} className="contents">
              <div className="border-b border-border/20 px-2 py-3 text-[10px] text-muted-foreground text-right font-mono">
                {h.toString().padStart(2, '0')}:00
              </div>
              <div className="border-b border-l border-border/20 min-h-[60px] p-1 space-y-1">
                {slotEvents.map((e) => (
                  <EventChip key={e.event_id} event={e} onClick={onEventClick} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
