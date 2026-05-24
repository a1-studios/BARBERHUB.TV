import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LiveNowCard } from './teasers/LiveNowCard';
import { TopBarbersCard } from './teasers/TopBarbersCard';
import { BookingCard } from './teasers/BookingCard';
import { ChallengesCard } from './teasers/ChallengesCard';
import { WatchFeedCard } from './teasers/WatchFeedCard';
import { useLandingData } from './teasers/useLandingData';

const ROTATE_MS = 4500;
const PAUSE_MS = 9000;

export const InsideTheHubStage = () => {
  const { stats, liveBattle, topBarbers, challenges, clips } = useLandingData();

  const liveBattles = stats?.live_battles ?? 0;
  const viewers = liveBattle?.viewers ?? stats?.fans_total ?? 0;
  const featuredBarber = topBarbers[0] ?? null;

  const slides = [
    { key: 'live',       node: <LiveNowCard liveBattles={liveBattles} viewers={viewers} battle={liveBattle} /> },
    { key: 'top',        node: <TopBarbersCard barbers={topBarbers} /> },
    { key: 'book',       node: <BookingCard featuredBarber={featuredBarber} /> },
    { key: 'challenges', node: <ChallengesCard challenges={challenges} /> },
    { key: 'watch',      node: <WatchFeedCard clips={clips} /> },
  ];

  const [idx, setIdx] = useState(0);
  const [pausedUntil, setPausedUntil] = useState(0);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (Date.now() < pausedUntil) return;
      setIdx((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [pausedUntil, slides.length]);

  const jump = (i: number) => {
    setIdx(((i % slides.length) + slides.length) % slides.length);
    setPausedUntil(Date.now() + PAUSE_MS);
  };

  const onTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 40) jump(idx + (dx < 0 ? 1 : -1));
    touchStart.current = null;
  };

  return (
    <div
      className="relative h-full w-full flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={() => setPausedUntil(Date.now() + PAUSE_MS)}
    >
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={slides[idx].key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            {slides[idx].node}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex-none mt-2 flex justify-center gap-1.5">
        {slides.map((s, i) => (
          <button
            key={s.key}
            onClick={(e) => { e.stopPropagation(); jump(i); }}
            aria-label={`Show ${s.key}`}
            className="relative h-1 rounded-full overflow-hidden"
            style={{ width: i === idx ? 24 : 6, background: i === idx ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)' }}
          >
            {i === idx && (
              <motion.div
                key={`fill-${idx}-${pausedUntil}`}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: ROTATE_MS / 1000, ease: 'linear' }}
                className="absolute inset-y-0 left-0 bg-orange-500"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default InsideTheHubStage;
