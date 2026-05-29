import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfileValidator } from '@/hooks/useProfileValidator';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { AuthModalV2 } from '@/components/auth/AuthModalV2';
import { ProfileSetupPrompt } from '@/components/auth/ProfileSetupPrompt';
import { CreatorActionBar } from '@/components/creator/CreatorActionBar';
import { UploadDrawer } from '@/components/creator/UploadDrawer';
import { CreateBattleDrawer } from '@/components/creator/CreateBattleDrawer';
import { DealsDrawer } from '@/components/creator/DealsDrawer';
import { CreatorStatsDrawer } from '@/components/creator/CreatorStatsDrawer';
import { ChallengeModal } from '@/components/battles/ChallengeModal';
import { AcademyRail, type AcademyCourse } from '@/components/academy/AcademyRail';
import { CourseDetailDrawer } from '@/components/academy/CourseDetailDrawer';
import Header from '@/components/Header';
import { BottomNavBar } from '@/components/BottomNavBar';
import { toast } from 'sonner';
import { Crown, Scissors, Camera, ArrowRight, GraduationCap, Sparkles } from 'lucide-react';

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
  const [showSignup, setShowSignup] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<AcademyCourse | null>(null);

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
        {/* Page icon only — title lives in the dynamic header */}
        <div className="flex items-center justify-center pt-6 pb-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150" />
            <Crown className="h-8 w-8 text-primary relative" />
          </div>
        </div>


        {/* Compact Camera Studio pill — directly under title (~70% smaller) */}
        <div className="px-4 pb-5 flex justify-center">
          <button
            onClick={() => navigate('/studio')}
            className="group flex items-center gap-2.5 px-4 h-11 rounded-full border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/5 to-background hover:border-primary/60 hover:shadow-[0_0_20px_rgba(255,107,5,0.3)] active:scale-[0.97] transition-all"
          >
            <div className="rounded-full bg-primary/15 border border-primary/30 p-1.5">
              <Camera className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-xs font-bold tracking-wider uppercase text-foreground">
              Camera Studio
            </span>
            <ArrowRight className="h-3 w-3 text-primary group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="px-4 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
              Quick Actions
            </span>
            <div className="flex-1 h-px bg-border/40" />
          </div>
          <CreatorActionBar
            onUpload={() => setShowUpload(true)}
            onBattle={() => setShowBattle(true)}
            onChallenge={() => setShowChallenge(true)}
            onDeals={() => setShowDeals(true)}
            onStats={() => setShowStats(true)}
            onAcademy={() => {
              // Smooth scroll to Academy section
              document.getElementById('academy-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        </div>

        {/* BarberHub Academy Section */}
        <div id="academy-section" className="px-4 pb-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
              BarberHub Academy
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-primary/60 via-border/40 to-transparent" />
          </div>

          {/* Become an Educator CTA — barbers only */}
          <button
            onClick={() => setShowUpload(true)}
            className="w-full rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-4 text-left hover:border-primary/50 hover:shadow-[0_0_25px_rgba(255,107,5,0.2)] active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/15 border border-primary/30 p-2.5 flex-shrink-0">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-foreground tracking-tight">Become an Educator</h3>
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                  Publish technique videos & courses — earn 85% in BB
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
            </div>
          </button>

          {/* Featured Courses */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Featured Courses
              </h3>
              <span className="text-[10px] text-muted-foreground">Pay with BB</span>
            </div>
            <AcademyRail onCourseSelect={setSelectedCourse} />
          </div>

          {/* Mini stat strip */}
          <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden border border-border/30 bg-border/30">
            <div className="bg-card/60 px-3 py-2.5">
              <div className="text-base font-black text-primary leading-none">85%</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">
                Educator Cut
              </div>
            </div>
            <div className="bg-card/60 px-3 py-2.5">
              <div className="text-base font-black text-primary leading-none">BB</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">
                Paywall Currency
              </div>
            </div>
            <div className="bg-card/60 px-3 py-2.5">
              <div className="text-base font-black text-primary leading-none">∞</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">
                Lifetime Access
              </div>
            </div>
          </div>
        </div>

        {/* Your Content placeholder */}
        <div className="px-4 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
              Your Content
            </span>
            <div className="flex-1 h-px bg-border/40" />
          </div>
          <div className="rounded-2xl border border-border/20 bg-card/30 p-5 text-center">
            <p className="text-xs text-muted-foreground">Your published content will appear here</p>
          </div>
        </div>
      </div>

      {/* Drawers / Modals */}
      <UploadDrawer isOpen={showUpload} onClose={() => setShowUpload(false)} />
      <CreateBattleDrawer isOpen={showBattle} onClose={() => setShowBattle(false)} />
      <DealsDrawer isOpen={showDeals} onClose={() => setShowDeals(false)} />
      <CreatorStatsDrawer isOpen={showStats} onClose={() => setShowStats(false)} />
      <ChallengeModal open={showChallenge} onClose={() => setShowChallenge(false)} />
      <CourseDetailDrawer course={selectedCourse} onClose={() => setSelectedCourse(null)} />

      <BottomNavBar />
    </>
  );
}
