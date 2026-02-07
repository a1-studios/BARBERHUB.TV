import { useState } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TOURNAMENT_CATEGORIES } from '@/config/categories';
import { useCategoryPrizePools } from '@/hooks/useCategoryPrizePools';
import { useCategoryTopBarbers } from '@/hooks/useCategoryTopBarbers';
import { useUserRole } from '@/hooks/useUserRole';
import { ImmersiveBannerCard } from './ImmersiveBannerCard';
import { TournamentRegistration } from '@/components/tournament/TournamentRegistration';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';

export const ImmersiveFactionBanners = () => {
  const navigate = useNavigate();
  const { prizePools, isLoading } = useCategoryPrizePools();
  const { data: topBarbers } = useCategoryTopBarbers();
  const { isBarber } = useUserRole();
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
    <section className="relative py-10 sm:py-14 overflow-hidden">
      {/* Background with subtle cyan glow */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-transparent" />
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-32 opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(ellipse at center, hsl(187 100% 50% / 0.4) 0%, transparent 70%)' }}
        />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Energetic CTA Block */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-3 py-2 mb-4"
        >
          <p
            className="text-sm sm:text-base text-muted-foreground text-center tracking-wide"
            style={{ textShadow: '0 0 12px hsl(var(--cyan) / 0.4)' }}
          >
            Pick your faction. Rep your flag. Battle every Sunday.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            {isBarber ? (
              <TournamentRegistration />
            ) : (
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/portal')}
                className="border-cyan/40 hover:border-cyan/70 hover:shadow-[0_0_16px_hsl(var(--cyan)/0.3)] transition-all"
              >
                <Eye className="mr-2 h-4 w-4 text-cyan" />
                Watch the Battles
              </Button>
            )}
          </motion.div>

          {/* Pulsing gradient divider */}
          <div
            className="h-px w-1/2 max-w-xs mx-auto mt-1 animate-pulse"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(var(--cyan)), hsl(var(--primary)), transparent)',
            }}
          />
        </motion.div>

        {/* Banners Row - Match hero card width */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex gap-2 sm:gap-3 lg:gap-4 justify-center items-end pt-8 max-w-5xl lg:max-w-6xl mx-auto"
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
