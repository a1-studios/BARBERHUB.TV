import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfileValidator } from '@/hooks/useProfileValidator';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { ProfileSetupPrompt } from '@/components/auth/ProfileSetupPrompt';
import { EducatorUpload } from '@/components/creator/EducatorUpload';
import { CreatorStatsDrawer } from '@/components/creator/CreatorStatsDrawer';
import { SponsorDealBoard } from '@/components/creator/SponsorDealBoard';
import Header from '@/components/Header';
import { BottomNavBar } from '@/components/BottomNavBar';
import { toast } from 'sonner';
import { 
  Crown,
  Scissors,
  BarChart3
} from 'lucide-react';

export default function CreatorHub() {
  const { user, loading } = useAuth();
  const { isBarber, isLoading: rolesLoading } = useUserRole();
  const { needsSetup, isLoading: validationLoading } = useProfileValidator();
  const navigate = useNavigate();
  const [showStats, setShowStats] = useState(false);

  // Redirect non-barbers
  if (!loading && !rolesLoading && user && !isBarber) {
    navigate('/', { replace: true });
    toast.error('Creator Hub is only accessible to barbers');
    return null;
  }

  // Profile setup gate
  if (!loading && !rolesLoading && !validationLoading && user && isBarber && needsSetup) {
    return <ProfileSetupPrompt type="barber" />;
  }

  if (loading || rolesLoading || validationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading Creator Hub...</div>
      </div>
    );
  }

  // Unauthenticated view
  if (!user) {
    return (
      <>
        <Header />
        <div className="min-h-screen pt-16 px-4 flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted/20">
          <Crown className="h-10 w-10 text-primary mb-4" />
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-foreground">CREATOR</span>
            <span className="text-primary">-HUB</span>
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
            Upload masterclasses, tutorials, and tips. Build your legacy and earn Barber Bucks.
          </p>
          <AuthDialog>
            <Button size="lg" className="btn-primary">
              <Scissors className="mr-2 h-5 w-5" />
              Start Creating
            </Button>
          </AuthDialog>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen pt-16 pb-20 bg-gradient-to-b from-background to-muted/10">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 sticky top-16 z-10 bg-background/80 backdrop-blur-lg border-b border-border/10">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <h1 className="text-base font-bold tracking-tight">
              <span className="text-foreground">CREATOR</span>
              <span className="text-primary">-HUB</span>
            </h1>
          </div>
          <button
            onClick={() => setShowStats(true)}
            className="p-2 rounded-xl bg-card/50 border border-border/20 hover:bg-card/80 transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Main Content */}
        <div className="px-4 py-4 space-y-6">
          {/* Educator Upload — Main Stage */}
          <EducatorUpload />

          {/* Sponsor Deal Board */}
          <SponsorDealBoard />
        </div>
      </div>

      <CreatorStatsDrawer isOpen={showStats} onClose={() => setShowStats(false)} />
      <BottomNavBar />
    </>
  );
}
