import { Sparkles } from 'lucide-react';
import { xpForLevel } from '../lib/queries';

interface Props {
  xpTotal: number;
  xpLevel: number;
}

export const XpProgressBar = ({ xpTotal, xpLevel }: Props) => {
  const currentLevelFloor = xpForLevel(xpLevel - 1);
  const nextThreshold = xpForLevel(xpLevel);
  const span = Math.max(1, nextThreshold - currentLevelFloor);
  const within = Math.max(0, Math.min(span, xpTotal - currentLevelFloor));
  const pct = Math.round((within / span) * 100);

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#1DC4A0]/15 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[#1DC4A0]" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Level</p>
            <p className="text-sm font-bold text-foreground">Lv. {xpLevel}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">XP</p>
          <p className="text-sm font-bold text-[#1DC4A0]">
            {xpTotal.toLocaleString()} <span className="text-muted-foreground font-normal">/ {nextThreshold.toLocaleString()}</span>
          </p>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#1DC4A0] to-[#FF6B1A] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        {Math.max(0, nextThreshold - xpTotal).toLocaleString()} XP to next unlock
      </p>
    </div>
  );
};
