import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Megaphone, Zap, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TickerSlide {
  id: string;
  type: 'message' | 'stat' | 'sponsor';
  text: string;
  icon: LucideIcon;
  link?: string;
  sponsorName?: string;
}

interface PrizePoolData {
  category: string;
  total_pool_cents: number;
  participant_count: number;
}

interface ArenaTickerProps {
  prizePools: PrizePoolData[];
  isBarber: boolean;
  onNavigate: (path: string) => void;
}

const INTERVAL_MS = 5000;

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);

export const ArenaTicker = ({ prizePools, isBarber, onNavigate }: ArenaTickerProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slides = useMemo<TickerSlide[]>(() => {
    const totalPool = prizePools.reduce((s, p) => s + p.total_pool_cents, 0);
    const totalBarbers = prizePools.reduce((s, p) => s + p.participant_count, 0);

    return [
      {
        id: 'top-arenas',
        type: 'message',
        text: 'Top Arenas — See who\'s dominating right now',
        icon: Trophy,
        link: '/portal',
      },
      {
        id: 'battle-sunday',
        type: 'message',
        text: 'Battle Sunday is coming — Register your faction now',
        icon: Zap,
        link: '/portal',
      },
      {
        id: 'prize-pools',
        type: 'stat',
        text: `${formatCurrency(totalPool)}+ in prize pools across 5 arenas`,
        icon: Flame,
        link: '/portal',
      },
      {
        id: 'sponsor-wahl',
        type: 'sponsor',
        text: 'Powered by Wahl Pro — Official Clippers of the Arena',
        icon: Megaphone,
        sponsorName: 'Wahl Pro',
      },
      {
        id: 'trending-stat',
        type: 'stat',
        text: totalBarbers > 0
          ? `${totalBarbers} barbers competing across all categories`
          : 'Creative Color category is trending — join the wave',
        icon: Flame,
        link: '/portal',
      },
    ];
  }, [prizePools]);

  // Auto-rotate
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPaused, slides.length]);

  const currentSlide = slides[activeIndex];

  const handleClick = useCallback(() => {
    if (currentSlide.link) {
      onNavigate(currentSlide.link);
    }
  }, [currentSlide, onNavigate]);

  const Icon = currentSlide.icon;

  return (
    <div
      className="relative bg-black/40 backdrop-blur-sm border border-cyan/20 rounded-lg overflow-hidden cursor-pointer select-none mb-6"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={handleClick}
      role="marquee"
      aria-live="polite"
    >
      {/* Progress bar */}
      <motion.div
        key={activeIndex}
        className="absolute top-0 left-0 h-0.5 bg-cyan/60 rounded-full origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: INTERVAL_MS / 1000, ease: 'linear' }}
      />

      {/* Content */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 min-h-[40px]">
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 min-w-0"
            >
              <Icon
                className={
                  currentSlide.type === 'sponsor'
                    ? 'w-3.5 h-3.5 shrink-0 text-muted-foreground'
                    : 'w-3.5 h-3.5 shrink-0 text-cyan'
                }
              />
              <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                {currentSlide.text}
              </span>
              {currentSlide.type === 'sponsor' && (
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded shrink-0">
                  Sponsored
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right arrow */}
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1 pb-1.5">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex(i);
            }}
            className={`w-1 h-1 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? 'bg-cyan w-2.5'
                : 'bg-muted-foreground/40'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ArenaTicker;
