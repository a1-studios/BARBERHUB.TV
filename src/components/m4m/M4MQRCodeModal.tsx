import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { M4MQRCode } from './M4MQRCode';

interface M4MQRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barberName: string;
  barberUserId: string;
  livesTouched: number;
}

export function M4MQRCodeModal({
  open,
  onOpenChange,
  barberName,
  barberUserId,
  livesTouched,
}: M4MQRCodeModalProps) {
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
            <p>Lives Touched: ${livesTouched}</p>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Your M4M QR Code</DialogTitle>
          <DialogDescription className="text-center">
            You've touched <span className="font-bold text-[#002D62]">{livesTouched}</span> lives. Share this QR code with clients after each session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex justify-center">
            <M4MQRCode barberUserId={barberUserId} size={200} />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Clients scan this after an 8-minute conversation to verify the session.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handlePrintCertificate}>
              Download PDF
            </Button>
            <Button className="flex-1" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
