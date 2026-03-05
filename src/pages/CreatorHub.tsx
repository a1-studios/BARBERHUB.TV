import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfileValidator } from '@/hooks/useProfileValidator';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { ProfileSetupPrompt } from '@/components/auth/ProfileSetupPrompt';
import { CreatorActionBar } from '@/components/creator/CreatorActionBar';
import { UploadDrawer } from '@/components/creator/UploadDrawer';
import { CreateBattleDrawer } from '@/components/creator/CreateBattleDrawer';
import { DealsDrawer } from '@/components/creator/DealsDrawer';
import { CreatorStatsDrawer } from '@/components/creator/CreatorStatsDrawer';
import { ChallengeModal } from '@/components/battles/ChallengeModal';
import Header from '@/components/Header';
import { BottomNavBar } from '@/components/BottomNavBar';
import { toast } from 'sonner';
import { Crown, Scissors } from 'lucide-react';

export default function CreatorHub() {
  const { user, loading } = useAuth();
  const { isBarber, isLoading: rolesLoading } = useUserRole();
  const { needsSetup, isLoading: validationLoading } = useProfileValidator();
  const navigate = useNavigate();

  const [showUpload, setShowUpload] = useState(false);
  const [showBattle, setShowBattle] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [showDeals, setShowDeals] = useState(false);
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
          <Crown className="h-12 w-12 text-primary mb-4" />
          <h1 className="text-4xl font-black mb-2 tracking-tight">
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
        {/* Centered Title — 20% larger */}
        <div className="flex flex-col items-center justify-center pt-6 pb-4">
          <Crown className="h-8 w-8 text-primary mb-2" />
          <h1 className="text-4xl font-black tracking-tight text-center">
            <span className="text-foreground">CREATOR</span>
            <span className="text-primary">-HUB</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Your content command center</p>
        </div>

        {/* Action Pills */}
        <div className="px-4 pb-4">
          <CreatorActionBar
            onUpload={() => setShowUpload(true)}
            onBattle={() => setShowBattle(true)}
            onChallenge={() => setShowChallenge(true)}
            onDeals={() => setShowDeals(true)}
            onStats={() => setShowStats(true)}
          />
        </div>

        {/* Content feed placeholder */}
        <div className="px-4">
          <div className="rounded-2xl border border-border/20 bg-card/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">Your published content will appear here</p>
          </div>
        </div>
      </div>

      {/* Drawers / Modals */}
      <UploadDrawer isOpen={showUpload} onClose={() => setShowUpload(false)} />
      <CreateBattleDrawer isOpen={showBattle} onClose={() => setShowBattle(false)} />
      <DealsDrawer isOpen={showDeals} onClose={() => setShowDeals(false)} />
      <CreatorStatsDrawer isOpen={showStats} onClose={() => setShowStats(false)} />
      {showChallenge && (
        <ChallengeModal
          isOpen={showChallenge}
          onClose={() => setShowChallenge(false)}
        />
      )}

      <BottomNavBar />
    </>
  );
}
