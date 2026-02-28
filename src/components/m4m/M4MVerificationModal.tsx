import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface M4MVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barberName: string;
  barberUserId: string;
  livesTouched: number;
}

export function M4MVerificationModal({
  open,
  onOpenChange,
  barberName,
  barberUserId,
  livesTouched,
}: M4MVerificationModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (!user?.id) {
      toast.error('Please sign in to verify a session');
      return;
    }
    if (code.length !== 4) {
      toast.error('Please enter the full 4-digit code');
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.rpc('verify_m4m_session', {
        p_code: code,
        p_client_id: user.id,
      });

      if (error) throw error;

      if (data) {
        toast.success('Session verified! Thank you for connecting.');
        queryClient.invalidateQueries({ queryKey: ['barber-extra-profile'] });
        queryClient.invalidateQueries({ queryKey: ['barber-subscription-tier'] });
        queryClient.invalidateQueries({ queryKey: ['barber-public-profile'] });
        queryClient.invalidateQueries({ queryKey: ['public-barber-profile'] });
        setCode('');
        onOpenChange(false);
      } else {
        toast.error('Invalid or expired code. Please try again.');
      }
    } catch (err: any) {
      console.error('M4M verify error:', err);
      toast.error('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Minutes for Men Impact</DialogTitle>
          <DialogDescription className="text-center">
            <span className="font-semibold text-foreground">{barberName}</span> has touched{' '}
            <span className="font-bold text-[#002D62]">{livesTouched}</span> lives through M4M peer support.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-sm text-muted-foreground text-center">
            If you just completed an 8-minute session, enter the 4-digit code your barber provided to verify the connection.
          </p>

          <div className="flex justify-center">
            <InputOTP maxLength={4} value={code} onChange={setCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={code.length !== 4 || verifying}
          >
            {verifying ? 'Verifying...' : 'Verify Connection'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
