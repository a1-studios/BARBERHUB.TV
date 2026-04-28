import { Upload, Swords, Flame, Briefcase, BarChart3, GraduationCap } from 'lucide-react';

interface CreatorActionBarProps {
  onUpload: () => void;
  onBattle: () => void;
  onChallenge: () => void;
  onDeals: () => void;
  onStats: () => void;
  onAcademy: () => void;
}

const ACTIONS = [
  { key: 'upload', label: 'Upload', subtitle: 'Videos & Tips', icon: Upload, color: 'text-primary' },
  { key: 'battle', label: 'Battle', subtitle: 'Create & Host', icon: Swords, color: 'text-yellow-400' },
  { key: 'challenge', label: 'Challenge', subtitle: '1v1 Arena', icon: Flame, color: 'text-red-400' },
  { key: 'deals', label: 'Deals', subtitle: 'Sponsor Board', icon: Briefcase, color: 'text-green-400' },
  { key: 'stats', label: 'Stats', subtitle: 'Your Analytics', icon: BarChart3, color: 'text-blue-400' },
  { key: 'academy', label: 'Academy', subtitle: 'Teach & Earn', icon: GraduationCap, color: 'text-primary' },
] as const;

export function CreatorActionBar({ onUpload, onBattle, onChallenge, onDeals, onStats, onAcademy }: CreatorActionBarProps) {
  const handlers: Record<string, () => void> = {
    upload: onUpload,
    battle: onBattle,
    challenge: onChallenge,
    deals: onDeals,
    stats: onStats,
    academy: onAcademy,
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.key}
            onClick={handlers[action.key]}
            className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-card/60 border border-border/30 backdrop-blur-sm hover:border-primary/40 hover:bg-card/80 active:scale-[0.97] transition-all"
          >
            <div className={`p-2 rounded-lg bg-background/60 ${action.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="block text-sm font-bold tracking-wide text-foreground">{action.label}</span>
              <span className="block text-[11px] text-muted-foreground leading-tight">{action.subtitle}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
