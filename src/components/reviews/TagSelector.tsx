import { ReviewTag } from '@/config/reviewTags';
import { cn } from '@/lib/utils';

interface TagSelectorProps {
  tags: ReviewTag[];
  selected: string[];
  onToggle: (slug: string) => void;
  className?: string;
}

export function TagSelector({ tags, selected, onToggle, className }: TagSelectorProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tags.map((tag) => {
        const isActive = selected.includes(tag.slug);
        return (
          <button
            key={tag.slug}
            type="button"
            onClick={() => onToggle(tag.slug)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
              isActive && !tag.is_negative && 'bg-primary/20 border-primary/50 text-primary shadow-sm',
              isActive && tag.is_negative && 'bg-destructive/20 border-destructive/50 text-destructive shadow-sm',
              !isActive && 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/30'
            )}
          >
            <span>{tag.emoji}</span>
            <span>{tag.label}</span>
          </button>
        );
      })}
    </div>
  );
}
