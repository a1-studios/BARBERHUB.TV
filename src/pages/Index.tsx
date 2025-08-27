import Header from "@/components/Header";
import LandingHero from "@/components/LandingHero";
import GrantsSection from "@/components/GrantsSection";
import CommunitySection from "@/components/CommunitySection";
import Footer from "@/components/Footer";
import { CreatorHub } from "@/components/creator/CreatorHub";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/config/features";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  // Show landing page for unauthenticated users
  if (!user) {
    return (
      <div className="min-h-screen">
        <LandingHero />
      </div>
    );
  }

  // Show main app for authenticated users
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {FEATURES.CREATOR_HUB_ENABLED && <CreatorHub />}
        {FEATURES.GRANTS_SECTION && <GrantsSection />}
        {FEATURES.COMMUNITY_LEADERBOARD && <CommunitySection />}
      </main>
      <Footer />
    </div>
  );
};

export default Index;