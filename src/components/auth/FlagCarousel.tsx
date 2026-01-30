import { useRef, useEffect } from 'react';
import { motion, useMotionValue, animate, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';

// Popular countries for carousel display
const CAROUSEL_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'BR', name: 'Brazil' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'GH', name: 'Ghana' },
  { code: 'KE', name: 'Kenya' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'IN', name: 'India' },
  { code: 'MX', name: 'Mexico' },
  { code: 'CO', name: 'Colombia' },
  { code: 'AR', name: 'Argentina' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'PH', name: 'Philippines' },
  { code: 'AE', name: 'United Arab Emirates' },
];

interface FlagCarouselProps {
  selectedCountry: string | null;
  onSelect: (code: string) => void;
}

const getCountryFlag = (countryCode: string) => {
  return String.fromCodePoint(
    ...countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0))
  );
};

const FLAG_WIDTH = 80;
const FLAG_GAP = 16;
const ITEM_WIDTH = FLAG_WIDTH + FLAG_GAP;

export const FlagCarousel = ({ selectedCountry, onSelect }: FlagCarouselProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const isDragging = useRef(false);

  // Center the selected flag
  useEffect(() => {
    if (selectedCountry && containerRef.current) {
      const index = CAROUSEL_COUNTRIES.findIndex(c => c.code === selectedCountry);
      if (index !== -1) {
        const containerWidth = containerRef.current.offsetWidth;
        const targetX = -(index * ITEM_WIDTH) + containerWidth / 2 - FLAG_WIDTH / 2;
        animate(x, targetX, { type: 'spring', stiffness: 300, damping: 30 });
      }
    }
  }, [selectedCountry, x]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const currentX = x.get();
    
    // Find nearest flag to center
    const centerOffset = containerWidth / 2 - FLAG_WIDTH / 2;
    const nearestIndex = Math.round((-currentX + centerOffset) / ITEM_WIDTH);
    const clampedIndex = Math.max(0, Math.min(CAROUSEL_COUNTRIES.length - 1, nearestIndex));
    
    // Snap to that flag
    const targetX = -(clampedIndex * ITEM_WIDTH) + centerOffset;
    animate(x, targetX, { type: 'spring', stiffness: 300, damping: 30 });
    
    // Select if tap (minimal drag)
    if (Math.abs(info.offset.x) < 5) {
      onSelect(CAROUSEL_COUNTRIES[clampedIndex].code);
    }

    setTimeout(() => {
      isDragging.current = false;
    }, 100);
  };

  const handleFlagClick = (code: string, index: number) => {
    if (isDragging.current) return;
    
    onSelect(code);
    
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const targetX = -(index * ITEM_WIDTH) + containerWidth / 2 - FLAG_WIDTH / 2;
      animate(x, targetX, { type: 'spring', stiffness: 300, damping: 30 });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full overflow-hidden py-8"
      style={{ perspective: '1000px' }}
    >
      {/* Spotlight effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-32 h-full bg-gradient-to-b from-cyan-500/20 via-cyan-500/5 to-transparent" />
      </div>

      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <motion.div
        className="flex items-center cursor-grab active:cursor-grabbing"
        style={{ x }}
        drag="x"
        dragConstraints={{
          left: -(CAROUSEL_COUNTRIES.length * ITEM_WIDTH - (containerRef.current?.offsetWidth || 300)),
          right: 0,
        }}
        dragElastic={0.1}
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={handleDragEnd}
      >
        {CAROUSEL_COUNTRIES.map((country, index) => {
          const isSelected = selectedCountry === country.code;
          
          return (
            <motion.button
              key={country.code}
              type="button"
              onClick={() => handleFlagClick(country.code, index)}
              className={cn(
                "flex-shrink-0 flex flex-col items-center justify-center transition-all duration-300",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
              )}
              style={{
                width: FLAG_WIDTH,
                marginRight: FLAG_GAP,
              }}
              animate={{
                scale: isSelected ? 1.25 : 0.85,
                opacity: isSelected ? 1 : 0.5,
              }}
              whileHover={{ scale: isSelected ? 1.3 : 0.95, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <div
                className={cn(
                  "text-5xl transition-all duration-300 rounded-lg p-2",
                  isSelected && "shadow-[0_0_30px_hsl(var(--primary)/0.6)] ring-2 ring-primary"
                )}
              >
                {getCountryFlag(country.code)}
              </div>
              <span className={cn(
                "text-xs mt-2 font-medium transition-opacity truncate max-w-[72px]",
                isSelected ? "opacity-100 text-primary" : "opacity-50"
              )}>
                {country.name}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Instructions */}
      <p className="text-center text-muted-foreground text-sm mt-4">
        ← Swipe to browse • Tap to select →
      </p>
    </div>
  );
};

export { CAROUSEL_COUNTRIES, getCountryFlag };
