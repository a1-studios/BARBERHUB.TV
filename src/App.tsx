
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { BarberGuard } from "@/components/auth/BarberGuard";
import { QuickActionsMenu } from "@/components/QuickActionsMenu";
import { useFollowedBarbersNotifications } from "@/hooks/useFollowedBarbersNotifications";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import BattlesPage from "./pages/BattlesPage";
import CreateBattle from "./pages/CreateBattle";
import BattleDetails from "./pages/BattleDetails";
import HaircutAdvisor from "./pages/HaircutAdvisor";
import Portal from "./pages/Portal";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import Grants from "./pages/Grants";
import CreatorHub from "./pages/CreatorHub";
import TournamentDetails from "./pages/TournamentDetails";
import NotFound from "./pages/NotFound";
import BarberPublicProfile from "./pages/BarberPublicProfile";
import BarbersDirectory from "./pages/BarbersDirectory";
import LandingHero from "@/components/LandingHero";

const queryClient = new QueryClient();

const AppContent = () => {
  // Enable real-time notifications for followed barbers going live
  useFollowedBarbersNotifications();
  
  return (
    <>
      <Routes>
            {/* NEW: Global League Dashboard as main page */}
            <Route 
              path="/" 
              element={
                <AuthGuard>
                  <Dashboard />
                </AuthGuard>
              } 
            />
            
            {/* RENAMED: Current Index.tsx becomes /discover */}
            <Route 
              path="/discover" 
              element={
                <AuthGuard>
                  <Index />
                </AuthGuard>
              } 
            />
            
            {/* For unauthenticated users, show login landing */}
            <Route 
              path="/welcome" 
              element={<LandingHero />}
            />
            
            <Route path="/auth" element={<Navigate to="/" replace />} />
            <Route 
              path="/profile" 
              element={
                <AuthGuard>
                  <Profile />
                </AuthGuard>
              } 
            />
            <Route 
              path="/battles" 
              element={<Navigate to="/creator-hub" replace />}
            />
            <Route 
              path="/battles/create" 
              element={
                <AuthGuard>
                  <BarberGuard>
                    <CreateBattle />
                  </BarberGuard>
                </AuthGuard>
              } 
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
              path="/haircut-advisor" 
              element={
                <AuthGuard>
                  <HaircutAdvisor />
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
            <Route path="/creator-hub" element={<CreatorHub />} />
            <Route path="/tournaments/:tournamentId" element={<TournamentDetails />} />
            <Route path="/barber/:userId" element={<BarberPublicProfile />} />
            <Route path="/barbers" element={<BarbersDirectory />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <QuickActionsMenu />
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
