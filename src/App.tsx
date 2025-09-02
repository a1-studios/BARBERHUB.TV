
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/auth/AuthGuard";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import BattlesPage from "./pages/BattlesPage";
import CreateBattle from "./pages/CreateBattle";
import BattleDetails from "./pages/BattleDetails";
import HaircutAdvisor from "./pages/HaircutAdvisor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
              element={
                <AuthGuard>
                  <BattlesPage />
                </AuthGuard>
              } 
            />
            <Route 
              path="/battles/create" 
              element={
                <AuthGuard>
                  <CreateBattle />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
