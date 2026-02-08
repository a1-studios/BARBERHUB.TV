import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ScratchReveal from './ScratchReveal';
import ColorfulText from './ColorfulText';
import SponsoredBadge from './SponsoredBadge';

interface SponsorSlide {
  id: string;
  name: string;
  message: string;
  highlightEnd: number; // char index where bold portion ends
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
  | { type: 'sponsor'; id: string; name: string; message: string; highlightEnd: number; icon: LucideIcon; link?: string };

const INTERVAL_MS = 5000;
const COUNTER_DURATION_MS = 1500;

const SPONSORS: SponsorSlide[] = [
  { id: 'slot1', name: 'Premium', message: 'YOUR BRAND HERE — Premium Sponsor Slot', highlightEnd: 15, icon: Sparkles },
  { id: 'slot2', name: 'Spotlight', message: 'SPONSOR SPOTLIGHT — Be the Face of the Arena', highlightEnd: 17, icon: Sparkles },
  { id: 'slot3', name: 'Partner', message: 'FEATURED PARTNER — Reach Thousands of Barbers', highlightEnd: 16, icon: Sparkles },
  { id: 'slot4', name: 'Available', message: 'AD SPACE AVAILABLE — Join the Movement', highlightEnd: 18, icon: Sparkles },
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
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [activeIndex, totalPool, displaySlides]);

  useEffect(() => {
    if (hasAnimated.current) setDisplayValue(totalPool);
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
      className="relative overflow-hidden cursor-pointer select-none mb-3"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={handleClick}
      role="marquee"
      aria-live="polite"
    >
      {/* Scratch-off overlay */}
      <ScratchReveal
        activeIndex={activeIndex}
        variant={currentSlide.type === 'prize-pool' ? 'gold' : 'silver'}
      />

      {/* Content */}
      <div className="flex items-center justify-center px-4 sm:px-6 py-5 min-h-[72px]">
        <AnimatePresence mode="wait">
          {currentSlide.type === 'prize-pool' ? (
            <motion.div
              key={currentSlide.id}
              initial={{ opacity: 0, filter: 'blur(8px)', y: 10 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -15 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex items-center justify-center gap-3"
            >
              <motion.div
                key={`trophy-${activeIndex}`}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                <Trophy className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 text-primary drop-shadow-[0_0_10px_hsl(var(--primary))]" />
              </motion.div>
              <motion.span
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="text-xl sm:text-2xl lg:text-3xl font-black bg-gradient-to-r from-primary via-foreground to-cyan bg-clip-text text-transparent"
              >
                {formatCurrency(displayValue)}+
              </motion.span>
              <span className="text-xs sm:text-sm uppercase tracking-widest text-primary/70 font-bold shrink-0">
                In Prizes
              </span>
            </motion.div>
          ) : (
            <motion.div
              key={currentSlide.id}
              initial={{ opacity: 0, filter: 'blur(8px)', y: 10 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -15 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex items-center justify-center gap-3 flex-wrap"
            >
              <Sparkles className="w-5 h-5 shrink-0 text-primary drop-shadow-[0_0_6px_hsl(var(--primary))]" />
              <ColorfulText
                text={currentSlide.message}
                highlightEnd={currentSlide.highlightEnd}
                className="text-sm sm:text-base lg:text-lg"
              />
              <SponsoredBadge />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom progress shimmer */}
      <motion.div
        key={`progress-${activeIndex}`}
        className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan/40 via-primary/60 to-cyan/40 origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: INTERVAL_MS / 1000, ease: 'linear' }}
      />

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1 pb-1">
        {displaySlides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex(i);
            }}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? slide.type === 'prize-pool'
                  ? 'bg-primary w-5'
                  : 'bg-cyan w-5'
                : slide.type === 'prize-pool'
                  ? 'bg-primary/30'
                  : 'bg-cyan/30'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ArenaTicker;
