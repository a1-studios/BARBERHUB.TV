import { Play } from 'lucide-react';
import { useLandingData } from './useLandingData';

const FALLBACK_TINTS = [
  'from-orange-600 via-rose-700 to-purple-900',
  'from-cyan-600 via-blue-800 to-indigo-900',
  'from-yellow-500 via-orange-700 to-rose-900',
  'from-fuchsia-600 via-purple-700 to-indigo-900',
  'from-emerald-600 via-teal-700 to-cyan-900',
  'from-amber-500 via-orange-700 to-rose-900',
];
const FALLBACK_EMOJI = ['✂️', '🪒', '🔥', '💈', '⚡', '👑'];

export const WatchFeedStrip = () => {
  const { clips } = useLandingData();
  const source = clips.length > 0
    ? clips.slice(0, 8)
    : Array.from({ length: 8 }, (_, i) => ({ thumbnail_url: null, title: `Clip ${i + 1}` }));
  const items = source.map((c: any, i) => ({ thumb: c.thumbnail_url ?? null, title: c.title ?? '—', tintIdx: i % 6 }));

  return (
    <div className="px-4 pb-1">
      <div className="flex items-center justify-between mb-1">
        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-full bg-orange-400/15 text-orange-300 border border-orange-400/40">
          <Play className="h-2.5 w-2.5" /> Watch Feed
        </span>
        <span className="text-[9px] text-white/50">24/7 · Endless cuts →</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mx-1 px-1 snap-x">
        {items.map((n, idx) => (
          <div
            key={idx}
            className="relative flex-none w-12 aspect-[9/16] rounded-md overflow-hidden border border-white/10 snap-start"
          >
            {n.thumb ? (
              <img src={n.thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${FALLBACK_TINTS[n.tintIdx]} flex items-center justify-center text-lg`}>
                {FALLBACK_EMOJI[n.tintIdx]}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute top-0.5 right-0.5 h-3 w-3 rounded-full bg-black/60 flex items-center justify-center">
              <Play className="h-1.5 w-1.5 text-white fill-white" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WatchFeedStrip;
