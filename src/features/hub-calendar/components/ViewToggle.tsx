import { cn } from '@/lib/utils';
import type { CalendarView } from '../types';

interface Props {
  view: CalendarView;
  onChange: (v: CalendarView) => void;
}

export function ViewToggle({ view, onChange }: Props) {
  const options: CalendarView[] = ['day', 'week', 'month'];
  return (
    <div className="inline-flex rounded-lg border border-border/40 bg-card/40 p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            'px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-md transition-all',
            view === o
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
