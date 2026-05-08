import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';
import { acceptAll, essentialOnly, hasDecided } from '@/lib/consent';
import { CookiePreferencesModal } from './CookiePreferencesModal';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    setVisible(!hasDecided());
    const onOpen = () => setPrefsOpen(true);
    window.addEventListener('open-cookie-preferences', onOpen);
    return () => window.removeEventListener('open-cookie-preferences', onOpen);
  }, []);

  const handleAcceptAll = () => {
    acceptAll();
    setVisible(false);
  };
  const handleEssential = () => {
    essentialOnly();
    setVisible(false);
  };

  return (
    <>
      {visible && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          className="fixed inset-x-2 bottom-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-md z-[200] rounded-[16px] border border-cyan-500/40 bg-background/95 backdrop-blur-xl p-4"
          style={{ boxShadow: '0 0 32px -8px hsl(var(--cyan) / 0.55)' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-cyan-500/10 border border-cyan-500/40"
              style={{ boxShadow: 'inset 0 0 12px hsl(var(--cyan) / 0.25)' }}
            >
              <Cookie className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black uppercase tracking-tight text-white">
                We use cookies to keep the platform running and make it better.
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Some are essential (like keeping you logged in). Others help us understand how the platform's used.
                We also use a Facebook Pixel for marketing, but only with your OK.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  className="rounded-[10px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wide text-xs"
                >
                  Accept All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEssential}
                  className="rounded-[10px] border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-200 text-xs"
                >
                  Essential Only
                </Button>
                <button
                  type="button"
                  onClick={() => setPrefsOpen(true)}
                  className="text-xs text-cyan-300 hover:text-cyan-200 underline underline-offset-2 sm:ml-1 self-center"
                >
                  Manage Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <CookiePreferencesModal
        open={prefsOpen}
        onOpenChange={(o) => {
          setPrefsOpen(o);
          if (!o) setVisible(!hasDecided());
        }}
      />
    </>
  );
}
