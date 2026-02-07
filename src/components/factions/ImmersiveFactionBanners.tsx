import { useState } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { TOURNAMENT_CATEGORIES } from '@/config/categories';
import { TOURNAMENT_CONFIG } from '@/config/tournament';
import { useCategoryPrizePools } from '@/hooks/useCategoryPrizePools';
import { useCategoryTopBarbers } from '@/hooks/useCategoryTopBarbers';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { ImmersiveBannerCard } from './ImmersiveBannerCard';
import { AddFundsModal } from '@/components/AddFundsModal';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const ImmersiveFactionBanners = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { prizePools, isLoading } = useCategoryPrizePools();
  const { data: topBarbers } = useCategoryTopBarbers();
  const { isBarber } = useUserRole();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [joiningCategory, setJoiningCategory] = useState<string | null>(null);

  // Fetch barber profile
  const { data: barberProfile } = useQuery({
    queryKey: ['barber-profile-banner', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('barber_profiles')
        .select('id, country_code')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && isBarber,
  });

  // Fetch BB balance
  const { data: bbBalance } = useQuery({
    queryKey: ['bb-balance-banner', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from('profiles')
        .select('barber_bucks')
        .eq('user_id', user.id)
        .single();
      return data?.barber_bucks || 0;
    },
    enabled: !!user && isBarber,
  });

  // Fetch existing queue entries
  const { data: queueEntries } = useQuery({
    queryKey: ['tournament-queue-banner', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('tournament_queue')
        .select('id, category, status')
        .eq('user_id', user.id)
        .in('status', ['waiting', 'matched']);
      return data || [];
    },
    enabled: !!user && isBarber,
  });

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async ({ category, barber_profile_id, country_code }: { category: string; barber_profile_id: string; country_code: string }) => {
      const { data, error } = await supabase.functions.invoke('register-tournament-bb', {
        body: { category, barber_profile_id, country_code },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Joined tournament queue!');
      queryClient.invalidateQueries({ queryKey: ['tournament-queue-banner'] });
      queryClient.invalidateQueries({ queryKey: ['bb-balance-banner'] });
      queryClient.invalidateQueries({ queryKey: ['barber_bucks'] });
      queryClient.invalidateQueries({ queryKey: ['category-prize-pools'] });
      setJoiningCategory(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to join queue');
      setJoiningCategory(null);
    },
  });

  const handleJoinQueue = (categoryShortName: string) => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    if (!barberProfile) {
      toast.error('Please complete your barber profile first');
      return;
    }

    if (!barberProfile.country_code) {
      toast.error('Please set your country in your barber profile');
      return;
    }

    // Check if already in queue
    if (queueEntries?.some(e => e.category === categoryShortName)) {
      toast.info("You're already in the queue for this category");
      return;
    }

    // Check BB balance
    if ((bbBalance || 0) < TOURNAMENT_CONFIG.ENTRY_FEE_BB) {
      toast.error(`You need ${TOURNAMENT_CONFIG.ENTRY_FEE_BB} BB to join. Please add funds.`);
      setShowAddFunds(true);
      return;
    }

    setJoiningCategory(categoryShortName);
    registerMutation.mutate({
      category: categoryShortName,
      barber_profile_id: barberProfile.id,
      country_code: barberProfile.country_code,
    });
  };

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

  // Non-barbers see only 3 highlighted categories
  const HIGHLIGHT_IDS = ['speed_fade', 'creative_color', 'beard_scissor'];
  const displayCategories = isBarber
    ? TOURNAMENT_CATEGORIES
    : TOURNAMENT_CATEGORIES.filter(c => HIGHLIGHT_IDS.includes(c.id));

  const viewMode = isBarber ? 'compete' : 'showcase';

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
        {/* Section header — universal */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h3
              className="text-sm sm:text-base font-black uppercase tracking-widest text-cyan"
              style={{ textShadow: '0 0 12px hsl(187 100% 50% / 0.4)' }}
            >
              Top Arenas
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              See who's dominating right now
            </p>
          </div>
          {!isBarber && (
            <button
              onClick={() => navigate('/portal')}
              className="text-xs font-semibold text-cyan hover:text-cyan/80 transition-colors flex items-center gap-1"
            >
              See All
              <span aria-hidden>→</span>
            </button>
          )}
        </motion.div>

        {/* Banners Row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={cn(
            "flex justify-center items-end pt-4 mx-auto",
            isBarber
              ? "gap-2 sm:gap-3 lg:gap-4 max-w-5xl lg:max-w-6xl"
              : "gap-4 sm:gap-5 lg:gap-6 max-w-2xl lg:max-w-3xl"
          )}
        >
          {displayCategories.map((category, index) => {
            const poolData = prizePools.find(p => p.category === category.id);
            const topBarber = topBarbers?.[category.id];
            const inQueue = queueEntries?.some(e => e.category === category.shortName) || false;
            
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
                isBarber={isBarber}
                onJoin={handleJoinQueue}
                isJoining={joiningCategory === category.shortName}
                isInQueue={inQueue}
                viewMode={viewMode}
              />
            );
          })}
        </motion.div>
      </div>

      {/* Add Funds Modal */}
      <AddFundsModal isOpen={showAddFunds} onClose={() => setShowAddFunds(false)} />
    </section>
  );
};

export default ImmersiveFactionBanners;
