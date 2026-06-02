import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { EVENT_TYPE_META, type CalendarEvent } from '../types';
import { IntakePreviewCard } from '@/components/intake/IntakePreviewCard';

interface Props {
  event: CalendarEvent | null;
  onClose: () => void;
}

export function EventDetailsSheet({ event, onClose }: Props) {
  if (!event) return null;
  const meta = EVENT_TYPE_META[event.event_type] ?? EVENT_TYPE_META.appointment;
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  const md = event.metadata || {};

  return (
    <Sheet open={!!event} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl bg-background/95 backdrop-blur border-t border-border/40">
        <SheetHeader>
          <div className={`inline-block self-start text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border mb-1 ${meta.bg} ${meta.border} ${meta.color}`}>
            {meta.label}
          </div>
          <SheetTitle>{event.title}</SheetTitle>
          <SheetDescription className="text-xs">
            {start.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            {' → '}
            {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3 text-sm">
          {(md.intake_current_url || md.intake_reference_url) && (
            <IntakePreviewCard
              referenceUrl={md.intake_reference_url}
              currentUrl={md.intake_current_url}
              note={md.intake_note}
              serviceLine={md.service_name ? `${md.service_name}${md.duration_minutes ? ` · ${md.duration_minutes} min` : ''}` : null}
            />
          )}
          {md.escrow_amount_bb != null && (
            <div className="text-xs text-muted-foreground">Escrow: <span className="text-foreground font-semibold">{md.escrow_amount_bb} BB</span></div>
          )}
          {md.total_bb != null && (
            <div className="text-xs text-muted-foreground">Total: <span className="text-foreground font-semibold">{md.total_bb} BB</span> ({md.side})</div>
          )}
          <div className="text-[11px] text-muted-foreground capitalize">Status: {event.status}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
