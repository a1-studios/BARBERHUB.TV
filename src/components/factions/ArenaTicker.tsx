import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Megaphone, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface SponsorSlide {
  id: string;
  name: string;
  message: string;
  icon: LucideIcon;
  link?: string;
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

type DisplaySlide =
  | { type: 'prize-pool'; id: string }
  | { type: 'sponsor'; id: string; name: string; message: string; icon: LucideIcon; link?: string };

const INTERVAL_MS = 5000;
const COUNTER_DURATION_MS = 1500;

const SPONSORS: SponsorSlide[] = [
  { id: 'wahl', name: 'Wahl Pro', message: 'Powered by Wahl Pro — Official Clippers of the Arena', icon: Megaphone },
  { id: 'andis', name: 'Andis', message: 'Andis — Precision Tools for Champions', icon: Megaphone },
  { id: 'babyliss', name: 'BabylissPRO', message: 'BabylissPRO — Power Behind the Fade', icon: Megaphone },
  { id: 'barberstrong', name: 'Barber Strong', message: 'Barber Strong — Built for the Arena', icon: Megaphone },
];

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
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimated = useRef(false);

  const totalPool = useMemo(
    () => prizePools.reduce((s, p) => s + p.total_pool_cents, 0),
    [prizePools],
  );

  // Build interleaved sequence: [prize, sponsor1, prize, sponsor2, ...]
  const displaySlides = useMemo<DisplaySlide[]>(
    () =>
      SPONSORS.flatMap((sponsor) => [
        { type: 'prize-pool' as const, id: `prize-before-${sponsor.id}` },
        { type: 'sponsor' as const, ...sponsor },
      ]),
    [],
  );

  // Animated counter on first prize-pool appearance
  useEffect(() => {
    if (hasAnimated.current || totalPool === 0) return;

    const current = displaySlides[activeIndex];
    if (current.type !== 'prize-pool') return;

    hasAnimated.current = true;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / COUNTER_DURATION_MS, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(totalPool * easeOut));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [activeIndex, totalPool, displaySlides]);

  // Keep displayValue in sync after initial animation
  useEffect(() => {
    if (hasAnimated.current) {
      setDisplayValue(totalPool);
    }
  }, [totalPool]);

  // Auto-rotate
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % displaySlides.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPaused, displaySlides.length]);

  const currentSlide = displaySlides[activeIndex];

  const handleClick = useCallback(() => {
    if (currentSlide.type === 'prize-pool') {
      onNavigate('/portal');
    } else if (currentSlide.link) {
      onNavigate(currentSlide.link);
    }
  }, [currentSlide, onNavigate]);

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
        className="absolute top-0 left-0 h-1 bg-gradient-to-r from-cyan/60 via-cyan to-primary/60 rounded-full origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: INTERVAL_MS / 1000, ease: 'linear' }}
      />

      {/* Content */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 min-h-[48px]">
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {currentSlide.type === 'prize-pool' ? (
              <motion.div
                key={currentSlide.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 min-w-0"
              >
                <Trophy className="w-5 h-5 shrink-0 text-cyan drop-shadow-[0_0_6px_hsl(var(--cyan))]" />
                <span className="text-base sm:text-lg lg:text-xl font-extrabold bg-gradient-to-r from-cyan via-foreground to-primary bg-clip-text text-transparent truncate">
                  {formatCurrency(displayValue)}+
                </span>
                <span className="text-[10px] sm:text-xs uppercase tracking-widest text-cyan/70 font-semibold shrink-0">
                  In Prizes
                </span>
              </motion.div>
            ) : (
              <motion.div
                key={currentSlide.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 min-w-0"
              >
                <currentSlide.icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                  {currentSlide.message}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded shrink-0">
                  Sponsored
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right arrow */}
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1 pb-1.5">
        {displaySlides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex(i);
            }}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? slide.type === 'prize-pool'
                  ? 'bg-cyan w-4'
                  : 'bg-muted-foreground w-4'
                : slide.type === 'prize-pool'
                  ? 'bg-cyan/30'
                  : 'bg-muted-foreground/30'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ArenaTicker;
