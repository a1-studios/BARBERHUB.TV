import Header from "@/components/Header";
import LandingHero from "@/components/LandingHero";
import GrantsSection from "@/components/GrantsSection";
import CommunitySection from "@/components/CommunitySection";
import BattlesSection from "@/components/BattlesSection";
import Footer from "@/components/Footer";
import { CreatorHub } from "@/components/creator/CreatorHub";
import { HaircutAdvisorSection } from "@/components/HaircutAdvisorSection";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/config/features";
import { RoleSelector } from "@/components/auth/RoleSelector";
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
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>;
  }
  return <div className="min-h-screen">
      <Header />
      
      {/* Content gated behind authentication */}
      {user ? <main className="pt-20 sm:pt-24">
          <BattlesSection />
          {FEATURES.CREATOR_HUB_ENABLED && profile?.user_type === 'barber' && <CreatorHub />}
          {FEATURES.GRANTS_SECTION && profile?.user_type === 'fan' && <GrantsSection />}
          {FEATURES.COMMUNITY_LEADERBOARD && <CommunitySection />}
        </main> : <>
          <LandingHero />
          
        </>}
      
      <Footer />
    </div>;
};
export default Index;