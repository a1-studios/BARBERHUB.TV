import Header from "@/components/Header";
import LandingHero from "@/components/LandingHero";
import CommunitySection from "@/components/CommunitySection";
import { DynamicBattleHero } from "@/components/DynamicBattleHero";
import BattlesSection from "@/components/BattlesSection";
import Footer from "@/components/Footer";
import { CreatorHub } from "@/components/creator/CreatorHub";
import GrantsSection from "@/components/GrantsSection";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/config/features";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const {
    user,
    loading
  } = useAuth();

  // Fetch user profile to determine user type
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Content gated behind authentication */}
      {user ? (
        <main>
          {/* Head-to-Head Battle Hero */}
          <DynamicBattleHero />
          
          {/* Main Battles Section with all navigation and features */}
          <BattlesSection />
          
          {/* Creator Hub for Barbers */}
          {FEATURES.CREATOR_HUB_ENABLED && profile?.user_type === 'barber' && (
            <CreatorHub />
          )}
          
          {/* Community Leaderboard */}
          {FEATURES.COMMUNITY_LEADERBOARD && (
            <CommunitySection />
          )}
          
          {/* Grants Section */}
          {FEATURES.GRANTS_SECTION && (
            <GrantsSection />
          )}
        </main>
      ) : (
        <>
          <LandingHero />
        </>
      )}
      
      <Footer />
    </div>
  );
};
export default Index;