import { cn } from '@/lib/utils';
import { EVENT_TYPE_META, type CalendarEvent } from '../types';

interface Props {
  event: CalendarEvent;
  onClick?: (e: CalendarEvent) => void;
  compact?: boolean;
}

export function EventChip({ event, onClick, compact }: Props) {
  const meta = EVENT_TYPE_META[event.event_type] ?? EVENT_TYPE_META.appointment;
  const time = new Date(event.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      className={cn(
        'block w-full text-left rounded-md border px-2 py-1 text-[10px] leading-tight truncate transition-all hover:scale-[1.02]',
        meta.bg,
        meta.border,
        meta.color,
      )}
      title={`${event.title} · ${time}`}
    >
      {!compact && <span className="font-semibold mr-1">{time}</span>}
      <span className="truncate">{event.title}</span>
    </button>
  );
}
