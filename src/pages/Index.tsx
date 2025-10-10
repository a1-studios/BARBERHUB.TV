import Header from "@/components/Header";
import LandingHero from "@/components/LandingHero";
import Footer from "@/components/Footer";
import { GlobalLeagueDashboard } from "@/components/GlobalLeagueDashboard";
import { VirtualHaircutTryOn } from "@/components/VirtualHaircutTryOn";
import { useAuth } from "@/hooks/useAuth";

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
    <div className="min-h-screen">
      <Header />
      
      {/* Content gated behind authentication */}
      {user ? (
        <main className="pt-16">
          {/* Global League Dashboard - Main Entry Point */}
          <GlobalLeagueDashboard />
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