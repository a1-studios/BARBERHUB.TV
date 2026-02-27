import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'verify', icon: '✂️', label: 'Verify' },
  { key: 'credentials', icon: '👤', label: 'Info' },
  { key: 'barber-info', icon: '📱', label: 'Phone' },
  { key: 'instagram', icon: '📸', label: 'Follow' },
  { key: 'claim-flag', icon: '🏳', label: 'Flag' },
  { key: 'choose-tier', icon: '👑', label: 'Tier' },
  { key: 'choose-categories', icon: '⚔️', label: 'Battle' },
];

interface ArenaGateProgressIndicatorProps {
  currentStep: string;
}

export const ArenaGateProgressIndicator = ({ currentStep }: ArenaGateProgressIndicatorProps) => {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep);
  
  return (
    <div className="flex justify-between items-center px-2 py-3">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300",
            i < currentIndex ? "bg-green-500/20 text-green-400 scale-90" :
            i === currentIndex ? "bg-primary text-primary-foreground scale-110 shadow-[0_0_15px_hsl(var(--primary)/0.5)]" :
            "bg-muted/50 text-muted-foreground scale-90"
          )}>
            {step.icon}
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn(
              "w-4 md:w-6 h-0.5 mx-0.5 transition-colors duration-300",
              i < currentIndex ? "bg-green-500/50" : "bg-muted/30"
            )} />
          )}
        </div>
      ))}
    </div>
  );
};
