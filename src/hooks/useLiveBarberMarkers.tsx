import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LivePulseMarker {
  id: string;
  location: [number, number];
  delay: number;
  flag?: string;
  city?: string;
  country?: string;
}

const MAX_MARKERS = 60;
const REFRESH_MS = 60_000;

function ccToFlag(cc?: string | null): string | undefined {
  if (!cc || cc.length !== 2) return undefined;
  const A = 0x1f1e6;
  const up = cc.toUpperCase();
  return String.fromCodePoint(A + up.charCodeAt(0) - 65, A + up.charCodeAt(1) - 65);
}

export function useLiveBarberMarkers() {
  const [markers, setMarkers] = useState<LivePulseMarker[] | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchOnce() {
      const { data, error } = await supabase
        .from("barber_profiles")
        .select("id, user_id, latitude, longitude, shop_city")
        .eq("location_sharing_enabled", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(200);

      if (error || !data || cancelled) return;

      const userIds = Array.from(new Set(data.map((d: any) => d.user_id).filter(Boolean)));
      let countryByUser: Record<string, string | null> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("public_user_profiles")
          .select("user_id, country_code")
          .in("user_id", userIds);
        profs?.forEach((p: any) => {
          countryByUser[p.user_id] = p.country_code;
        });
      }

      let rows = data as any[];
      if (rows.length > MAX_MARKERS) {
        rows = [...rows].sort(() => Math.random() - 0.5).slice(0, MAX_MARKERS);
      }

      const next: LivePulseMarker[] = rows.map((r, i) => {
        const cc = countryByUser[r.user_id];
        return {
          id: String(r.id),
          location: [Number(r.latitude), Number(r.longitude)],
          delay: (i % 8) * 0.3,
          flag: ccToFlag(cc) ?? "📍",
          city: r.shop_city ?? undefined,
          country: cc ?? undefined,
        };
      });

      if (!cancelled) setMarkers(next.length ? next : []);
    }

    fetchOnce();

    function schedule() {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        if (!document.hidden) fetchOnce();
      }, REFRESH_MS);
    }
    schedule();

    const onVis = () => {
      if (!document.hidden) fetchOnce();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return markers;
}
