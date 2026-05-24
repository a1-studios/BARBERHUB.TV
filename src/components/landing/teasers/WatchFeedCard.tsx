import { motion, AnimatePresence } from 'framer-motion';
import { Play, Heart, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCountUp } from './useCountUp';
import { ClipTease } from './useLandingData';

interface Props {
  clips: ClipTease[];
}

const FALLBACK_TINTS = [
  'from-orange-600 via-rose-700 to-purple-900',
  'from-cyan-600 via-blue-800 to-indigo-900',
  'from-yellow-500 via-orange-700 to-rose-900',
];
const FALLBACK_EMOJI = ['✂️', '🪒', '🔥'];
const FALLBACK_TITLES = ['Skin fade in 90s', 'Razor lineup', 'Freestyle design'];
const FALLBACK_AUTHORS = ['kairo', 'soren', 'rafa'];

export const WatchFeedCard = ({ clips }: Props) => {
  const useFallback = clips.length === 0;
  const len = useFallback ? 3 : Math.min(clips.length, 5);
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % len), 1800);
    return () => clearInterval(t);
  }, [len]);

  const likes = useCountUp(2400 + i * 137, 800, [i]);

  const clip = useFallback ? null : clips[i % len];
  const nextUp = useFallback
    ? [1, 2].map((o) => ({
        thumb: null as string | null,
        title: FALLBACK_TITLES[(i + o) % 3],
        tintIdx: (i + o) % 3,
      }))
    : [1, 2].map((o) => {
        const c = clips[(i + o) % len];
        return { thumb: c?.thumbnail_url ?? null, title: c?.title ?? '—', tintIdx: (i + o) % 3 };
      });

  return (
    <div className="relative h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-orange-400/15 text-orange-300 border border-orange-400/40">
          <Play className="h-3 w-3" /> Watch Feed
        </span>
        <span className="text-[10px] text-white/60">24/7 · Endless cuts</span>
      </div>

      <div className="relative flex-1 rounded-xl overflow-hidden border border-white/10 flex items-stretch gap-2 bg-black/40 p-2">
        {/* Phone */}
        <div className="relative h-full aspect-[9/16] rounded-lg overflow-hidden border border-white/15 flex-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0"
            >
              {clip?.thumbnail_url ? (
                <img src={clip.thumbnail_url} alt={clip.title ?? 'Clip'} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${FALLBACK_TINTS[i % 3]} flex items-center justify-center`}>
                  <motion.div
                    animate={{ scale: [1, 1.08, 1], rotate: [0, 4, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="text-7xl drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                  >
                    {FALLBACK_EMOJI[i % 3]}
                  </motion.div>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

              <div className="absolute right-2 bottom-12 flex flex-col items-center gap-3">
                <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.4, repeat: Infinity }} className="flex flex-col items-center">
                  <Heart className="h-5 w-5 text-rose-400 fill-rose-400 drop-shadow" />
                  <span className="text-[9px] text-white font-semibold">{(likes / 1000).toFixed(1)}k</span>
                </motion.div>
                <div className="flex flex-col items-center">
                  <Share2 className="h-5 w-5 text-white/90 drop-shadow" />
                  <span className="text-[9px] text-white font-semibold">{42 + i * 9}</span>
                </div>
              </div>

              <div className="absolute bottom-2 left-2 right-12">
                <div className="text-[11px] font-bold text-white truncate">
                  @{clip?.author ?? FALLBACK_AUTHORS[i % 3]}
                </div>
                <div className="text-[10px] text-white/80 truncate">{clip?.title ?? FALLBACK_TITLES[i % 3]}</div>
              </div>

              <div className="absolute top-2 left-2 right-2 flex gap-1">
                {Array.from({ length: len }).map((_, j) => (
                  <div key={j} className={`h-0.5 flex-1 rounded-full ${j === i ? 'bg-white' : 'bg-white/30'}`} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Up next side rail */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="text-[9px] uppercase tracking-wider text-white/50 font-semibold">Up next</div>
          {nextUp.map((n, idx) => (
            <motion.div
              key={`${i}-${idx}`}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + idx * 0.08 }}
              className="relative flex-1 rounded-md overflow-hidden border border-white/10"
            >
              {n.thumb ? (
                <img src={n.thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${FALLBACK_TINTS[n.tintIdx]} flex items-center justify-center text-2xl`}>
                  {FALLBACK_EMOJI[n.tintIdx]}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-1 left-1 right-1 text-[9px] text-white font-semibold truncate">
                {n.title}
              </div>
              <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-black/60 flex items-center justify-center">
                <Play className="h-2.5 w-2.5 text-white fill-white" />
              </div>
            </motion.div>
          ))}
          <div className="text-[9px] text-orange-300 font-semibold mt-auto">Swipe inside →</div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-white/70 font-medium">Endless cuts · Vertical feed</span>
        <span className="text-orange-300">Watch inside →</span>
      </div>
    </div>
  );
};
