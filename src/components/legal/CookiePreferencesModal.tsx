import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { acceptAll, getConsent, setConsent } from '@/lib/consent';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const ROW_BASE =
  'rounded-[12px] p-3 border border-cyan-500/25 bg-background/60 backdrop-blur-sm';

export function CookiePreferencesModal({ open, onOpenChange }: Props) {
  const initial = getConsent();
  const [analytics, setAnalytics] = useState(initial.analytics);
  const [functional, setFunctional] = useState(initial.functional);
  const [marketing, setMarketing] = useState(initial.marketing);

  useEffect(() => {
    if (open) {
      const c = getConsent();
      setAnalytics(c.analytics);
      setFunctional(c.functional);
      setMarketing(c.marketing);
    }
  }, [open]);

  const save = () => {
    setConsent({ analytics, functional, marketing });
    onOpenChange(false);
  };
  const all = () => {
    acceptAll();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px] rounded-[16px] border-cyan-500/40 bg-background/95 backdrop-blur-xl"
        style={{ boxShadow: '0 0 40px -10px hsl(var(--cyan) / 0.5)' }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight text-white">
            Manage Cookie Preferences
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Pick what you're okay with. You can change this any time from the footer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className={ROW_BASE}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold uppercase tracking-wide text-white">Essential</span>
                  <Lock className="w-3 h-3 text-cyan-400" />
                  <span className="text-[10px] font-bold text-cyan-300 uppercase">Always On</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  These keep you logged in, protect your account, and let payments work. (Includes: Supabase auth, Stripe session)
                </p>
              </div>
              <Switch checked disabled />
            </div>
          </div>

          <div className={ROW_BASE}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <span className="text-sm font-bold uppercase tracking-wide text-white">Analytics</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Help us understand which features get used and where things break.
                </p>
              </div>
              <Switch checked={analytics} onCheckedChange={setAnalytics} />
            </div>
          </div>

          <div className={ROW_BASE}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <span className="text-sm font-bold uppercase tracking-wide text-white">Functional</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Remember your preferences, like your feed settings.
                </p>
              </div>
              <Switch checked={functional} onCheckedChange={setFunctional} />
            </div>
          </div>

          <div className={ROW_BASE}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <span className="text-sm font-bold uppercase tracking-wide text-white">Marketing</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Let us show you relevant Barber-Hub content on other platforms. (Includes: Facebook Pixel)
                </p>
              </div>
              <Switch checked={marketing} onCheckedChange={setMarketing} />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-4">
          <Button
            variant="outline"
            onClick={save}
            className="flex-1 rounded-[12px] border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-200"
          >
            Save preferences
          </Button>
          <Button
            onClick={all}
            className="flex-1 rounded-[12px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wide"
          >
            Accept All
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
