import { cn } from '@/lib/utils';

export const RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const;
export type RadiusMiles = (typeof RADIUS_OPTIONS)[number];

interface RadiusToggleProps {
  value: RadiusMiles;
  onChange: (miles: RadiusMiles) => void;
  className?: string;
}

export function RadiusToggle({ value, onChange, className }: RadiusToggleProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">
        Radius
      </span>
      <div className="flex bg-muted/40 border border-border rounded-full p-0.5">
        {RADIUS_OPTIONS.map((mi) => {
          const active = mi === value;
          return (
            <button
              key={mi}
              type="button"
              onClick={() => onChange(mi)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all',
                active
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {mi}mi
            </button>
          );
        })}
      </div>
    </div>
  );
}
