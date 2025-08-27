import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import GrantsSection from "@/components/GrantsSection";
import CommunitySection from "@/components/CommunitySection";
import Footer from "@/components/Footer";
import { CreatorHub } from "@/components/creator/CreatorHub";
import { FEATURES } from "@/config/features";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        {FEATURES.CREATOR_HUB_ENABLED && <CreatorHub />}
        {FEATURES.GRANTS_SECTION && <GrantsSection />}
        {FEATURES.COMMUNITY_LEADERBOARD && <CommunitySection />}
      </main>
      <Footer />
    </div>
  );
};

export default Index;