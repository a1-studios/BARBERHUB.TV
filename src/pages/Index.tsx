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
const Index = () => {
  const {
    user,
    loading
  } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>;
  }
  return <div className="min-h-screen">
      <Header />
      
      {/* AI Haircut Advisor - Available for everyone */}
      <HaircutAdvisorSection />
      
      {/* Content gated behind authentication */}
      {user ? <main className="pt-20 sm:pt-24">
          <BattlesSection />
          {FEATURES.CREATOR_HUB_ENABLED && <CreatorHub />}
          {FEATURES.GRANTS_SECTION && <GrantsSection />}
          {FEATURES.COMMUNITY_LEADERBOARD && <CommunitySection />}
        </main> : <>
          <LandingHero />
          
        </>}
      
      <Footer />
    </div>;
};
export default Index;