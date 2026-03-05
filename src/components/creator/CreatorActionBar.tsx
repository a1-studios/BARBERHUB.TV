import { Upload, Swords, Flame, Briefcase, BarChart3 } from 'lucide-react';

interface CreatorActionBarProps {
  onUpload: () => void;
  onBattle: () => void;
  onChallenge: () => void;
  onDeals: () => void;
  onStats: () => void;
}

const ACTIONS = [
  { key: 'upload', label: 'Upload', icon: Upload, color: 'text-primary' },
  { key: 'battle', label: 'Battle', icon: Swords, color: 'text-yellow-400' },
  { key: 'challenge', label: 'Challenge', icon: Flame, color: 'text-red-400' },
  { key: 'deals', label: 'Deals', icon: Briefcase, color: 'text-green-400' },
  { key: 'stats', label: 'Stats', icon: BarChart3, color: 'text-blue-400' },
] as const;

export function CreatorActionBar({ onUpload, onBattle, onChallenge, onDeals, onStats }: CreatorActionBarProps) {
  const handlers: Record<string, () => void> = {
    upload: onUpload,
    battle: onBattle,
    challenge: onChallenge,
    deals: onDeals,
    stats: onStats,
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.key}
            onClick={handlers[action.key]}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-card/60 border border-border/30 backdrop-blur-sm text-xs font-bold tracking-wide hover:border-primary/40 hover:bg-card/80 active:scale-95 transition-all"
          >
            <Icon className={`w-3.5 h-3.5 ${action.color}`} />
            <span className="text-foreground">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
