import { cn } from '@/lib/utils';

interface Props {
  referenceUrl?: string | null;
  currentUrl?: string | null;
  note?: string | null;
  serviceLine?: string | null;
  className?: string;
}

/**
 * Condensed 50/50 split-screen intake thumbnail.
 * Left = reference photo. Right = current state.
 * Designed for a 2-second scan by the barber.
 */
export function IntakePreviewCard({ referenceUrl, currentUrl, note, serviceLine, className }: Props) {
  const truncatedNote = note && note.length > 60 ? note.slice(0, 57) + '…' : note;

  return (
    <div className={cn('rounded-xl overflow-hidden border border-border/40 bg-card/30', className)}>
      <div className="grid grid-cols-2 aspect-video relative">
        <div className="relative bg-muted/30">
          {referenceUrl ? (
            <img src={referenceUrl} alt="Reference style" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">No reference</div>
          )}
          <span className="absolute top-1.5 left-1.5 text-[9px] tracking-wider uppercase font-bold bg-black/70 text-[hsl(187,80%,55%)] px-1.5 py-0.5 rounded">
            Reference
          </span>
        </div>
        <div className="relative bg-muted/30">
          {currentUrl ? (
            <img src={currentUrl} alt="Current state" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">No capture</div>
          )}
          <span className="absolute top-1.5 right-1.5 text-[9px] tracking-wider uppercase font-bold bg-black/70 text-primary px-1.5 py-0.5 rounded">
            Current
          </span>
        </div>
        {/* hairline cyan divider */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-[hsl(187,80%,55%)]/70 -translate-x-1/2" />
      </div>
      {(serviceLine || truncatedNote) && (
        <div className="px-2.5 py-1.5 text-[11px] leading-snug">
          {serviceLine && <div className="text-foreground font-semibold truncate">{serviceLine}</div>}
          {truncatedNote && <div className="text-muted-foreground truncate">{truncatedNote}</div>}
        </div>
      )}
    </div>
  );
}
