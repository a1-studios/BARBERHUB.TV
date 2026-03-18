import { SPECIALTY_TAGS, MAX_SPECIALTIES, parseSpecialties, serializeSpecialties } from '@/config/specialtyTags';
import { cn } from '@/lib/utils';

interface SpecialtyPillSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SpecialtyPillSelector({ value, onChange, className }: SpecialtyPillSelectorProps) {
  const selected = parseSpecialties(value);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(serializeSpecialties(selected.filter(s => s !== id)));
    } else if (selected.length < MAX_SPECIALTIES) {
      onChange(serializeSpecialties([...selected, id]));
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2">
        {SPECIALTY_TAGS.map((tag) => {
          const isActive = selected.includes(tag.id);
          const isDisabled = !isActive && selected.length >= MAX_SPECIALTIES;

          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => !isDisabled && toggle(tag.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                isActive && 'bg-primary/20 border-primary/50 text-primary shadow-sm',
                !isActive && !isDisabled && 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/30',
                isDisabled && 'opacity-40 cursor-not-allowed bg-muted/30 border-border/50 text-muted-foreground',
              )}
            >
              <span>{tag.emoji}</span>
              <span>{tag.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {selected.length}/{MAX_SPECIALTIES} selected
      </p>
    </div>
  );
}
