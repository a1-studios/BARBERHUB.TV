import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const ZION_BLUE = '#002D62';

export default function M4MVerify() {
  const { barberUserId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const { data: barber, isLoading } = useQuery({
    queryKey: ['m4m-barber', barberUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('name, m4m_certified, m4m_lives_touched, user_id')
        .eq('user_id', barberUserId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!barberUserId,
  });

  const handleVerify = async () => {
    if (!user?.id) {
      toast.error('Please sign in first to verify your session.');
      navigate(`/auth?redirect=/m4m/verify/${barberUserId}`);
      return;
    }

    setVerifying(true);
    try {
      // Create a session log entry directly
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Insert session log
      const { error: insertError } = await supabase
        .from('m4m_session_logs')
        .insert({
          barber_user_id: barberUserId,
          verification_code: code,
          verified: true,
          client_user_id: user.id,
          verified_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Increment lives touched
      const { error: updateError } = await supabase
        .from('barber_profiles')
        .update({ m4m_lives_touched: (barber?.m4m_lives_touched || 0) + 1 })
        .eq('user_id', barberUserId);

      if (updateError) throw updateError;

      setVerified(true);
      toast.success('Session verified! Thank you for connecting.');
    } catch (err) {
      console.error('M4M QR verify error:', err);
      toast.error('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!barber || !barber.m4m_certified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center space-y-4">
            <p className="text-muted-foreground">This barber is not M4M certified.</p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-primary/5">
      <Card className="max-w-md w-full border-2" style={{ borderColor: ZION_BLUE + '40' }}>
        <CardContent className="py-8 text-center space-y-6">
          {/* Heart icon */}
          <div className="text-6xl">♥</div>

          <div>
            <h1 className="text-2xl font-bold" style={{ color: ZION_BLUE }}>Minutes for Men</h1>
            <p className="text-muted-foreground mt-1">Session Verification</p>
          </div>

          <div>
            <p className="text-lg font-semibold">{barber.name}</p>
            <p className="text-sm text-muted-foreground">
              has touched <span className="font-bold" style={{ color: ZION_BLUE }}>{barber.m4m_lives_touched}</span> lives
            </p>
          </div>

          {verified ? (
            <div className="space-y-4">
              <div className="text-4xl">✅</div>
              <p className="font-semibold text-lg">Session Verified!</p>
              <p className="text-sm text-muted-foreground">
                Thank you for connecting. Your session has been logged.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Go Home
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Did you just complete an 8-minute peer support conversation with this barber? Tap below to verify.
              </p>
              {!user ? (
                <Button
                  className="w-full"
                  onClick={() => navigate(`/auth?redirect=/m4m/verify/${barberUserId}`)}
                >
                  Sign In to Verify
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={handleVerify}
                  disabled={verifying}
                  style={{ backgroundColor: ZION_BLUE }}
                >
                  {verifying ? 'Verifying...' : 'Confirm Session ♥'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
