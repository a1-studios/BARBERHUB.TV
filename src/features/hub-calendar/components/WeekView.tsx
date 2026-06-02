import type { CalendarEvent } from '../types';
import { EventChip } from './EventChip';

interface Props {
  weekStart: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeekView({ weekStart, events, onEventClick }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  });

  const eventsByDayHour = new Map<string, CalendarEvent[]>();
  events.forEach((e) => {
    const t = new Date(e.starts_at);
    const key = `${t.toDateString()}|${t.getHours()}`;
    const arr = eventsByDayHour.get(key) || [];
    arr.push(e); eventsByDayHour.set(key, arr);
  });

  return (
    <div className="border border-border/40 rounded-xl bg-card/20 overflow-hidden max-h-[70vh] overflow-auto">
      <div className="grid sticky top-0 z-10 bg-card/80 backdrop-blur" style={{ gridTemplateColumns: '60px repeat(7, minmax(90px, 1fr))' }}>
        <div className="border-b border-border/30" />
        {days.map((d) => (
          <div key={d.toISOString()} className="border-b border-l border-border/30 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {d.toLocaleDateString([], { weekday: 'short' })}
            </div>
            <div className="text-sm font-semibold">{d.getDate()}</div>
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, minmax(90px, 1fr))' }}>
        {HOURS.map((h) => (
          <div key={h} className="contents">
            <div className="border-b border-border/15 px-1.5 py-3 text-[10px] text-muted-foreground text-right font-mono">
              {h.toString().padStart(2, '0')}
            </div>
            {days.map((d) => {
              const key = `${d.toDateString()}|${h}`;
              const cell = eventsByDayHour.get(key) || [];
              return (
                <div key={key} className="border-b border-l border-border/15 min-h-[44px] p-0.5 space-y-0.5">
                  {cell.map((e) => (
                    <EventChip key={e.event_id} event={e} onClick={onEventClick} compact />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
