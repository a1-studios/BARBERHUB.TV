import { motion } from 'framer-motion';
import { Globe, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CountryLeaderCard } from './CountryLeaderCard';
import { useCountryLeaders } from '@/hooks/useCountryLeaders';
import { useToast } from '@/hooks/use-toast';

export const CountryLeaderboard = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const { data: countries, isLoading } = useCountryLeaders(12);
  const { toast } = useToast();

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 320;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
    setTimeout(checkScroll, 300);
  };

  const handleChallenge = (countryName: string) => {
    toast({
      title: `Challenge ${countryName}`,
      description: "Country matchmaking coming soon! Register for a category to get matched."
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="w-72 h-56 rounded-xl flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (!countries || countries.length === 0) {
    return (
      <div className="text-center py-8">
        <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No country leaders yet</p>
        <p className="text-sm text-muted-foreground">Be the first to represent your nation!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-3"
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <Globe className="w-7 h-7 text-cyan-400" />
        </motion.div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Country Leaders
        </h2>
        <Trophy className="w-5 h-5 text-yellow-500" />
      </motion.div>

      <p className="text-center text-sm text-muted-foreground -mt-2">
        Top barbers representing their nations in the 2026 Global Championship
      </p>

      {/* Scrollable Container */}
      <div className="relative">
        {/* Navigation Arrows */}
        {canScrollLeft && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg hover:bg-background"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}

        {canScrollRight && countries.length > 3 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg hover:bg-background"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}

        {/* Cards Container */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-1 py-2 -mx-1"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {countries.map((country, index) => (
            <div
              key={country.country_code}
              className="flex-shrink-0 w-72"
              style={{ scrollSnapAlign: 'start' }}
            >
              <CountryLeaderCard
                countryCode={country.country_code}
                countryName={country.country_name}
                leaders={country.leaders}
                totalPoints={country.total_points}
                barberCount={country.barber_count}
                onChallenge={() => handleChallenge(country.country_name)}
                index={index}
              />
            </div>
          ))}
        </div>

        {/* Gradient Fade Edges */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>

      {/* Stats Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center gap-6 text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-1">
          <Globe className="w-4 h-4" />
          <span>{countries.length} countries</span>
        </div>
        <div className="flex items-center gap-1">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span>
            {countries.reduce((sum, c) => sum + c.total_points, 0).toLocaleString()} total points
          </span>
        </div>
      </motion.div>
    </div>
  );
};
