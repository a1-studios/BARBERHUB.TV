import { memo } from 'react';
import { Check, Circle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ReadinessBadgeProps {
  variant: 'ready' | 'not-ready' | 'preview' | 'live';
  className?: string;
}

export const ReadinessBadge = memo(function ReadinessBadge({ 
  variant, 
  className 
}: ReadinessBadgeProps) {
  const variants = {
    'ready': {
      bg: 'bg-green-500/90',
      text: 'text-white',
      icon: Check,
      label: 'READY',
    },
    'not-ready': {
      bg: 'bg-muted/80',
      text: 'text-muted-foreground',
      icon: Circle,
      label: 'NOT READY',
    },
    'preview': {
      bg: 'bg-amber-500/90',
      text: 'text-white',
      icon: Eye,
      label: 'PREVIEW',
    },
    'live': {
      bg: 'bg-destructive',
      text: 'text-destructive-foreground',
      icon: Circle,
      label: 'LIVE',
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={variant}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm",
          config.bg,
          config.text,
          className
        )}
      >
        <Icon className={cn(
          "w-3 h-3",
          variant === 'live' && "animate-pulse fill-current",
          variant === 'ready' && "stroke-[3]"
        )} />
        <span>{config.label}</span>
      </motion.div>
    </AnimatePresence>
  );
});
