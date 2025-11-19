
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { BarberGuard } from "@/components/auth/BarberGuard";
import { useFollowedBarbersNotifications } from "@/hooks/useFollowedBarbersNotifications";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import BattlesPage from "./pages/BattlesPage";
import CreateBattle from "./pages/CreateBattle";
import BattleDetails from "./pages/BattleDetails";
import HaircutAdvisor from "./pages/HaircutAdvisor";
import Analytics from "./pages/Analytics";
import Portal from "./pages/Portal";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import Grants from "./pages/Grants";
import CreatorHub from "./pages/CreatorHub";
import Tournaments from "@/pages/Tournaments";
import TournamentDetails from "@/pages/TournamentDetails";
import NotFound from "./pages/NotFound";
import BarberPublicProfile from "./pages/BarberPublicProfile";
import BarbersDirectory from "./pages/BarbersDirectory";

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
