import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share, Plus, Smartphone } from "lucide-react";

const DISMISS_KEY = "bh_install_dismissed_until";
const DISMISS_MS = 24 * 60 * 60 * 1000;

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari
  // @ts-expect-error legacy iOS prop
  if (window.navigator.standalone) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}

function isPreviewOrIframe(): boolean {
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  return h.includes("id-preview--") || h.includes("lovableproject.com");
}

export default function IOSInstallPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isIOS() || isStandalone() || isPreviewOrIframe()) return;
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (until && Date.now() < until) return;

    const t = setTimeout(() => setOpen(true), 10_000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <DialogContent className="max-w-sm border-primary/30 bg-background">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/40">
            <Smartphone className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">Install Barber-Hub</DialogTitle>
          <DialogDescription className="text-center">
            Never miss a booking. Install Barber-Hub to your home screen for real-time schedule updates.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3 py-2 text-sm">
          <li className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 font-semibold text-primary">1</span>
            <span className="flex items-center gap-2">
              Tap the <Share className="inline h-4 w-4" /> Share button in Safari
            </span>
          </li>
          <li className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 font-semibold text-primary">2</span>
            <span className="flex items-center gap-2">
              Choose <Plus className="inline h-4 w-4" /> "Add to Home Screen"
            </span>
          </li>
          <li className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 font-semibold text-primary">3</span>
            <span>Tap "Add" — done.</span>
          </li>
        </ol>

        <Button variant="outline" className="w-full" onClick={dismiss}>
          Maybe later
        </Button>
      </DialogContent>
    </Dialog>
  );
}
