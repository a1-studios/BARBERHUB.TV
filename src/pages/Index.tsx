import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import LandingHero from "@/components/LandingHero";
import CommunitySection from "@/components/CommunitySection";
import { DynamicBattleHero } from "@/components/DynamicBattleHero";
import BattlesSection from "@/components/BattlesSection";
import Footer from "@/components/Footer";
import { SpinWheelOverlay } from "@/components/SpinWheelOverlay";

import GrantsSection from "@/components/GrantsSection";
import { GlobalLeagueDashboard } from "@/components/GlobalLeagueDashboard";

import { LiveBarberStreams } from "@/components/battles/LiveBarberStreams";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/config/features";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { ImmersiveFactionBanners } from "@/components/factions/ImmersiveFactionBanners";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BottomNavBar } from "@/components/BottomNavBar";
import { useUserRole } from "@/hooks/useUserRole";
import { FanIntroSequence } from "@/components/fan/FanIntroSequence";
import { FanArenaView } from "@/components/fan/FanArenaView";

const Index = () => {
  const { user, loading } = useAuth();
  const { isFan, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const recoveryAttempted = useRef(false);
  const [introComplete, setIntroComplete] = useState(() =>
    sessionStorage.getItem('fan_intro_seen') === 'true'
  );

  // Auto-show spin wheel once per session
  const [showSpinWheel, setShowSpinWheel] = useState(() => {
    if (sessionStorage.getItem('spin_wheel_shown') === 'true') return false;
    return true;
  });

  const handleSpinClose = () => {
    setShowSpinWheel(false);
    sessionStorage.setItem('spin_wheel_shown', 'true');
  };

  // Recover any pending BB purchase that wasn't verified
  useEffect(() => {
    if (!user || loading || recoveryAttempted.current) return;
    recoveryAttempted.current = true;

    try {
      const raw = localStorage.getItem('pending_bb_purchase');
      if (!raw) return;

      const pending = JSON.parse(raw);
      const ageMs = Date.now() - (pending.timestamp || 0);

      if (ageMs > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('pending_bb_purchase');
        return;
      }

      supabase.functions.invoke('verify-bb-purchase', {
        body: { session_id: pending.session_id }
      }).then(({ data, error }) => {
        if (!error && data?.success) {
          localStorage.removeItem('pending_bb_purchase');
          queryClient.invalidateQueries({ queryKey: ['barber_bucks'] });
          queryClient.invalidateQueries({ queryKey: ['barber_bucks_transactions'] });
          toast.success(`+${data.bb_credited} BB credited to your account!`);
        } else if (error || !data?.success) {
          console.log('[BB Recovery] Verification unsuccessful, clearing pending:', data?.error || error);
          localStorage.removeItem('pending_bb_purchase');
        }
      });
    } catch {
      localStorage.removeItem('pending_bb_purchase');
    }
  }, [user, loading]);

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
        <>
          {/* Fan intro sequence — plays once per session */}
          {isFan && !introComplete && (
            <FanIntroSequence onComplete={() => {
              setIntroComplete(true);
              sessionStorage.setItem('fan_intro_seen', 'true');
            }} />
          )}

          {isFan ? (
            <FanArenaView />
          ) : (
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
          )}
        </>
      ) : (
        <>
          <LandingHero />
        </>
      )}
      
      <Footer />
      {user && <BottomNavBar />}

      {/* Auto-show spin wheel overlay */}
      <SpinWheelOverlay open={showSpinWheel} onClose={handleSpinClose} />
    </div>
  );
};
export default Index;
