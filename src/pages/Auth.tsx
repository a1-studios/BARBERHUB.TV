import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { Button } from '@/components/ui/button';
import { Scissors, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const claimAttempted = useRef(false);

  useEffect(() => {
    if (!user || loading) return;

    // Auto-claim pending spin prize from guest session
    if (!claimAttempted.current) {
      claimAttempted.current = true;
      try {
        const raw = localStorage.getItem('pending_spin_prize');
        if (raw) {
          const pending = JSON.parse(raw);
          const ageMs = Date.now() - (pending.timestamp || 0);

          // Validate role match — check user metadata since useUserRole may not be loaded yet
          const userType = user.user_metadata?.user_type;
          if (pending.role && userType && pending.role !== userType) {
            console.log('[Auth Spin] Role mismatch: prize for', pending.role, 'but user is', userType);
            localStorage.removeItem('pending_spin_prize');
          } else if (ageMs < 24 * 60 * 60 * 1000) {
            supabase.functions.invoke('spin-wheel', {
              body: {
                role: pending.role || 'fan',
                prize_id: pending.prize_id,
                prize_bb: pending.prize_bb || 0,
                prize_type: pending.prize_type || 'bb',
                prize_label: pending.prize_label || 'Spin Prize',
                duration_months: pending.duration_months || 0,
                is_free_spin: true,
              },
            }).then(({ data, error }) => {
              if (!error && data?.success) {
                localStorage.removeItem('pending_spin_prize');
                queryClient.invalidateQueries({ queryKey: ['barber_bucks'] });
                queryClient.invalidateQueries({ queryKey: ['user_prizes'] });
                toast.success(`🎰 Prize claimed: ${pending.prize_label}!`);
              } else {
                localStorage.removeItem('pending_spin_prize');
              }
            });
          } else {
            localStorage.removeItem('pending_spin_prize');
          }
        }
      } catch {
        localStorage.removeItem('pending_spin_prize');
      }
    }

    navigate('/');
  }, [user, loading, navigate, queryClient]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          
          <div className="flex items-center justify-center gap-2">
            <Scissors className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gradient">Barber Hub</h1>
          </div>
          
          <p className="text-muted-foreground">
            Join the community of professional barbers
          </p>
        </div>

        <AuthDialog>
          <Button size="lg" className="w-full btn-primary">
            Get Started
          </Button>
        </AuthDialog>
      </div>
    </div>
  );
}