
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { BarberGuard } from "@/components/auth/BarberGuard";
import { AdminGuard } from "@/components/auth/AdminGuard";
import SovereignGuard from "@/components/auth/SovereignGuard";
import { useFollowedBarbersNotifications } from "@/hooks/useFollowedBarbersNotifications";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
// BattlesPage removed — /battles redirects to /watch
import BattleDetails from "./pages/BattleDetails";

import Analytics from "./pages/Analytics";
import Portal from "./pages/Portal";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import Grants from "./pages/Grants";
import CreatorHub from "./pages/CreatorHub";
import Tournaments from "@/pages/Tournaments";
import TournamentDetails from "@/pages/TournamentDetails";
import NotFound from "./pages/NotFound";
import WatchFeed from "./pages/WatchFeed";
import BarberPublicProfile from "./pages/BarberPublicProfile";
import BarbersDirectory from "./pages/BarbersDirectory";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import BattleManagement from "./pages/admin/BattleManagement";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import BattleTheater from "./pages/BattleTheater";
import ContenderTheater from "./pages/ContenderTheater";
import SovereignHQ from "./pages/SovereignHQ";
import SponsorAdsPage from "./pages/admin/SponsorAdsPage";
import VaultOfHonor from "./pages/VaultOfHonor";
import M4MVerify from "./pages/M4MVerify";
import CameraStudio from "./pages/CameraStudio";
import Rankings from "./pages/Rankings";
import BroadcastViewer from "./pages/BroadcastViewer";
import BroadcastStudio from "./pages/BroadcastStudio";

const queryClient = new QueryClient();

const AppContent = () => {
  // Enable real-time notifications for followed barbers going live
  useFollowedBarbersNotifications();
  
  return (
    <>
      <Routes>
            <Route path="/" element={<Index />} />
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
            <Route path="/barbers" element={<BarbersDirectory />} />
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
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
