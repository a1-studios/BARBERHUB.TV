import { useState } from 'react';
import { Flag } from 'lucide-react';
import { ReportDialog, type ReportTarget } from './ReportDialog';
import { cn } from '@/lib/utils';

interface Props {
  targetType: ReportTarget;
  targetId: string;
  className?: string;
  variant?: 'icon' | 'pill';
  label?: string;
}

export function ReportButton({ targetType, targetId, className, variant = 'icon', label = 'Report' }: Props) {
  const [open, setOpen] = useState(false);

  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-full transition-all hover:bg-cyan-500/10 hover:text-cyan-200 hover:ring-1 hover:ring-cyan-500/40';
  const sizing = variant === 'icon' ? 'w-9 h-9 text-white/70' : 'h-8 px-3 text-xs font-bold uppercase tracking-wide text-white/80';

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        aria-label={label}
        title={label}
        className={cn(base, sizing, className)}
      >
        <Flag className="w-4 h-4" />
        {variant === 'pill' && <span>{label}</span>}
      </button>
      <ReportDialog open={open} onOpenChange={setOpen} targetType={targetType} targetId={targetId} />
    </>
  );
}
