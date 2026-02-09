import Header from "@/components/Header";
import LandingHero from "@/components/LandingHero";
import CommunitySection from "@/components/CommunitySection";
import { DynamicBattleHero } from "@/components/DynamicBattleHero";
import BattlesSection from "@/components/BattlesSection";
import Footer from "@/components/Footer";

import GrantsSection from "@/components/GrantsSection";
import { GlobalLeagueDashboard } from "@/components/GlobalLeagueDashboard";

import { LiveBarberStreams } from "@/components/battles/LiveBarberStreams";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/config/features";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { ImmersiveFactionBanners } from "@/components/factions/ImmersiveFactionBanners";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      <Header />
      
      {/* Spacer for fixed header */}
      <div className="h-24 sm:h-28" />
      
      {/* Content gated behind authentication */}
      {user ? (
        <main>
          {/* Welcome Modal for First-Time Users */}
          <WelcomeModal />
          
          {/* Head-to-Head Battle Hero */}
          <DynamicBattleHero />
          
          {/* Immersive Faction Banners - Full Screen Selection */}
          <ImmersiveFactionBanners />
          
          {/* Global League Dashboard */}
          <GlobalLeagueDashboard />
          
          {/* Live Streaming Barbers - Watch active streams */}
          <LiveBarberStreams />
          
          {/* Main Battles Section with all navigation and features */}
          <BattlesSection />
          


          
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