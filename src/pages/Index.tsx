import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import LandingHero from "@/components/LandingHero";
import CommunitySection from "@/components/CommunitySection";
import { DynamicBattleHero } from "@/components/DynamicBattleHero";
import BattlesSection from "@/components/BattlesSection";
import Footer from "@/components/Footer";
import { LaunchWizard } from "@/components/coming-soon/LaunchWizard";

import GrantsSection from "@/components/GrantsSection";
import { GlobalLeagueDashboard } from "@/components/GlobalLeagueDashboard";

import { LiveBarberStreams } from "@/components/battles/LiveBarberStreams";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/config/features";
import { ImmersiveFactionBanners } from "@/components/factions/ImmersiveFactionBanners";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BottomNavBar } from "@/components/BottomNavBar";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { FanIntroSequence } from "@/components/fan/FanIntroSequence";
import { FanArenaView } from "@/components/fan/FanArenaView";

import { ProductShelf } from "@/components/ProductShelf";

const Index = () => {
  const { user, loading } = useAuth();
  const { isFan, isLoading: roleLoading } = useUserRole();
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const recoveryAttempted = useRef(false);

  // Arena Gate state — lifted here so modal persists after auth state change
  const [showArenaGate, setShowArenaGate] = useState(false);
  const [introComplete, setIntroComplete] = useState(() =>
    sessionStorage.getItem('fan_intro_seen') === 'true'
  );

  // Promotion gate visibility — only ever shown to first-time guest visitors.
  // The server-side eligibility check below makes the actual decision; the
  // localStorage flag here just suppresses a one-frame flash for repeat visitors.
  const [showSpinWheel, setShowSpinWheel] = useState(false);

  // Detect OAuth resume → re-mount wizard at Spin step with the role chosen pre-redirect
  const [resumeSpin, setResumeSpin] = useState<{ role: 'barber' | 'fan' } | null>(null);
  useEffect(() => {
    if (!user || loading) return;
    if (localStorage.getItem('wizard_resume_spin') === 'true') {
      const role = (localStorage.getItem('pending_social_role') as 'barber' | 'fan') || 'fan';
      localStorage.removeItem('wizard_resume_spin');
      localStorage.removeItem('pending_social_role');
      setResumeSpin({ role });
    }
  }, [user, loading]);

  // Server-backed eligibility check — only show the gate when:
  //  1) Auth has finished loading
  //  2) The visitor is NOT signed in
  //  3) The visitor has not been seen on this fingerprint or IP before
  useEffect(() => {
    if (loading) return;

    // Signed-in users never see the gate.
    if (user) {
      setShowSpinWheel(false);
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
    setResumeSpin(null);
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
    if (!user || loading || recoveryAttempted.current) return;
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
      const spinRaw = localStorage.getItem('pending_spin_prize');
      if (spinRaw) {
        const pending = JSON.parse(spinRaw);
        const ageMs = Date.now() - (pending.timestamp || 0);

        // Validate role match — discard if prize role doesn't match user's actual role
        const userActualRole = isFan ? 'fan' : 'barber';
        if (pending.role && pending.role !== userActualRole) {
          console.log('[Spin Recovery] Role mismatch: prize for', pending.role, 'but user is', userActualRole);
          localStorage.removeItem('pending_spin_prize');
        } else if (ageMs > 24 * 60 * 60 * 1000) {
          localStorage.removeItem('pending_spin_prize');
        } else {
          supabase.functions.invoke('spin-wheel', {
            body: {
              role: pending.role || 'fan',
              prize_id: pending.prize_id,
              prize_bb: pending.prize_bb || 0,
              prize_type: pending.prize_type || 'bb',
              prize_label: pending.prize_label || 'Spin Prize',
              duration_months: pending.duration_months || 0,
              is_free_spin: true,
            },
          }).then(({ data, error }) => {
            if (!error && data?.success) {
              localStorage.removeItem('pending_spin_prize');
              queryClient.invalidateQueries({ queryKey: ['barber_bucks'] });
              queryClient.invalidateQueries({ queryKey: ['barber_bucks_transactions'] });
              queryClient.invalidateQueries({ queryKey: ['user_prizes'] });
              toast.success(`🎰 Your spin prize was claimed: ${pending.prize_label}!`);
            } else if (data?.already_claimed) {
              localStorage.removeItem('pending_spin_prize');
            } else {
              console.log('[Spin Recovery] Claim unsuccessful:', data?.error || error);
              localStorage.removeItem('pending_spin_prize');
            }
          });
        }
      }
    } catch {
      localStorage.removeItem('pending_spin_prize');
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
                {/* Head-to-Head Battle Hero */}
              <DynamicBattleHero />

              {/* Official Gear Shelf */}
              <ProductShelf />
              
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
          <LandingHero onOpenArenaGate={() => setShowArenaGate(true)} />
        </>
      )}
      
      <Footer />
      {user && <BottomNavBar />}

      {/* Gamified intake wizard — replaces legacy SpinWheelOverlay.
          Only ever rendered for guests (extra defensive check on top of the eligibility effect). */}
      {!user && showSpinWheel && !resumeSpin && (
        <LaunchWizard mode="live" onClose={handleSpinClose} />
      )}

      {/* Post-OAuth resume — wizard re-opens at Spin step (now step 3) with the role chosen pre-redirect */}
      {resumeSpin && (
        <LaunchWizard
          mode="live"
          startStep={3}
          prefilledRole={resumeSpin.role}
          onClose={handleSpinClose}
        />
      )}

      {/* Arena Gate Modal — rendered outside auth conditional so it persists */}
      <ArenaGateModal
        isOpen={showArenaGate}
        onClose={() => setShowArenaGate(false)}
        onComplete={() => {
          setShowArenaGate(false);
          navigate('/profile');
        }}
      />
    </div>
  );
};
export default Index;
