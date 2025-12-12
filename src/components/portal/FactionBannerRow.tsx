import { useRef } from 'react';
import { motion } from 'framer-motion';
import { TOURNAMENT_CATEGORIES } from '@/config/categories';
import { FactionBannerCard } from './FactionBannerCard';
import { useCategoryPrizePools } from '@/hooks/useCategoryPrizePools';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface FactionBannerRowProps {
  onSelectCategory: (categoryId: string) => void;
  selectedCategory?: string;
}

export const FactionBannerRow = ({
  onSelectCategory,
  selectedCategory
}: FactionBannerRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { prizePools, isLoading, totalPrizePool } = useCategoryPrizePools();

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 240;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Skeleton className="h-8 w-64 mx-auto mb-2" />
          <Skeleton className="h-12 w-48 mx-auto" />
        </div>
        <div className="flex gap-4 justify-center">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="w-48 h-72 rounded-b-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Choose Your Faction
        </h2>
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          <span className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-orange-400 to-primary bg-clip-text text-transparent">
            {formatCurrency(totalPrizePool)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Total Prize Pool Across All Categories
        </p>
      </motion.div>

      {/* Scroll Controls + Banners */}
      <div className="relative">
        {/* Left Arrow */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur-sm hidden md:flex"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        {/* Banners Container */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide px-4 py-8 justify-start md:justify-center snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {TOURNAMENT_CATEGORIES.map((category, index) => {
            const poolData = prizePools.find(p => p.category === category.id);
            return (
              <div key={category.id} className="snap-center flex-shrink-0">
                <FactionBannerCard
                  category={category}
                  prizePool={poolData?.total_pool_cents || 0}
                  participantCount={poolData?.participant_count || 0}
                  weeklyGrowth={0} // Could be calculated from historical data
                  onSelect={onSelectCategory}
                  isSelected={selectedCategory === category.id}
                  index={index}
                />
              </div>
            );
          })}
        </div>

        {/* Right Arrow */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur-sm hidden md:flex"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      {/* Mobile Swipe Hint */}
      <p className="text-center text-xs text-muted-foreground md:hidden">
        ← Swipe to explore factions →
      </p>
    </div>
  );
};

export default FactionBannerRow;
