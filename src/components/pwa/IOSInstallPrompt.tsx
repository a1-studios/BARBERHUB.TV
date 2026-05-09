import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Share, Plus, Smartphone, ArrowDown, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isAndroid,
  isIOS,
  isStandalone,
  onOpenInstallPrompt,
} from "@/lib/installPromptBus";

const DISMISS_KEY = "bh_install_dismissed_until";
const DISMISS_MS = 24 * 60 * 60 * 1000;

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
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
  const [pointToShare, setPointToShare] = useState(false);
  const deferredRef = useRef<BIPEvent | null>(null);

  // Capture Android beforeinstallprompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BIPEvent;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Auto-open on iOS after delay (first visit)
  useEffect(() => {
    if (isStandalone() || isPreviewOrIframe()) return;
    if (!isIOS() && !isAndroid()) return;
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (until && Date.now() < until) return;

    const t = setTimeout(() => setOpen(true), 10_000);
    return () => clearTimeout(t);
  }, []);

  // Manual open from anywhere (Profile button)
  useEffect(() => onOpenInstallPrompt(() => setOpen(true)), []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
    setPointToShare(false);
    setOpen(false);
  };

  const handlePrimary = async () => {
    if (isAndroid() && deferredRef.current) {
      try {
        await deferredRef.current.prompt();
        await deferredRef.current.userChoice;
      } catch {
        /* noop */
      }
      deferredRef.current = null;
      setOpen(false);
      return;
    }
    // iOS or Android without BIP support → guide eye to share button
    setPointToShare(true);
  };

  const ios = isIOS();

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
        <DialogContent
          className={cn(
            "max-w-sm overflow-hidden border-0 p-0",
            "bg-[hsl(220_30%_6%/0.85)] backdrop-blur-2xl",
            "shadow-[0_0_60px_-15px_hsl(20_100%_56%/0.6),0_0_120px_-40px_hsl(180_100%_50%/0.35)]",
          )}
        >
          {/* Cyber grid + glow background */}
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(hsl(180 100% 50% / 0.06) 1px, transparent 1px), linear-gradient(90deg, hsl(180 100% 50% / 0.06) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-[hsl(20_100%_56%/0.35)] blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[hsl(180_100%_50%/0.18)] blur-3xl" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/5" />
          </div>

          <div className="relative px-6 pt-7 pb-5">
            {/* Icon badge */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[hsl(20_100%_56%/0.5)] bg-gradient-to-br from-[hsl(20_100%_56%/0.25)] to-[hsl(20_100%_56%/0.05)] shadow-[0_0_30px_-5px_hsl(20_100%_56%/0.7)]">
              <Smartphone className="h-8 w-8 text-[hsl(20_100%_65%)]" strokeWidth={2.25} />
            </div>

            <DialogTitle className="text-center text-2xl font-black uppercase tracking-[0.18em] text-white">
              Install Barber-Hub
            </DialogTitle>
            <DialogDescription className="mx-auto mt-1.5 max-w-[260px] text-center text-[13px] leading-snug text-white/60">
              Never miss a booking. Pin Barber-Hub to your home screen for real-time alerts.
            </DialogDescription>

            {/* Visual timeline (NOT buttons) */}
            {ios && (
              <div className="relative mt-6 px-1">
                <div
                  aria-hidden
                  className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-[hsl(20_100%_56%/0.7)] via-[hsl(20_100%_56%/0.35)] to-transparent"
                />
                <ol className="space-y-4 text-[13px]">
                  <TimelineStep n={1}>
                    Tap the <Share className="inline h-3.5 w-3.5 -mt-0.5 text-[hsl(180_100%_70%)]" /> Share icon in Safari
                  </TimelineStep>
                  <TimelineStep n={2}>
                    Choose <Plus className="inline h-3.5 w-3.5 -mt-0.5 text-[hsl(180_100%_70%)]" /> "Add to Home Screen"
                  </TimelineStep>
                  <TimelineStep n={3}>Tap "Add" — installation complete.</TimelineStep>
                </ol>
              </div>
            )}

            {/* Primary CTA */}
            <button
              onClick={handlePrimary}
              className={cn(
                "group relative mt-6 w-full overflow-hidden rounded-xl py-4",
                "bg-gradient-to-b from-[hsl(20_100%_60%)] to-[hsl(20_100%_48%)]",
                "border border-[hsl(20_100%_70%)]/40",
                "shadow-[0_0_40px_-8px_hsl(20_100%_56%/0.9),inset_0_1px_0_hsl(0_0%_100%/0.25)]",
                "transition-transform active:scale-[0.98]",
              )}
            >
              <span className="relative z-10 flex items-center justify-center gap-2 text-[15px] font-black uppercase tracking-[0.22em] text-white drop-shadow">
                <Download className="h-4 w-4" />
                Save to Home Screen
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </button>

            {/* Tiny dismiss link */}
            <button
              onClick={dismiss}
              className="mx-auto mt-3 block text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* iOS pointer overlay — guides eye to native Safari share button */}
      {pointToShare && ios && (
        <ShareButtonPointer onClose={() => setPointToShare(false)} />
      )}
    </>
  );
}

function TimelineStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="relative flex items-center gap-4 pl-0">
      <span
        className={cn(
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          "bg-gradient-to-br from-[hsl(20_100%_56%)] to-[hsl(20_100%_42%)]",
          "text-sm font-black text-white",
          "shadow-[0_0_18px_-2px_hsl(20_100%_56%/0.8)]",
          "ring-1 ring-[hsl(20_100%_70%)]/40",
        )}
      >
        {n}
      </span>
      <span className="text-white/85 leading-snug">{children}</span>
    </li>
  );
}

function ShareButtonPointer({ onClose }: { onClose: () => void }) {
  // iOS Safari share button is in the bottom toolbar (iPhone) or top (iPad).
  // We point downward by default — covers iPhone (the dominant case).
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm pb-8"
    >
      <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
        <p className="rounded-full border border-[hsl(180_100%_50%/0.5)] bg-black/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(180_100%_85%)] shadow-[0_0_30px_-5px_hsl(180_100%_50%/0.8)]">
          Tap the Share button below
        </p>
        <ArrowDown
          className="h-20 w-20 text-[hsl(180_100%_70%)] animate-bounce"
          style={{
            filter:
              "drop-shadow(0 0 12px hsl(180 100% 50% / 0.9)) drop-shadow(0 0 24px hsl(180 100% 50% / 0.6))",
          }}
          strokeWidth={2.5}
        />
      </div>
    </div>
  );
}
