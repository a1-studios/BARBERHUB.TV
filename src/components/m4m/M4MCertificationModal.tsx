import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { M4MQRCode } from './M4MQRCode';

interface M4MCertificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barberName: string;
  barberUserId: string;
}

export function M4MCertificationModal({
  open,
  onOpenChange,
  barberName,
  barberUserId,
}: M4MCertificationModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [pledgeAccepted, setPledgeAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCertify = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('barber_profiles')
        .update({ m4m_certified: true })
        .eq('user_id', barberUserId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['barber-profile'] });
      queryClient.invalidateQueries({ queryKey: ['barber-subscription-tier'] });
      queryClient.invalidateQueries({ queryKey: ['barber-public-profile'] });
      setStep(3);
      toast.success('You are now M4M Certified!');
    } catch (err) {
      console.error('M4M certification error:', err);
      toast.error('Failed to certify. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state on close
      setStep(1);
      setPledgeAccepted(false);
    }
    onOpenChange(isOpen);
  };

  const handlePrintCertificate = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const verifyUrl = `${window.location.origin}/m4m/verify/${barberUserId}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>M4M Certificate - ${barberName}</title>
        <style>
          body { font-family: Georgia, serif; text-align: center; padding: 60px 40px; color: #002D62; }
          .border { border: 4px double #002D62; padding: 40px; margin: 20px; }
          h1 { font-size: 36px; margin-bottom: 8px; }
          h2 { font-size: 24px; font-weight: normal; margin-bottom: 30px; }
          .name { font-size: 32px; font-weight: bold; border-bottom: 2px solid #002D62; display: inline-block; padding: 0 20px 4px; margin: 20px 0; }
          .qr-section { margin-top: 30px; }
          .qr-section p { font-size: 14px; color: #666; }
          .footer { margin-top: 40px; font-size: 12px; color: #888; }
        </style>
      </head>
      <body>
        <div class="border">
          <h1>♥ Minutes for Men ♥</h1>
          <h2>Certificate of Commitment</h2>
          <p>This certifies that</p>
          <div class="name">${barberName}</div>
          <p>has pledged to offer 8-minute peer support conversations<br/>to promote mental health and human connection in the barbershop.</p>
          <div class="qr-section">
            <p>Scan QR to verify a session:</p>
            <img id="qr" style="width:150px;height:150px;margin:10px auto;" />
            <p style="font-size:11px;">${verifyUrl}</p>
          </div>
          <div class="footer">
            <p>Barber Battle Arena — Minutes for Men Initiative</p>
          </div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"><\/script>
        <script>
          QRCode.toDataURL('${verifyUrl}', { width: 150, margin: 1 }, function(err, url) {
            if (!err) document.getElementById('qr').src = url;
            setTimeout(function() { window.print(); }, 500);
          });
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl">What is Minutes for Men?</DialogTitle>
              <DialogDescription className="text-center">
                A grassroots initiative connecting barbers and their clients through 8-minute peer support conversations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                As a barber, you're already a trusted confidant. M4M formalizes this by encouraging you to offer
                brief, structured moments of genuine conversation—helping men open up about mental health in a safe,
                familiar environment.
              </p>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>✅ Completely free to join</li>
                <li>✅ No clinical training required</li>
                <li>✅ 8 minutes of genuine conversation</li>
                <li>✅ Track your impact with "Lives Touched"</li>
              </ul>
              <Button className="w-full" onClick={() => setStep(2)}>
                I'm Interested — Next
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl">Take the Pledge</DialogTitle>
              <DialogDescription className="text-center">
                Commit to being a space for connection.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                <p>By becoming M4M Certified, you pledge to:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Offer 8-minute conversations with an open mind</li>
                  <li>Listen without judgment</li>
                  <li>Respect absolute privacy — what's said in the chair stays in the chair</li>
                  <li>Encourage professional help when needed</li>
                </ul>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="pledge"
                  checked={pledgeAccepted}
                  onCheckedChange={(checked) => setPledgeAccepted(checked === true)}
                />
                <label htmlFor="pledge" className="text-sm cursor-pointer">
                  I pledge to offer 8-minute peer support conversations and uphold the values of Minutes for Men.
                </label>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={!pledgeAccepted || saving}
                  onClick={handleCertify}
                >
                  {saving ? 'Certifying...' : 'Become M4M Certified'}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl">🎉 You Are M4M Certified!</DialogTitle>
              <DialogDescription className="text-center">
                Your heart now glows with purpose. Share your QR code with clients after each session.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex justify-center">
                <M4MQRCode barberUserId={barberUserId} size={180} />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Clients scan this code after an 8-minute session to verify the connection.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handlePrintCertificate}>
                  Download PDF
                </Button>
                <Button className="flex-1" onClick={() => handleClose(false)}>
                  Done
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
