import { cn } from '@/lib/utils';
import { EVENT_TYPE_META, type CalendarEvent } from '../types';

interface Props {
  monthStart: Date; // first of month
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthView({ monthStart, events, onEventClick }: Props) {
  const firstWeekday = monthStart.getDay();
  const gridStart = new Date(monthStart); gridStart.setDate(monthStart.getDate() - firstWeekday);

  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return d;
  });

  const byDate = new Map<string, CalendarEvent[]>();
  events.forEach((e) => {
    const k = new Date(e.starts_at).toDateString();
    const arr = byDate.get(k) || []; arr.push(e); byDate.set(k, arr);
  });

  const today = new Date().toDateString();

  return (
    <div className="border border-border/40 rounded-xl bg-card/20 overflow-hidden">
      <div className="grid grid-cols-7 bg-card/60">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-[10px] uppercase tracking-wider text-muted-foreground p-2 text-center border-b border-border/30">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[minmax(96px,1fr)]">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === monthStart.getMonth();
          const isToday = d.toDateString() === today;
          const dayEvents = byDate.get(d.toDateString()) || [];
          return (
            <div
              key={i}
              className={cn(
                'border-r border-b border-border/15 p-1.5 flex flex-col gap-0.5 overflow-hidden',
                !inMonth && 'opacity-40 bg-background/40',
                isToday && 'bg-primary/5',
              )}
            >
              <div className={cn('text-[11px] font-mono', isToday && 'text-primary font-bold')}>{d.getDate()}</div>
              {dayEvents.slice(0, 3).map((e) => {
                const meta = EVENT_TYPE_META[e.event_type] ?? EVENT_TYPE_META.appointment;
                return (
                  <button
                    key={e.event_id}
                    type="button"
                    onClick={() => onEventClick(e)}
                    className={cn('truncate text-[9px] rounded px-1 py-0.5 text-left border', meta.bg, meta.border, meta.color)}
                  >
                    {e.title}
                  </button>
                );
              })}
              {dayEvents.length > 3 && (
                <div className="text-[9px] text-muted-foreground">+{dayEvents.length - 3} more</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
