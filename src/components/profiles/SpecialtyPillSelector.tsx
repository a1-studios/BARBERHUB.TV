import { useState } from 'react';
import { SPECIALTY_TAGS, MAX_SPECIALTIES, parseSpecialties, serializeSpecialties, getSpecialtyDisplay } from '@/config/specialtyTags';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

interface SpecialtyPillSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  compact?: boolean;
}

export function SpecialtyPillSelector({ value, onChange, className, compact }: SpecialtyPillSelectorProps) {
  const selected = parseSpecialties(value);
  const [dialogOpen, setDialogOpen] = useState(false);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(serializeSpecialties(selected.filter(s => s !== id)));
    } else if (selected.length < MAX_SPECIALTIES) {
      onChange(serializeSpecialties([...selected, id]));
    }
  };

  if (compact) {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex flex-wrap items-center gap-2">
          {selected.length === 0 && (
            <span className="text-xs text-muted-foreground">No specialties selected</span>
          )}
          {selected.map((id) => {
            const tag = getSpecialtyDisplay(id);
            if (!tag) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/20 border border-primary/50 text-primary"
              >
                <span>{tag.emoji}</span>
                <span>{tag.label}</span>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {selected.length}/{MAX_SPECIALTIES} selected
        </p>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Select Specialties</DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap gap-2 pt-2">
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
            <p className="text-[10px] text-muted-foreground mt-2">
              {selected.length}/{MAX_SPECIALTIES} selected
            </p>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

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
