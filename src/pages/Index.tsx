import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import LandingHero from "@/components/LandingHero";
import CommunitySection from "@/components/CommunitySection";
import { DynamicBattleHero } from "@/components/DynamicBattleHero";

import Footer from "@/components/Footer";
import { LaunchWizard } from "@/components/coming-soon/LaunchWizard";

import GrantsSection from "@/components/GrantsSection";
import { GlobalLeagueDashboard } from "@/components/GlobalLeagueDashboard";

import { LivesModal } from "@/components/battles/LivesModal";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/config/features";
import { ImmersiveFactionBanners } from "@/components/factions/ImmersiveFactionBanners";
import { VelvetRopeLanding } from "@/components/landing/VelvetRopeLanding";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BottomNavBar } from "@/components/BottomNavBar";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { FanIntroSequence } from "@/components/fan/FanIntroSequence";

import { ProductShelf } from "@/components/ProductShelf";

const UnifiedArena = () => {
  return (
    <main className="space-y-4 pb-24">
      {/* Featured Battle Hero — role-aware internally */}
      <DynamicBattleHero />

      {/* Lives — auto-opens as modal when a barber is live, otherwise renders nothing */}
      <LivesModal />

      {/* Official Gear Shelf */}
      <ProductShelf />

      {/* Immersive Faction Banners (includes the prize-pool ticker) */}
      <ImmersiveFactionBanners />

      {/* Global League Dashboard */}
      <section className="px-3 sm:px-6">
        <GlobalLeagueDashboard />
      </section>


      {FEATURES.COMMUNITY_LEADERBOARD && <CommunitySection />}
      {FEATURES.GRANTS_SECTION && <GrantsSection />}
    </main>
  );
};

const Index = () => {
  const { user, loading } = useAuth();
  const { isFan, isLoading: roleLoading } = useUserRole();
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const recoveryAttempted = useRef(false);

  const [introComplete, setIntroComplete] = useState(() =>
    sessionStorage.getItem('fan_intro_seen') === 'true'
  );

  // Promotion gate visibility — only ever shown to first-time guest visitors.
  // The server-side eligibility check below makes the actual decision; the
  // localStorage flag here just suppresses a one-frame flash for repeat visitors.
  const [showSpinWheel, setShowSpinWheel] = useState(() => {
    try { return !!sessionStorage.getItem('bh_pending_role'); } catch { return false; }
  });

  // Server-backed eligibility check — only show the gate when:
  //  1) Auth has finished loading
  //  2) The visitor is NOT signed in
  //  3) The visitor has not been seen on this fingerprint or IP before
  useEffect(() => {
    if (loading) return;

    // If the user is signed-in but mid-onboarding (pending role in session),
    // keep the wizard open so the reward + spin + reveal steps can run.
    if (user) {
      try {
        if (!sessionStorage.getItem('bh_pending_role')) setShowSpinWheel(false);
      } catch { setShowSpinWheel(false); }
      return;
    }

    // Already shown this session → don't reopen on tab focus / route changes
    if (sessionStorage.getItem('spin_wheel_shown') === 'true') return;
    if (localStorage.getItem('gate_completed') === '1') return;

    let cancelled = false;
    (async () => {
      try {
        const { getDeviceFingerprint } = await import('@/utils/deviceFingerprint');
        const fingerprint = getDeviceFingerprint();

        const { data, error } = await supabase.functions.invoke('check-gate-eligibility', {
          body: { action: 'check', fingerprint },
        });

        if (cancelled) return;
        if (error) {
          console.warn('[gate] eligibility check failed', error);
          return;
        }

        if (data?.shouldShowGate) {
          setShowSpinWheel(true);
          sessionStorage.setItem('spin_wheel_shown', 'true');
          // Fire-and-forget: record that we showed the gate
          supabase.functions.invoke('check-gate-eligibility', {
            body: { action: 'mark_shown', fingerprint },
          }).catch(() => { /* ignore */ });
        } else {
          // Cache the answer locally so we don't re-call the function on every load
          localStorage.setItem('gate_completed', '1');
        }
      } catch (err) {
        console.warn('[gate] eligibility check threw', err);
      }
    })();

    return () => { cancelled = true; };
  }, [user, loading]);

  const handleSpinClose = async () => {
    setShowSpinWheel(false);
    sessionStorage.setItem('spin_wheel_shown', 'true');
    try {
      const { getDeviceFingerprint } = await import('@/utils/deviceFingerprint');
      const fingerprint = getDeviceFingerprint();
      await supabase.functions.invoke('check-gate-eligibility', {
        body: { action: 'mark_skipped', fingerprint },
      });
      localStorage.setItem('gate_completed', '1');
    } catch {
      /* best-effort */
    }
  };

  // Welcome-back toast for returning authenticated users (once per session)
  useEffect(() => {
    if (!user || loading) return;
    const hasSeenWelcome = localStorage.getItem('barberhub_welcome_seen');
    const toastShown = sessionStorage.getItem('welcome_back_toast');
    if (hasSeenWelcome && !toastShown) {
      const name = profile?.display_name || user.user_metadata?.display_name || user.user_metadata?.full_name || '';
      if (!name && !profile) return; // Wait for profile to load
      const code = profile?.country_code;
      const flag = code
        ? String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)))
        : '';
      toast(
        <span className="flex items-center gap-1.5">
          👋 Welcome back, <span className="text-cyan-400 font-semibold">{name || 'Champion'}</span>
          {flag && <span className="text-base">{flag}</span>}
        </span>,
        {
          duration: 2500,
          className: 'ring-1 ring-cyan-400/50 shadow-[0_0_16px_rgba(34,211,238,0.2)]',
        }
      );
      sessionStorage.setItem('welcome_back_toast', 'true');
    }
  }, [user, loading, profile]);

  // Recover any pending BB purchase that wasn't verified
  useEffect(() => {
    // Wait until auth + role data has fully hydrated so we don't compare
    // a pending prize role against a still-loading "false/false" role state.
    if (!user || loading || roleLoading || recoveryAttempted.current) return;
    recoveryAttempted.current = true;

    // 1. Recover pending BB purchases
    try {
      const raw = localStorage.getItem('pending_bb_purchase');
      if (raw) {
        const pending = JSON.parse(raw);
        const ageMs = Date.now() - (pending.timestamp || 0);

        if (ageMs > 24 * 60 * 60 * 1000) {
          localStorage.removeItem('pending_bb_purchase');
        } else {
          supabase.functions.invoke('verify-bb-purchase', {
            body: { session_id: pending.session_id }
          }).then(({ data, error }) => {
            if (!error && data?.success) {
              localStorage.removeItem('pending_bb_purchase');
              queryClient.invalidateQueries({ queryKey: ['barber_bucks'] });
              queryClient.invalidateQueries({ queryKey: ['barber_bucks_transactions'] });
              toast.success(`+${data.bb_credited} BB credited to your account!`);
            } else {
              console.log('[BB Recovery] Verification unsuccessful:', data?.error || error);
              localStorage.removeItem('pending_bb_purchase');
            }
          });
        }
      }
    } catch {
      localStorage.removeItem('pending_bb_purchase');
    }

    // 2. Auto-claim pending spin prize from guest session
    try {
      const spinRaw = localStorage.getItem('pending_prize');
      if (spinRaw) {
        const pending = JSON.parse(spinRaw);
        const ageMs = Date.now() - (pending.timestamp || 0);

        // Use the resolved primary role from useUserRole (hydrated by now).
        // Fall back to the prize's stored role rather than dropping the prize.
        const userActualRole = isFan ? 'fan' : (profile?.user_type === 'barber' ? 'barber' : (pending.role || 'fan'));

        if (ageMs > 24 * 60 * 60 * 1000) {
          localStorage.removeItem('pending_prize');
        } else if (pending.role && pending.role !== userActualRole) {
          // Roles legitimately differ → keep prize for now, let user decide later.
          console.log('[Spin Recovery] Role mismatch, deferring claim:', pending.role, 'vs', userActualRole);
        } else {
          supabase.functions.invoke('spin-wheel', {
            body: {
              role: userActualRole,
              prize_id: pending.prize_id,
              prize_bb: pending.prize_bb || 0,
              prize_type: pending.prize_type || 'bb',
              prize_label: pending.prize_label || 'Spin Prize',
              duration_months: pending.duration_months || 0,
              is_free_spin: true,
            },
          }).then(({ data, error }) => {
            if (!error && data?.success) {
              localStorage.removeItem('pending_prize');
              queryClient.invalidateQueries({ queryKey: ['barber_bucks'] });
              queryClient.invalidateQueries({ queryKey: ['barber_bucks_transactions'] });
              queryClient.invalidateQueries({ queryKey: ['user_prizes'] });
              toast.success(`🎰 Your spin prize was claimed: ${pending.prize_label}!`);
            } else if (data?.already_claimed || data?.expired) {
              localStorage.removeItem('pending_prize');
            } else {
              console.log('[Spin Recovery] Claim unsuccessful:', data?.error || error);
              // Don't drop the prize — let it retry next visit
            }
          });
        }
      }
    } catch {
      localStorage.removeItem('pending_prize');
    }
  }, [user, loading, roleLoading, isFan, profile?.user_type]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  // Guests → new mobile-first LandingHero with email OTP sign-in.
  if (!user) {
    return (
      <>
        <LandingHero onStartSignup={() => setShowSpinWheel(true)} />
        {showSpinWheel && <LaunchWizard onClose={handleSpinClose} />}
      </>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      <Helmet>
        <link rel="canonical" href="https://barberhub.tv/" />
      </Helmet>
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

          <UnifiedArena />

        </>
      ) : (
        <>
          <LandingHero onStartSignup={() => setShowSpinWheel(true)} />
        </>
      )}
      
      <Footer />
      {user && <BottomNavBar />}

      {/* Unified gamified onboarding gate — stays open through post-auth steps. */}
      {showSpinWheel && (
        <LaunchWizard onClose={handleSpinClose} />
      )}
    </div>
  );
};
export default Index;
