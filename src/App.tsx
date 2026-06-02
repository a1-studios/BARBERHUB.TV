
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { OneTapRaffleReveal } from "@/components/auth/OneTapRaffleReveal";
import ScrollToTop from "@/components/ScrollToTop";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { BarberGuard } from "@/components/auth/BarberGuard";
import { AdminGuard } from "@/components/auth/AdminGuard";
import SovereignGuard from "@/components/auth/SovereignGuard";
import { useFollowedBarbersNotifications } from "@/hooks/useFollowedBarbersNotifications";
import { useMetaPixelPageView } from "@/hooks/useMetaPixelPageView";
import { useGoogleAdsPageView } from "@/hooks/useGoogleAdsPageView";
import { IS_COMING_SOON } from "@/config/launchMode";
import Index from "./pages/Index";
import ComingSoon from "./pages/ComingSoon";
import Profile from "./pages/Profile";
// BattlesPage removed — /battles redirects to /watch
import BattleDetails from "./pages/BattleDetails";

import Portal from "./pages/Portal";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import Grants from "./pages/Grants";
import CreatorHub from "./pages/CreatorHub";
import NotFound from "./pages/NotFound";
import WatchFeed from "./pages/WatchFeed";
import BarberPublicProfile from "./pages/BarberPublicProfile";
import BookBarberLanding from "./pages/seo/BookBarberLanding";
import M4MVerify from "./pages/M4MVerify";
import Rankings from "./pages/Rankings";
import BroadcastViewer from "./pages/BroadcastViewer";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";
import { AuthHashHandler } from "./components/auth/AuthHashHandler";
import { ProfileCompletionGate } from "./components/auth/ProfileCompletionGate";
import { CookieConsentBanner } from "./components/legal/CookieConsentBanner";
import IOSInstallPrompt from "./components/pwa/IOSInstallPrompt";
import { IncomingChallengeTakeover } from "./components/battles/IncomingChallengeTakeover";
import { initPixelGate } from "./lib/metaPixelGate";

// Lazy-loaded heavy / rarely-visited routes
const BarbersDirectory = lazy(() => import("./pages/BarbersDirectory"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Tournaments = lazy(() => import("@/pages/Tournaments"));
const TournamentDetails = lazy(() => import("@/pages/TournamentDetails"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const BattleManagement = lazy(() => import("./pages/admin/BattleManagement"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const BattleTheater = lazy(() => import("./pages/BattleTheater"));
const ContenderTheater = lazy(() => import("./pages/ContenderTheater"));
const SovereignHQ = lazy(() => import("./pages/SovereignHQ"));
const SponsorAdsPage = lazy(() => import("./pages/admin/SponsorAdsPage"));
const VaultOfHonor = lazy(() => import("./pages/VaultOfHonor"));
const CameraStudio = lazy(() => import("./pages/CameraStudio"));
const BroadcastStudio = lazy(() => import("./pages/BroadcastStudio"));
const ModerationDashboard = lazy(() => import("./pages/admin/ModerationDashboard"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const Privacy = lazy(() => import("./pages/legal/Privacy"));
const AUP = lazy(() => import("./pages/legal/AUP"));
const Cookies = lazy(() => import("./pages/legal/Cookies"));
const DMCA = lazy(() => import("./pages/legal/DMCA"));


const queryClient = new QueryClient();

const AppContent = () => {
  // Enable real-time notifications for followed barbers going live
  useFollowedBarbersNotifications();
  // Track SPA route changes in Meta Pixel + Google Ads
  useMetaPixelPageView();
  useGoogleAdsPageView();

  useEffect(() => {
    initPixelGate();
  }, []);

  return (
    <>
      <AuthHashHandler />
      <ProfileCompletionGate />
      <CookieConsentBanner />
      <IOSInstallPrompt />
      <IncomingChallengeTakeover />
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Routes>
            <Route path="/" element={IS_COMING_SOON ? <ComingSoon /> : <Index />} />
            <Route path="/coming-soon" element={<ComingSoon />} />
            <Route path="/auth" element={<Navigate to="/" replace />} />
            <Route 
              path="/profile" 
              element={
                <AuthGuard>
                  <Profile />
                </AuthGuard>
              } 
            />
            <Route path="/battles" element={<Navigate to="/watch" replace />} />
            <Route 
              path="/battles/create" 
              element={<Navigate to="/creator-hub" replace />}
            />
            <Route 
              path="/battles/:id" 
              element={
                <AuthGuard>
                  <BattleDetails />
                </AuthGuard>
              } 
            />
            <Route 
              path="/battle/:id/theater" 
              element={
                <AuthGuard>
                  <BattleTheater />
                </AuthGuard>
              } 
            />
            <Route 
              path="/battle/:id/contender" 
              element={
                <AuthGuard>
                  <BarberGuard>
                    <ContenderTheater />
                  </BarberGuard>
                </AuthGuard>
              } 
            />
            <Route 
              path="/portal" 
              element={
                <AuthGuard>
                  <BarberGuard>
                    <Portal />
                  </BarberGuard>
                </AuthGuard>
              } 
            />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            <Route path="/grants" element={<Grants />} />
            <Route 
              path="/creator-hub" 
              element={
                <AuthGuard>
                  <BarberGuard>
                    <CreatorHub />
                  </BarberGuard>
                </AuthGuard>
              } 
            />
          <Route path="/watch" element={<WatchFeed />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournaments/:tournamentId" element={<TournamentDetails />} />
            <Route path="/barber/:userId" element={<BarberPublicProfile />} />
            <Route path="/barbers" element={<Suspense fallback={<div className="min-h-screen bg-background" />}><BarbersDirectory /></Suspense>} />
            <Route path="/book-barber-near-me" element={<BookBarberLanding />} />
            <Route path="/book-barber/:city" element={<BookBarberLanding />} />
            <Route path="/book-barber/:city/:service" element={<BookBarberLanding />} />
            <Route 
              path="/analytics" 
              element={
                <AuthGuard>
                  <BarberGuard>
                    <Analytics />
                  </BarberGuard>
                </AuthGuard>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <AuthGuard>
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                </AuthGuard>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <AuthGuard>
                  <AdminGuard>
                    <UserManagement />
                  </AdminGuard>
                </AuthGuard>
              } 
            />
            <Route 
              path="/admin/battles" 
              element={
                <AuthGuard>
                  <AdminGuard>
                    <BattleManagement />
                  </AdminGuard>
                </AuthGuard>
              } 
            />
            <Route 
              path="/admin/analytics" 
              element={
                <AuthGuard>
                  <AdminGuard>
                    <AdminAnalytics />
                  </AdminGuard>
                </AuthGuard>
              } 
            />
            <Route 
              path="/admin/sponsors" 
              element={
                <AuthGuard>
                  <AdminGuard>
                    <SponsorAdsPage />
                  </AdminGuard>
                </AuthGuard>
              } 
            />
            <Route 
              path="/sovereign-hq" 
              element={
                <SovereignGuard>
                  <SovereignHQ />
                </SovereignGuard>
              } 
            />
            <Route path="/vault" element={<VaultOfHonor />} />
            <Route 
              path="/rankings" 
              element={
                <AuthGuard>
                  <Rankings />
                </AuthGuard>
              } 
            />
            <Route path="/m4m/verify/:barberUserId" element={<M4MVerify />} />
            <Route 
              path="/studio" 
              element={
                <AuthGuard>
                  <BarberGuard>
                    <CameraStudio />
                  </BarberGuard>
                </AuthGuard>
              } 
            />
            <Route path="/broadcast/:barberId" element={<BroadcastViewer />} />
            <Route 
              path="/broadcast/:barberId/studio" 
              element={
                <AuthGuard>
                  <BarberGuard>
                    <BroadcastStudio />
                  </BarberGuard>
                </AuthGuard>
              } 
            />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/aup" element={<AUP />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/dmca" element={<DMCA />} />
            <Route
              path="/admin/moderation"
              element={
                <AuthGuard>
                  <SovereignGuard>
                    <ModerationDashboard />
                  </SovereignGuard>
                </AuthGuard>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <BrowserRouter>
          <ScrollToTop />
          <AppContent />
          <OneTapRaffleReveal />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
