import { Download } from "lucide-react";
import { openInstallPrompt, isStandalone } from "@/lib/installPromptBus";

export default function InstallAppButton() {
  // Hide if already installed
  if (typeof window !== "undefined" && isStandalone()) return null;

  return (
    <button
      onClick={openInstallPrompt}
      className="mt-2 flex w-full items-center justify-between rounded-xl border border-[hsl(20_100%_56%/0.35)] bg-gradient-to-r from-[hsl(20_100%_56%/0.12)] to-[hsl(20_100%_56%/0.04)] px-4 py-3 transition-all active:scale-[0.99] hover:border-[hsl(20_100%_56%/0.6)]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(20_100%_56%/0.2)] ring-1 ring-[hsl(20_100%_56%/0.4)]">
          <Download className="h-4 w-4 text-[hsl(20_100%_65%)]" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground">Install App</p>
          <p className="text-xs text-muted-foreground">Save Barber-Hub to your home screen</p>
        </div>
      </div>
      <span className="text-[10px] font-black uppercase tracking-wider text-[hsl(20_100%_65%)]">
        Install ›
      </span>
    </button>
  );
}
