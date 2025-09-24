import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useNavigate } from 'react-router-dom';
import { EarningSystem } from './EarningSystem';
import { ReferralProgram } from './ReferralProgram';
import { 
  Scissors, 
  DollarSign, 
  Users, 
  Trophy, 
  Star,
  TrendingUp,
  Gift,
  Crown
} from 'lucide-react';

export function CreatorHub() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="animate-pulse">Loading Creator Hub...</div>
        </div>
      </section>
    );
  }

  if (user) {
    return (
      <section className="py-20 px-4 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto">
        <button 
          onClick={() => navigate('/creator-hub')}
          className="w-full bg-background/95 backdrop-blur border-2 border-primary/30 rounded-xl p-8 hover:border-primary/50 transition-all duration-300 shadow-[0_0_30px_rgba(255,107,5,0.3)] hover:shadow-[0_0_50px_rgba(255,107,5,0.5)]"
        >
          <div className="flex items-center justify-center gap-3">
            <Crown className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold">
              <span className="text-white">CREATOR</span>
              <span className="text-primary">-HUB</span>
            </span>
          </div>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
            Welcome back! Manage your content, track earnings, and grow your barbering empire.
          </p>
        </button>
      </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto">
        <button 
          onClick={() => navigate('/creator-hub')}
          className="w-full bg-background/95 backdrop-blur border-2 border-primary/30 rounded-xl p-8 hover:border-primary/50 transition-all duration-300 shadow-[0_0_30px_rgba(255,107,5,0.3)] hover:shadow-[0_0_50px_rgba(255,107,5,0.5)]"
        >
          <div className="flex items-center justify-center gap-3">
            <Crown className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold">
              <span className="text-white">CREATOR</span>
              <span className="text-primary">-HUB</span>
            </span>
          </div>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
            Join thousands of barbers earning Barber Bucks by sharing techniques, tutorials, and building the community.
          </p>
        </button>
      </div>
    </section>
  );
}