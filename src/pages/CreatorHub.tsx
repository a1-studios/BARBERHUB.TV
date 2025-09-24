import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { CreatorDashboard } from '@/components/creator/CreatorDashboard';
import { EarningSystem } from '@/components/creator/EarningSystem';
import { ReferralProgram } from '@/components/creator/ReferralProgram';
import { BackButton } from '@/components/ui/BackButton';
import { 
  Crown,
  Scissors
} from 'lucide-react';

export default function CreatorHub() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="container mx-auto text-center">
          <div className="animate-pulse">Loading Creator Hub...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-24 px-4 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto">
          <BackButton />
          <div className="text-center space-y-6 mt-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">
                <span className="text-white">CREATOR</span>
                <span className="text-primary">-HUB</span>
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Join thousands of barbers earning Barber Bucks by sharing techniques, tutorials, and building the community.
            </p>
            
            <AuthDialog>
              <Button size="lg" className="btn-primary">
                <Scissors className="mr-2 h-5 w-5" />
                Start Creating Today
              </Button>
            </AuthDialog>
            
            <p className="text-sm text-muted-foreground">
              Join the community • Share your skills • Earn rewards
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto space-y-12">
        <BackButton />
        
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">
              <span className="text-white">CREATOR</span>
              <span className="text-primary">-HUB</span>
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Welcome back! Manage your content, track earnings, and grow your barbering empire.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <CreatorDashboard />
            <EarningSystem />
          </div>
          <div className="space-y-8">
            <ReferralProgram />
          </div>
        </div>
      </div>
    </div>
  );
}