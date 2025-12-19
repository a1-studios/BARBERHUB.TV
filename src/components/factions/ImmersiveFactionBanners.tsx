import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TOURNAMENT_CATEGORIES } from '@/config/categories';
import { useCategoryPrizePools } from '@/hooks/useCategoryPrizePools';
import { ImmersiveBannerCard } from './ImmersiveBannerCard';
import { AnimatedPrizeCounter } from './AnimatedPrizeCounter';
import { useNavigate } from 'react-router-dom';

export const ImmersiveFactionBanners = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { prizePools, isLoading, totalPrizePool } = useCategoryPrizePools();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [activeIndex, setActiveIndex] = useState(2); // Center banner

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 220;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    // Navigate to portal with category selected
    navigate(`/portal?category=${categoryId}`);
  };

  if (isLoading) {
    return (
      <section className="relative py-12 sm:py-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Skeleton className="h-10 w-72 mx-auto mb-4" />
            <Skeleton className="h-16 w-48 mx-auto" />
          </div>
          <div className="flex gap-6 justify-center">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="w-44 h-80 rounded-b-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-12 sm:py-20 overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      {/* Animated particles/dust */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 + '%',
              y: Math.random() * 100 + '%',
              opacity: 0 
            }}
            animate={{ 
              y: [null, '-20%'],
              opacity: [0, 0.3, 0]
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5
            }}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
          />
        ))}
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-14"
        >
          <motion.h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4"
            initial={{ letterSpacing: '0.1em' }}
            animate={{ letterSpacing: '0.05em' }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            CHOOSE YOUR FACTION
          </motion.h2>
          
          <motion.p 
            className="text-muted-foreground text-lg mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Select a category and compete for glory
          </motion.p>
          
          {/* Total Prize Pool with animated counter */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="inline-flex flex-col items-center gap-2 p-6 rounded-2xl bg-gradient-to-b from-muted/50 to-muted/20 border border-primary/20"
          >
            <div className="flex items-center gap-2 text-primary">
              <Trophy className="w-6 h-6" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                Total Prize Pool
              </span>
            </div>
            <AnimatedPrizeCounter 
              targetValue={totalPrizePool} 
              showGrowth={true}
            />
          </motion.div>
        </motion.div>
        
        {/* Banners Container */}
        <div className="relative">
          {/* Left Navigation Arrow */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            className="absolute left-0 sm:-left-4 top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur-sm border border-border hidden md:flex hover:bg-primary/20"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          {/* Scrollable Banners */}
          <div
            ref={scrollRef}
            className="flex gap-6 sm:gap-8 overflow-x-auto scrollbar-hide px-4 py-12 justify-start md:justify-center snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {TOURNAMENT_CATEGORIES.map((category, index) => {
              const poolData = prizePools.find(p => p.category === category.id);
              return (
                <div key={category.id} className="snap-center">
                  <ImmersiveBannerCard
                    category={category}
                    prizePool={poolData?.total_pool_cents || 0}
                    participantCount={poolData?.participant_count || 0}
                    onSelect={handleSelectCategory}
                    isSelected={selectedCategory === category.id}
                    index={index}
                  />
                </div>
              );
            })}
          </div>
          
          {/* Right Navigation Arrow */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            className="absolute right-0 sm:-right-4 top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur-sm border border-border hidden md:flex hover:bg-primary/20"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>
        
        {/* Mobile pagination dots */}
        <div className="flex justify-center gap-2 mt-4 md:hidden">
          {TOURNAMENT_CATEGORIES.map((category, index) => (
            <motion.button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`w-2 h-2 rounded-full transition-all ${
                selectedCategory === category.id 
                  ? 'bg-primary w-6' 
                  : 'bg-muted-foreground/30'
              }`}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>
        
        {/* Mobile Swipe Hint */}
        <motion.p 
          className="text-center text-sm text-muted-foreground mt-4 md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          ← Swipe to explore factions →
        </motion.p>
      </div>
    </section>
  );
};

export default ImmersiveFactionBanners;
