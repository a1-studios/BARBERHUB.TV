import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import ScratchReveal from './ScratchReveal';
import SponsoredBadge from './SponsoredBadge';
import { useSponsorAds } from '@/hooks/useSponsorAds';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';

interface SponsorSlide {
  id: string;
  name: string;
  message: string;
  highlightEnd: number;
  logoUrl?: string;
  link?: string;
  productImageUrl?: string;
  productImageUrl2?: string;
  promoText?: string;
  productLink?: string;
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
  | { type: 'prize-pool'; id: string; sponsorAdId?: string }
  | { type: 'sponsor-image'; id: string; logoUrl?: string; name: string; link?: string; sponsorAdId: string; productImageUrl?: string; productImageUrl2?: string; promoText?: string; productLink?: string; message: string }
  | { type: 'sponsor-text'; id: string; name: string; message: string; link?: string; sponsorAdId: string };

const INTERVAL_MS = 5000;

const FALLBACK_SPONSORS: SponsorSlide[] = [
  { id: 'slot1', name: 'Premium', message: 'YOUR BRAND HERE — Premium Sponsor Slot', highlightEnd: 15 },
  { id: 'slot2', name: 'Spotlight', message: 'SPONSOR SPOTLIGHT — Be the Face of the Arena', highlightEnd: 17 },
  { id: 'slot3', name: 'Partner', message: 'FEATURED PARTNER — Reach Thousands of Barbers', highlightEnd: 16 },
  { id: 'slot4', name: 'Available', message: 'AD SPACE AVAILABLE — Join the Movement', highlightEnd: 18 },
];

export const ArenaTicker = ({ prizePools, isBarber, onNavigate }: ArenaTickerProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { user } = useAuth();
  const isMobile = useIsMobile();

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
        productImageUrl: s.product_image_url ?? undefined,
        productImageUrl2: s.product_image_url_2 ?? undefined,
        promoText: s.promo_text ?? undefined,
        productLink: s.product_link ?? undefined,
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
        { type: 'sponsor-image' as const, id: `img-${sponsor.id}`, logoUrl: sponsor.logoUrl, name: sponsor.name, link: sponsor.link, sponsorAdId: sponsor.id, productImageUrl: sponsor.productImageUrl, productImageUrl2: sponsor.productImageUrl2, promoText: sponsor.promoText, productLink: sponsor.productLink, message: sponsor.message },
        { type: 'sponsor-text' as const, id: `txt-${sponsor.id}`, name: sponsor.name, message: sponsor.message, link: sponsor.link, sponsorAdId: sponsor.id },
      ]),
    [sponsors],
  );

  const bbValue = useMemo(() => Math.round((totalPool / 100) * 5), [totalPool]);
  const spring = useSpring(0, { stiffness: 40, damping: 20 });
  const displayBB = useTransform(spring, (val) => Math.floor(val).toLocaleString());

  useEffect(() => {
    spring.set(bbValue);
  }, [bbValue, spring]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % displaySlides.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPaused, displaySlides.length]);

  const currentSlide = displaySlides[activeIndex] ?? displaySlides[0];

  const handleClick = useCallback(async () => {
    if (!currentSlide) return;
    if (currentSlide.type === 'prize-pool') {
      onNavigate('/portal');
      return;
    }

    if ('sponsorAdId' in currentSlide && currentSlide.sponsorAdId) {
      (supabase.from('sponsor_ad_clicks' as any) as any).insert({
        sponsor_ad_id: currentSlide.sponsorAdId,
        user_id: user?.id ?? null,
        click_type: 'click',
        slide_type: currentSlide.type,
      }).then(() => {});
    }

    const link = 'link' in currentSlide ? currentSlide.link : undefined;
    if (link) {
      if (link.startsWith('http')) {
        window.open(link, '_blank', 'noopener,noreferrer');
      } else {
        onNavigate(link);
      }
    }
  }, [currentSlide, onNavigate, user?.id]);

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
      <ScratchReveal
        activeIndex={activeIndex}
        variant={currentSlide.type === 'prize-pool' ? 'gold' : 'silver'}
      />

      <div className="flex items-center justify-center px-4 sm:px-6 py-5 min-h-[120px]">
        <AnimatePresence mode="wait">
          {currentSlide.type === 'prize-pool' ? (
            <PrizePoolSlide key={currentSlide.id} totalPool={totalPool} displayBB={displayBB} />
          ) : currentSlide.type === 'sponsor-image' ? (
            <SponsorImageSlide key={currentSlide.id} slide={currentSlide} isMobile={isMobile} />
          ) : (
            <SponsorTextSlide key={currentSlide.id} slide={currentSlide} />
          )}
        </AnimatePresence>
      </div>

      {currentSlide.type !== 'prize-pool' && (
        <div className="absolute bottom-1.5 right-2 z-10">
          <SponsoredBadge />
        </div>
      )}
    </div>
  );
};

/* ---------- Sub-components ---------- */

function PrizePoolSlide({ totalPool, displayBB }: { totalPool: number; displayBB: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(8px)', y: 10 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      exit={{ opacity: 0, scale: 1.1, y: -15 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="flex flex-col items-center justify-center"
    >
      <motion.div
        key={totalPool}
        animate={{ scale: [1, 1.08, 1], filter: ['brightness(1)', 'brightness(1.4)', 'brightness(1)'] }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <span className="text-3xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-primary via-foreground to-cyan bg-clip-text text-transparent drop-shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
          <motion.span>{displayBB}</motion.span> BB
        </span>
      </motion.div>
      <span className="text-xs sm:text-sm uppercase tracking-widest text-primary/70 font-bold mt-1">
        In Prizes
      </span>
    </motion.div>
  );
}

function SponsorImageSlide({ slide, isMobile }: { slide: Extract<DisplaySlide, { type: 'sponsor-image' }>; isMobile: boolean }) {
  const hasProducts = slide.productImageUrl || slide.productImageUrl2;

  if (isMobile && hasProducts) {
    return <MobileSponsorCarousel slide={slide} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(8px)', y: 10 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      exit={{ opacity: 0, scale: 1.1, y: -15 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="grid grid-cols-4 items-center w-full gap-2"
    >
      {/* 25% — Product 1 */}
      <div className="col-span-1 flex items-center justify-center">
        {slide.productImageUrl ? (
          <img
            src={slide.productImageUrl}
            alt="Product"
            className="h-16 sm:h-20 max-w-full object-contain rounded-md"
          />
        ) : (
          <div className="h-16 sm:h-20 w-full" />
        )}
      </div>

      {/* 50% — Logo + Brand + Message */}
      <div className="col-span-2 flex flex-col items-center justify-center gap-1">
        {slide.logoUrl ? (
          <motion.img
            src={slide.logoUrl}
            alt={slide.name}
            className="h-12 sm:h-14 max-w-[180px] object-contain rounded-md shrink-0"
            initial={{ filter: 'blur(8px)', opacity: 0 }}
            animate={{ filter: 'blur(0px)', opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          />
        ) : (
          <Sparkles className="w-8 h-8 shrink-0 text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" />
        )}
        <span className="text-sm sm:text-base font-black text-foreground tracking-wide text-center uppercase leading-tight">
          {slide.name}
        </span>
        <span className="text-[10px] sm:text-xs text-muted-foreground text-center leading-snug line-clamp-1">
          {slide.message}
        </span>
      </div>

      {/* 25% — Product 2 + Promo Badge */}
      <div className="col-span-1 flex items-center justify-center relative">
        {slide.productImageUrl2 ? (
          <>
            <img
              src={slide.productImageUrl2}
              alt="Product"
              className="h-16 sm:h-20 max-w-full object-contain rounded-md"
            />
            <span className="absolute -top-1 -right-0.5 text-[8px] sm:text-[9px] font-black bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap shadow-md">
              {slide.promoText || '15% off with BB'}
            </span>
          </>
        ) : (
          <div className="h-16 sm:h-20 w-full" />
        )}
      </div>
    </motion.div>
  );
}

function MobileSponsorCarousel({ slide }: { slide: Extract<DisplaySlide, { type: 'sponsor-image' }> }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, startIndex: 1 });
  const [selectedIndex, setSelectedIndex] = useState(1);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  const slides = useMemo(() => {
    const items: { type: 'product1' | 'center' | 'product2' }[] = [];
    if (slide.productImageUrl) items.push({ type: 'product1' });
    items.push({ type: 'center' });
    if (slide.productImageUrl2) items.push({ type: 'product2' });
    return items;
  }, [slide.productImageUrl, slide.productImageUrl2]);

  const centerIdx = slides.findIndex(s => s.type === 'center');

  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(8px)', y: 10 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      exit={{ opacity: 0, scale: 1.1, y: -15 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="w-full"
    >
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((s, i) => (
            <div key={i} className="flex-[0_0_100%] min-w-0 flex items-center justify-center px-2">
              {s.type === 'product1' && slide.productImageUrl && (
                <img src={slide.productImageUrl} alt="Product 1" className="h-20 max-w-[200px] object-contain rounded-md" />
              )}
              {s.type === 'center' && (
                <div className="flex flex-col items-center gap-1">
                  {slide.logoUrl ? (
                    <img src={slide.logoUrl} alt={slide.name} className="h-12 max-w-[160px] object-contain rounded-md" />
                  ) : (
                    <Sparkles className="w-8 h-8 text-primary" />
                  )}
                  <span className="text-base font-black text-foreground uppercase">{slide.name}</span>
                  <span className="text-[10px] text-muted-foreground text-center line-clamp-1">{slide.message}</span>
                </div>
              )}
              {s.type === 'product2' && slide.productImageUrl2 && (
                <div className="relative">
                  <img src={slide.productImageUrl2} alt="Product 2" className="h-20 max-w-[200px] object-contain rounded-md" />
                  <span className="absolute -top-1 right-0 text-[8px] font-black bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap shadow-md">
                    {slide.promoText || '15% off with BB'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === selectedIndex ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              onClick={(e) => { e.stopPropagation(); emblaApi?.scrollTo(i); }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function SponsorTextSlide({ slide }: { slide: Extract<DisplaySlide, { type: 'sponsor-text' }> }) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(8px)', y: 10 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      exit={{ opacity: 0, scale: 1.1, y: -15 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="flex flex-col items-center justify-center gap-1 w-full"
    >
      <span className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-wide text-center uppercase leading-tight">
        {slide.name}
      </span>
      <span className="text-xs sm:text-sm text-muted-foreground text-center leading-snug">
        {slide.message}
      </span>
    </motion.div>
  );
}

export default ArenaTicker;
