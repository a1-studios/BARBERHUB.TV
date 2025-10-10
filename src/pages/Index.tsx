import Header from "@/components/Header";
import LandingHero from "@/components/LandingHero";
import CommunitySection from "@/components/CommunitySection";
import { DynamicBattleHero } from "@/components/DynamicBattleHero";
import BattlesSection from "@/components/BattlesSection";
import Footer from "@/components/Footer";
import { CreatorHub } from "@/components/creator/CreatorHub";
import GrantsSection from "@/components/GrantsSection";
import { VirtualHaircutTryOn } from "@/components/VirtualHaircutTryOn";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { FEATURES } from "@/config/features";

const Index = () => {
  const { user, loading } = useAuth();
  const { isBarber } = useUserRole();

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
          
          {/* AI Haircut Coach - Available to all users */}
          <VirtualHaircutTryOn />
          
          {/* Creator Hub for Barbers */}
          {FEATURES.CREATOR_HUB_ENABLED && isBarber && (
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
          <VirtualHaircutTryOn />
        </>
      )}
      
      <Footer />
    </div>
  );
};
export default Index;