import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, AlertCircle } from "lucide-react";
import { subscribeToPush } from "@/lib/pwa";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

function platformLabel(): string {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  // @ts-expect-error legacy iOS prop
  if (window.navigator.standalone) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export default function NotificationToggle() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setSupported(false);
        setLoading(false);
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setEnabled(!!sub);
      } catch {
        // ignore
      }
      setLoading(false);
    })();
  }, []);

  const iosNeedsInstall = /iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone();

  const handleToggle = async (next: boolean) => {
    if (!user) {
      toast.error("Sign in to manage notifications");
      return;
    }
    setLoading(true);
    try {
      if (next) {
        const subJson = await subscribeToPush();
        if (!subJson || !subJson.endpoint) {
          toast.error("Notifications were not granted");
          setEnabled(false);
          return;
        }
        const { error } = await supabase
          .from("push_subscriptions")
          .upsert(
            [
              {
                user_id: user.id,
                endpoint: subJson.endpoint,
                subscription: JSON.parse(JSON.stringify(subJson)),
                user_agent: navigator.userAgent,
                platform: platformLabel(),
                last_seen_at: new Date().toISOString(),
              },
            ],
            { onConflict: "endpoint" }
          );
        if (error) throw error;
        setEnabled(true);
        toast.success("Notifications enabled");
      } else {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          await sub.unsubscribe();
        }
        setEnabled(false);
        toast.success("Notifications disabled");
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not update notification settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/50 px-4 py-3">
      <div className="flex items-center gap-3">
        {enabled ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
        <div>
          <p className="font-medium">Push notifications</p>
          <p className="text-xs text-muted-foreground">
            Get alerted about bookings, battles, and BB activity.
          </p>
          {iosNeedsInstall && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-500">
              <AlertCircle className="h-3 w-3" /> Install to home screen first to enable on iOS.
            </p>
          )}
        </div>
      </div>
      <Switch
        checked={enabled}
        disabled={loading || !supported || iosNeedsInstall}
        onCheckedChange={handleToggle}
      />
    </div>
  );
}
