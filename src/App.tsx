
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RoleBasedNavigation } from "@/components/RoleBasedNavigation";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import BattlesPage from "./pages/BattlesPage";
import BattleDetails from "./pages/BattleDetails";
import CreateBattle from "./pages/CreateBattle";
import HaircutAdvisor from "./pages/HaircutAdvisor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            {/* Landing page - only for non-authenticated users */}
            <Route 
              path="/" 
              element={
                <AuthGuard requireAuth={false}>
                  <Index />
                </AuthGuard>
              } 
            />
            
            {/* Auth page - accessible to non-authenticated users */}
            <Route 
              path="/auth" 
              element={
                <AuthGuard requireAuth={false}>
                  <Auth />
                </AuthGuard>
              } 
            />
            
            {/* Protected routes - require authentication */}
            <Route 
              path="/battles" 
              element={
                <AuthGuard requireAuth={true}>
                  <RoleBasedNavigation />
                  <BattlesPage />
                </AuthGuard>
              } 
            />
            
            <Route 
              path="/battles/:id" 
              element={
                <AuthGuard requireAuth={true}>
                  <RoleBasedNavigation />
                  <BattleDetails />
                </AuthGuard>
              } 
            />
            
            <Route 
              path="/battles/create" 
              element={
                <AuthGuard requireAuth={true}>
                  <RoleBasedNavigation />
                  <CreateBattle />
                </AuthGuard>
              } 
            />
            
            <Route 
              path="/haircut-advisor" 
              element={
                <AuthGuard requireAuth={true}>
                  <RoleBasedNavigation />
                  <HaircutAdvisor />
                </AuthGuard>
              } 
            />
            
            {/* Catch all - 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  </TooltipProvider>
</QueryClientProvider>
);

export default App;
