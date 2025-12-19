import { useState } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { TOURNAMENT_CATEGORIES } from '@/config/categories';
import { useCategoryPrizePools } from '@/hooks/useCategoryPrizePools';
import { useCategoryTopBarbers } from '@/hooks/useCategoryTopBarbers';
import { ImmersiveBannerCard } from './ImmersiveBannerCard';
import { useNavigate } from 'react-router-dom';

export const ImmersiveFactionBanners = () => {
  const navigate = useNavigate();
  const { prizePools, isLoading } = useCategoryPrizePools();
  const { data: topBarbers } = useCategoryTopBarbers();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    navigate(`/portal?category=${categoryId}`);
  };

  if (isLoading) {
    return (
      <section className="relative py-8 sm:py-12 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex gap-3 sm:gap-4 justify-center">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="w-24 sm:w-28 h-48 rounded-b-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-8 sm:py-12 overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Banners Row - All 5 visible */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex gap-3 sm:gap-4 lg:gap-6 justify-center items-start pt-6"
        >
          {TOURNAMENT_CATEGORIES.map((category, index) => {
            const poolData = prizePools.find(p => p.category === category.id);
            const topBarber = topBarbers?.[category.id];
            
            return (
              <ImmersiveBannerCard
                key={category.id}
                category={category}
                prizePool={poolData?.total_pool_cents || 0}
                participantCount={poolData?.participant_count || 0}
                onSelect={handleSelectCategory}
                isSelected={selectedCategory === category.id}
                index={index}
                topBarber={topBarber}
              />
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default ImmersiveFactionBanners;
