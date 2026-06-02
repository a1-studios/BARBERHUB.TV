import { cn } from '@/lib/utils';
import { FILTER_PILLS } from '../types';

interface Props {
  active: string;
  onChange: (id: string) => void;
}

export function EventFilterPills({ active, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
      {FILTER_PILLS.map((p) => {
        const isActive = active === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={cn(
              'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all border',
              isActive
                ? 'border-primary text-[hsl(187,80%,55%)] bg-background shadow-[0_0_10px_hsl(187_80%_55%_/_0.4)]'
                : 'border-border/40 bg-muted/20 text-muted-foreground hover:border-border/70',
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
