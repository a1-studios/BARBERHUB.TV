import { ReactNode } from 'react';
import { Lock } from 'lucide-react';

interface LockedTeaserProps {
  title: string;
  pillar: string;
  onUnlock: () => void;
  children: ReactNode;
  /** Approx height — lets us crop dense components into a teaser tile */
  heightClass?: string;
}

/**
 * Wraps an existing component as a "VIP only" teaser tile. The underlying
 * component renders as-is (read-only, pointer-events disabled) and a
 * translucent overlay surfaces a lock + CTA.
 */
export const LockedTeaser = ({
  title,
  pillar,
  onUnlock,
  children,
  heightClass = 'h-72',
}: LockedTeaserProps) => {
  return (
    <div className="group relative rounded-2xl border border-white/10 bg-[#0a0a0f] overflow-hidden">
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30">
          {pillar}
        </span>
      </div>

      <div className={`relative ${heightClass} overflow-hidden pointer-events-none select-none`}>
        <div className="absolute inset-0 [filter:blur(0.5px)_saturate(1.1)] opacity-90">
          {children}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/90" />
      </div>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-end p-4 sm:p-5">
        <div className="w-full text-center">
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/60 mb-2">
            <Lock className="h-3 w-3" /> VIP Only
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onUnlock}
            className="mt-3 inline-flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 transition px-4 py-1.5 text-xs font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.35)]"
          >
            Redeem invite to unlock
          </button>
        </div>
      </div>
    </div>
  );
};

export default LockedTeaser;
