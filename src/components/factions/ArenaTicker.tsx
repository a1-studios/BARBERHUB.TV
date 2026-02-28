import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles } from 'lucide-react';
import ScratchReveal from './ScratchReveal';
import SponsoredBadge from './SponsoredBadge';
import { useSponsorAds } from '@/hooks/useSponsorAds';

interface SponsorSlide {
  id: string;
  name: string;
  message: string;
  highlightEnd: number;
  logoUrl?: string;
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
  | { type: 'sponsor-image'; id: string; logoUrl?: string; name: string; link?: string }
  | { type: 'sponsor-text'; id: string; name: string; message: string; link?: string };

const INTERVAL_MS = 5000;
const COUNTER_DURATION_MS = 1500;

const FALLBACK_SPONSORS: SponsorSlide[] = [
  { id: 'slot1', name: 'Premium', message: 'YOUR BRAND HERE — Premium Sponsor Slot', highlightEnd: 15 },
  { id: 'slot2', name: 'Spotlight', message: 'SPONSOR SPOTLIGHT — Be the Face of the Arena', highlightEnd: 17 },
  { id: 'slot3', name: 'Partner', message: 'FEATURED PARTNER — Reach Thousands of Barbers', highlightEnd: 16 },
  { id: 'slot4', name: 'Available', message: 'AD SPACE AVAILABLE — Join the Movement', highlightEnd: 18 },
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

  const { data: dbSponsors = [] } = useSponsorAds(true);

  const sponsors = useMemo<SponsorSlide[]>(() => {
    if (dbSponsors.length > 0) {
      return dbSponsors.map((s) => ({
        id: s.id,
        name: s.name,
        message: s.message,
        highlightEnd: s.highlight_end,
        logoUrl: s.logo_url ?? undefined,
        link: s.link ?? undefined,
      }));
    }
    return FALLBACK_SPONSORS;
  }, [dbSponsors]);

  const totalPool = useMemo(
    () => prizePools.reduce((s, p) => s + p.total_pool_cents, 0),
    [prizePools],
  );

  const displaySlides = useMemo<DisplaySlide[]>(
    () =>
      sponsors.flatMap((sponsor) => [
        { type: 'prize-pool' as const, id: `prize-${sponsor.id}` },
        { type: 'sponsor-image' as const, id: `img-${sponsor.id}`, logoUrl: sponsor.logoUrl, name: sponsor.name, link: sponsor.link },
        { type: 'sponsor-text' as const, id: `txt-${sponsor.id}`, name: sponsor.name, message: sponsor.message, link: sponsor.link },
      ]),
    [sponsors],
  );

  // Animated counter on first prize-pool appearance
  useEffect(() => {
    if (hasAnimated.current || totalPool === 0) return;
    const current = displaySlides[activeIndex];
    if (!current || current.type !== 'prize-pool') return;

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

  const currentSlide = displaySlides[activeIndex] ?? displaySlides[0];

  const handleClick = useCallback(() => {
    if (!currentSlide) return;
    if (currentSlide.type === 'prize-pool') {
      onNavigate('/portal');
    } else if ('link' in currentSlide && currentSlide.link) {
      onNavigate(currentSlide.link);
    }
  }, [currentSlide, onNavigate]);

  if (!currentSlide) return null;

  return (
    <div
      className="relative overflow-hidden cursor-pointer select-none mb-3 border rounded-lg"
      style={{
        borderColor: 'hsl(var(--cyan) / 0.3)',
        boxShadow: '0 0 8px hsl(var(--cyan) / 0.25), inset 0 0 4px hsl(var(--cyan) / 0.1)',
      }}
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
      <div className="flex items-center justify-center px-4 sm:px-6 py-5 min-h-[120px]">
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
          ) : currentSlide.type === 'sponsor-image' ? (
            <motion.div
              key={currentSlide.id}
              initial={{ opacity: 0, filter: 'blur(8px)', y: 10 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -15 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex items-center justify-center"
            >
              {currentSlide.logoUrl ? (
                <motion.img
                  src={currentSlide.logoUrl}
                  alt={currentSlide.name}
                  className="h-20 sm:h-24 max-w-[220px] object-contain rounded-md shrink-0"
                  initial={{ filter: 'blur(8px)', opacity: 0 }}
                  animate={{ filter: 'blur(0px)', opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                />
              ) : (
                <Sparkles className="w-10 h-10 shrink-0 text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" />
              )}
            </motion.div>
          ) : (
            <motion.div
              key={currentSlide.id}
              initial={{ opacity: 0, filter: 'blur(8px)', y: 10 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -15 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex flex-col items-center justify-center gap-2"
            >
              <SponsoredBadge />
              <span className="text-base sm:text-lg font-black text-foreground tracking-wide text-center uppercase">
                {currentSlide.name}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground text-center">
                {currentSlide.message}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default ArenaTicker;
