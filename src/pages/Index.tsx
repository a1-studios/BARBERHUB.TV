import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import GrantsSection from "@/components/GrantsSection";
import CommunitySection from "@/components/CommunitySection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <GrantsSection />
        <CommunitySection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
