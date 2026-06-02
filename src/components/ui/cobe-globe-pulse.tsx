import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import createGlobe from "cobe";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BarberTeaserModal, type TeaserAction } from "@/components/landing/BarberTeaserModal";

interface PulseMarker {
  id: string;
  location: [number, number];
  delay: number;
  flag?: string;
  city?: string;
  country?: string;
}

interface GlobePulseProps {
  markers?: PulseMarker[];
  className?: string;
  speed?: number;
}

const defaultMarkers: PulseMarker[] = [
  { id: "p1", location: [40.71, -74.01], delay: 0, flag: "🇺🇸", city: "New York", country: "US" },
  { id: "p2", location: [51.51, -0.13], delay: 0.3, flag: "🇬🇧", city: "London", country: "GB" },
  { id: "p3", location: [48.85, 2.35], delay: 0.6, flag: "🇫🇷", city: "Paris", country: "FR" },
  { id: "p4", location: [35.68, 139.65], delay: 0.9, flag: "🇯🇵", city: "Tokyo", country: "JP" },
  { id: "p5", location: [-23.55, -46.63], delay: 1.2, flag: "🇧🇷", city: "São Paulo", country: "BR" },
  { id: "p6", location: [19.43, -99.13], delay: 1.5, flag: "🇲🇽", city: "Mexico City", country: "MX" },
  { id: "p7", location: [-33.87, 151.21], delay: 1.8, flag: "🇦🇺", city: "Sydney", country: "AU" },
  { id: "p8", location: [6.52, 3.38], delay: 2.1, flag: "🇳🇬", city: "Lagos", country: "NG" },
];

// ~70 capital cities for decorative ghost flag layer
const GHOST_FLAGS: Array<{ cc: string; flag: string; loc: [number, number] }> = [
  // Required set
  { cc: "CG", flag: "🇨🇬", loc: [-4.26, 15.24] },
  { cc: "CO", flag: "🇨🇴", loc: [4.71, -74.07] },
  { cc: "CU", flag: "🇨🇺", loc: [23.13, -82.38] },
  { cc: "CW", flag: "🇨🇼", loc: [12.17, -68.99] },
  { cc: "CY", flag: "🇨🇾", loc: [35.17, 33.36] },
  { cc: "DK", flag: "🇩🇰", loc: [55.68, 12.57] },
  { cc: "DJ", flag: "🇩🇯", loc: [11.59, 43.15] },
  { cc: "DM", flag: "🇩🇲", loc: [15.30, -61.38] },
  { cc: "DO", flag: "🇩🇴", loc: [18.49, -69.93] },
  { cc: "EC", flag: "🇪🇨", loc: [-0.18, -78.47] },
  { cc: "EG", flag: "🇪🇬", loc: [30.04, 31.24] },
  { cc: "GQ", flag: "🇬🇶", loc: [3.75, 8.78] },
  { cc: "SV", flag: "🇸🇻", loc: [13.69, -89.22] },
  // Americas
  { cc: "CA", flag: "🇨🇦", loc: [45.42, -75.69] },
  { cc: "AR", flag: "🇦🇷", loc: [-34.61, -58.38] },
  { cc: "CL", flag: "🇨🇱", loc: [-33.45, -70.67] },
  { cc: "PE", flag: "🇵🇪", loc: [-12.05, -77.04] },
  { cc: "VE", flag: "🇻🇪", loc: [10.48, -66.90] },
  { cc: "BO", flag: "🇧🇴", loc: [-16.49, -68.13] },
  { cc: "PY", flag: "🇵🇾", loc: [-25.26, -57.58] },
  { cc: "UY", flag: "🇺🇾", loc: [-34.90, -56.19] },
  { cc: "GT", flag: "🇬🇹", loc: [14.63, -90.51] },
  { cc: "PA", flag: "🇵🇦", loc: [8.98, -79.52] },
  { cc: "CR", flag: "🇨🇷", loc: [9.93, -84.08] },
  { cc: "JM", flag: "🇯🇲", loc: [17.97, -76.79] },
  { cc: "HT", flag: "🇭🇹", loc: [18.59, -72.31] },
  { cc: "TT", flag: "🇹🇹", loc: [10.65, -61.51] },
  // Europe
  { cc: "DE", flag: "🇩🇪", loc: [52.52, 13.40] },
  { cc: "ES", flag: "🇪🇸", loc: [40.42, -3.70] },
  { cc: "IT", flag: "🇮🇹", loc: [41.90, 12.50] },
  { cc: "PT", flag: "🇵🇹", loc: [38.72, -9.14] },
  { cc: "NL", flag: "🇳🇱", loc: [52.37, 4.90] },
  { cc: "BE", flag: "🇧🇪", loc: [50.85, 4.35] },
  { cc: "CH", flag: "🇨🇭", loc: [46.95, 7.45] },
  { cc: "AT", flag: "🇦🇹", loc: [48.21, 16.37] },
  { cc: "SE", flag: "🇸🇪", loc: [59.33, 18.07] },
  { cc: "NO", flag: "🇳🇴", loc: [59.91, 10.75] },
  { cc: "FI", flag: "🇫🇮", loc: [60.17, 24.94] },
  { cc: "IE", flag: "🇮🇪", loc: [53.35, -6.26] },
  { cc: "PL", flag: "🇵🇱", loc: [52.23, 21.01] },
  { cc: "CZ", flag: "🇨🇿", loc: [50.08, 14.44] },
  { cc: "HU", flag: "🇭🇺", loc: [47.50, 19.04] },
  { cc: "RO", flag: "🇷🇴", loc: [44.43, 26.10] },
  { cc: "UA", flag: "🇺🇦", loc: [50.45, 30.52] },
  { cc: "TR", flag: "🇹🇷", loc: [39.93, 32.87] },
  { cc: "GR", flag: "🇬🇷", loc: [37.98, 23.73] },
  { cc: "RU", flag: "🇷🇺", loc: [55.75, 37.62] },
  // Asia
  { cc: "IN", flag: "🇮🇳", loc: [28.61, 77.21] },
  { cc: "PK", flag: "🇵🇰", loc: [33.69, 73.05] },
  { cc: "BD", flag: "🇧🇩", loc: [23.81, 90.41] },
  { cc: "CN", flag: "🇨🇳", loc: [39.90, 116.41] },
  { cc: "KR", flag: "🇰🇷", loc: [37.57, 126.98] },
  { cc: "TH", flag: "🇹🇭", loc: [13.76, 100.50] },
  { cc: "VN", flag: "🇻🇳", loc: [21.03, 105.85] },
  { cc: "ID", flag: "🇮🇩", loc: [-6.21, 106.85] },
  { cc: "PH", flag: "🇵🇭", loc: [14.60, 120.98] },
  { cc: "MY", flag: "🇲🇾", loc: [3.14, 101.69] },
  { cc: "SG", flag: "🇸🇬", loc: [1.35, 103.82] },
  { cc: "KZ", flag: "🇰🇿", loc: [51.17, 71.43] },
  // Middle East
  { cc: "SA", flag: "🇸🇦", loc: [24.71, 46.68] },
  { cc: "AE", flag: "🇦🇪", loc: [24.45, 54.38] },
  { cc: "IL", flag: "🇮🇱", loc: [31.78, 35.22] },
  { cc: "QA", flag: "🇶🇦", loc: [25.29, 51.53] },
  { cc: "JO", flag: "🇯🇴", loc: [31.95, 35.93] },
  { cc: "LB", flag: "🇱🇧", loc: [33.89, 35.50] },
  // Africa
  { cc: "ZA", flag: "🇿🇦", loc: [-25.75, 28.19] },
  { cc: "KE", flag: "🇰🇪", loc: [-1.29, 36.82] },
  { cc: "MA", flag: "🇲🇦", loc: [33.97, -6.85] },
  { cc: "DZ", flag: "🇩🇿", loc: [36.75, 3.06] },
  { cc: "TN", flag: "🇹🇳", loc: [36.81, 10.18] },
  { cc: "ET", flag: "🇪🇹", loc: [9.03, 38.74] },
  { cc: "GH", flag: "🇬🇭", loc: [5.60, -0.19] },
  { cc: "SN", flag: "🇸🇳", loc: [14.69, -17.45] },
  { cc: "CI", flag: "🇨🇮", loc: [6.83, -5.28] },
  // Oceania
  { cc: "NZ", flag: "🇳🇿", loc: [-41.29, 174.78] },
  { cc: "FJ", flag: "🇫🇯", loc: [-18.14, 178.44] },
];

function BarberPole({ size = 14 }: { size?: number }) {
  const w = Math.round(size * 0.36);
  return (
    <svg
      width={w}
      height={size}
      viewBox="0 0 10 28"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter:
          "drop-shadow(0 0 2px rgba(255,115,30,0.9)) drop-shadow(0 0 4px rgba(255,115,30,0.45))",
      }}
    >
      <defs>
        <clipPath id="bp-clip">
          <rect x="1.5" y="5" width="7" height="18" rx="3.5" />
        </clipPath>
      </defs>
      <rect x="0.5" y="2" width="9" height="3.5" rx="1" fill="#e8b84a" stroke="#8a6a1f" strokeWidth="0.4" />
      <rect x="0.5" y="22.5" width="9" height="3.5" rx="1" fill="#e8b84a" stroke="#8a6a1f" strokeWidth="0.4" />
      <rect x="1.5" y="5" width="7" height="18" rx="3.5" fill="#1a1a1a" />
      <g clipPath="url(#bp-clip)">
        {[-20, -16, -12, -8, -4, 0, 4, 8, 12, 16, 20].map((y, i) => (
          <rect
            key={i}
            x="-4"
            y={y}
            width="18"
            height="2.4"
            fill={i % 3 === 0 ? "#e53935" : i % 3 === 1 ? "#ffffff" : "#1e88e5"}
            transform="rotate(35 5 14)"
          />
        ))}
      </g>
      <rect x="2" y="5.5" width="1.2" height="17" rx="0.6" fill="rgba(255,255,255,0.2)" />
    </svg>
  );
}

export function GlobePulse({
  markers,
  className = "",
  speed = 0.004,
}: GlobePulseProps) {
  const liveMarkers = markers && markers.length > 0 ? markers : defaultMarkers;

  // De-dupe ghosts by country code against live markers
  const ghosts = useMemo(() => {
    const liveCC = new Set(
      liveMarkers.map((m) => (m.country || "").toUpperCase()).filter(Boolean),
    );
    return GHOST_FLAGS.filter((g) => !liveCC.has(g.cc));
  }, [liveMarkers]);

  // Stable projection-input arrays (avoid per-frame allocs)
  const liveLocs = useMemo(() => liveMarkers.map((m) => m.location), [liveMarkers]);
  const ghostLocs = useMemo(() => ghosts.map((g) => g.loc), [ghosts]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const flagRefs = useRef<Array<HTMLDivElement | null>>([]);
  const ghostRefs = useRef<Array<HTMLDivElement | null>>([]);

  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const phiRef = useRef(0);
  const zoomRef = useRef(1);
  const targetPhiOffsetRef = useRef<number | null>(null);
  const targetThetaOffsetRef = useRef<number | null>(null);
  const focusStartRef = useRef(0);
  const focusFromPhiRef = useRef(0);
  const focusFromThetaRef = useRef(0);
  const visibleRef = useRef(true);
  const isInteractingRef = useRef(false);
  const lastInteractAtRef = useRef(0);
  // zoom intentionally fixed at 1 — pinch/wheel zoom disabled.
  const [ready, setReady] = useState(false);
  const [chip, setChip] = useState<PulseMarker | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const chipTimerRef = useRef<number | null>(null);
  const [teaser, setTeaser] = useState<{ open: boolean; action: TeaserAction }>({ open: false, action: "find" });
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!containerRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    io.observe(containerRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let animationId: number;
    let phi = 0;
    let frame = 0;

    const isMobile =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(max-width: 768px)").matches ||
        /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));

    function projectGroup(
      locs: Array<[number, number]>,
      refs: Array<HTMLDivElement | null>,
      ghost: boolean,
    ) {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const size = overlay.clientWidth;
      const radius = size / 2;
      const theta = 0.2 + thetaOffsetRef.current;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const currentPhi = phiRef.current;

      for (let i = 0; i < locs.length; i++) {
        const el = refs[i];
        if (!el) continue;
        const loc = locs[i];
        const latRad = (loc[0] * Math.PI) / 180;
        const lonRad = (loc[1] * Math.PI) / 180;
        const lon = lonRad - currentPhi - Math.PI / 2;
        let x = Math.cos(latRad) * Math.sin(lon);
        let y = Math.sin(latRad);
        let z = Math.cos(latRad) * Math.cos(lon);
        const y2 = y * cosT - z * sinT;
        const z2 = y * sinT + z * cosT;
        y = y2;
        z = z2;

        const r = radius * 0.9 * zoomRef.current;
        const px = radius + x * r;
        const py = radius - y * r;
        const visible = z > 0.05;
        const scale = ghost ? 0.5 + z * 0.22 : 0.7 + z * 0.4;
        // Anchor is zero-size at projected point; child handles centering.
        el.style.transform = `translate3d(${px}px, ${py}px, 0) scale(${scale})`;
        const maxOpacity = ghost ? 0.45 : 1;
        el.style.opacity = visible
          ? String(Math.min(maxOpacity, z * (ghost ? 0.9 : 1.6)))
          : "0";
        if (!ghost) {
          el.style.pointerEvents = visible ? "auto" : "none";
        }
      }
    }

    function init() {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
      const renderScale = isMobile ? 1 : 2;

      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width: width * renderScale,
        height: width * renderScale,
        phi: 0,
        theta: 0.2,
        dark: 1,
        diffuse: 0.8,
        mapSamples: isMobile ? 5000 : 16000,
        mapBrightness: 4,
        baseColor: [0.06, 0.22, 0.32],
        markerColor: [1, 0.45, 0.1],
        glowColor: [0.7, 0.32, 0.07],
        markers: [],
      });

      function animate() {
        if (!visibleRef.current) {
          animationId = requestAnimationFrame(animate);
          return;
        }

        if (targetPhiOffsetRef.current !== null && targetThetaOffsetRef.current !== null) {
          const t = Math.min(1, (performance.now() - focusStartRef.current) / 800);
          const ease = 1 - Math.pow(1 - t, 3);
          phiOffsetRef.current =
            focusFromPhiRef.current +
            (targetPhiOffsetRef.current - focusFromPhiRef.current) * ease;
          thetaOffsetRef.current =
            focusFromThetaRef.current +
            (targetThetaOffsetRef.current - focusFromThetaRef.current) * ease;
          if (t >= 1) {
            targetPhiOffsetRef.current = null;
            targetThetaOffsetRef.current = null;
          }
        } else {
          const idleMs = performance.now() - lastInteractAtRef.current;
          if (!isInteractingRef.current && idleMs > 2500) {
            phi += speed;
          }
        }

        phiRef.current = phi + phiOffsetRef.current;
        globe!.update({
          phi: phiRef.current,
          theta: 0.2 + thetaOffsetRef.current,
        });

        frame++;
        // Live flags must project every frame to stay glued to lat/lng.
        projectGroup(liveLocs, flagRefs.current, false);
        // Ghosts are decorative — throttle on mobile.
        if (!isMobile || frame % 2 === 0) {
          projectGroup(ghostLocs, ghostRefs.current, true);
        }
        animationId = requestAnimationFrame(animate);
      }
      animate();
      setReady(true);
      setTimeout(() => canvas && (canvas.style.opacity = "1"));
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect();
          init();
        }
      });
      ro.observe(canvas);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (globe) globe.destroy();
    };
  }, [liveMarkers, liveLocs, ghostLocs, speed]);

  // Unified gesture handler: native touch on mobile, pointer on desktop.
  // State machine: idle -> pan | pinch. Re-seeds pan baseline after pinch to avoid jump.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const isTouchDevice =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0);

    const markInteract = () => {
      isInteractingRef.current = true;
      lastInteractAtRef.current = performance.now();
      targetPhiOffsetRef.current = null;
      targetThetaOffsetRef.current = null;
    };
    const endInteract = () => {
      isInteractingRef.current = false;
      lastInteractAtRef.current = performance.now();
    };

    // Marker hit-test: project all live markers, return nearest within threshold.
    const hitTest = (clientX: number, clientY: number): PulseMarker | null => {
      const rect = el.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const size = rect.width;
      const radius = size / 2;
      const theta = 0.2 + thetaOffsetRef.current;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const currentPhi = phiRef.current;
      const r = radius * 0.9 * zoomRef.current;

      let best: PulseMarker | null = null;
      let bestDist = 28; // px
      for (const m of liveMarkers) {
        const latRad = (m.location[0] * Math.PI) / 180;
        const lonRad = (m.location[1] * Math.PI) / 180;
        const lon = lonRad - currentPhi - Math.PI / 2;
        let x = Math.cos(latRad) * Math.sin(lon);
        let y = Math.sin(latRad);
        let z = Math.cos(latRad) * Math.cos(lon);
        const y2 = y * cosT - z * sinT;
        const z2 = y * sinT + z * cosT;
        y = y2;
        z = z2;
        if (z <= 0.05) continue;
        const px = radius + x * r;
        const py = radius - y * r;
        const d = Math.hypot(px - localX, py - localY);
        if (d < bestDist) {
          bestDist = d;
          best = m;
        }
      }
      return best;
    };

    // Shared gesture state
    let mode: "idle" | "pan" = "idle";
    let panLastX = 0;
    let panLastY = 0;
    let panStartX = 0;
    let panStartY = 0;
    let panStartTime = 0;

    const TAP_MAX_MOVE = 8;
    const TAP_MAX_MS = 300;

    const beginPan = (x: number, y: number) => {
      mode = "pan";
      panLastX = x;
      panLastY = y;
      panStartX = x;
      panStartY = y;
      panStartTime = performance.now();
      markInteract();
    };

    const updatePan = (x: number, y: number) => {
      const dx = x - panLastX;
      const dy = y - panLastY;
      panLastX = x;
      panLastY = y;
      const rect = el.getBoundingClientRect();
      const w = rect.width || 1;
      const z = Math.max(0.85, zoomRef.current);
      phiOffsetRef.current -= (dx / w) * Math.PI * 1.2 / z;
      const nextTheta = thetaOffsetRef.current + (dy / w) * Math.PI * 1.2 / z;
      thetaOffsetRef.current = Math.max(-0.55, Math.min(0.55, nextTheta));
      lastInteractAtRef.current = performance.now();
    };

    const finishPanMaybeTap = (x: number, y: number) => {
      const moved = Math.hypot(x - panStartX, y - panStartY);
      const elapsed = performance.now() - panStartTime;
      if (moved < TAP_MAX_MOVE && elapsed < TAP_MAX_MS) {
        const hit = hitTest(x, y);
        if (hit) focusMarkerRef.current?.(hit);
      }
    };

    // ---------- Touch (mobile) ----------
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        beginPan(t.clientX, t.clientY);
      }
      // Pinch (>=2 touches) is intentionally ignored — zoom disabled.
    };
    const onTouchMove = (e: TouchEvent) => {
      if (mode === "pan" && e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0];
        updatePan(t.clientX, t.clientY);
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (mode === "pan" && e.touches.length === 0) {
        const ct = e.changedTouches[0];
        if (ct) finishPanMaybeTap(ct.clientX, ct.clientY);
        mode = "idle";
        endInteract();
      }
    };
    const onTouchCancel = () => {
      mode = "idle";
      endInteract();
    };

    // ---------- Pointer (desktop / non-touch) ----------
    const onPointerDown = (e: PointerEvent) => {
      if (isTouchDevice) return; // touch handlers own mobile
      if (e.pointerType === "touch") return;
      beginPan(e.clientX, e.clientY);
      el.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (isTouchDevice || mode !== "pan") return;
      updatePan(e.clientX, e.clientY);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (isTouchDevice || mode !== "pan") return;
      finishPanMaybeTap(e.clientX, e.clientY);
      mode = "idle";
      endInteract();
    };

    if (isTouchDevice) {
      el.addEventListener("touchstart", onTouchStart, { passive: false });
      el.addEventListener("touchmove", onTouchMove, { passive: false });
      el.addEventListener("touchend", onTouchEnd);
      el.addEventListener("touchcancel", onTouchCancel);
    } else {
      el.addEventListener("pointerdown", onPointerDown);
      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerup", onPointerUp);
      el.addEventListener("pointercancel", onPointerUp);
    }

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, [liveMarkers]);

  const focusMarker = useCallback((m: PulseMarker) => {
    const latRad = (m.location[0] * Math.PI) / 180;
    const lonRad = (m.location[1] * Math.PI) / 180;
    const phiNoOffset = phiRef.current - phiOffsetRef.current;
    const targetPhiOffset = lonRad + Math.PI / 2 - phiNoOffset;
    let delta = targetPhiOffset - phiOffsetRef.current;
    delta = ((delta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

    focusFromPhiRef.current = phiOffsetRef.current;
    focusFromThetaRef.current = thetaOffsetRef.current;
    targetPhiOffsetRef.current = phiOffsetRef.current + delta;
    const desiredTheta = Math.max(-0.6, Math.min(0.6, -latRad));
    targetThetaOffsetRef.current = desiredTheta - 0.2;
    focusStartRef.current = performance.now();

    setChip(m);
    setFocusedId(m.id);
    if (chipTimerRef.current) window.clearTimeout(chipTimerRef.current);
    chipTimerRef.current = window.setTimeout(() => {
      setChip(null);
      setFocusedId(null);
    }, 6000);
  }, []);

  const focusMarkerRef = useRef(focusMarker);
  useEffect(() => {
    focusMarkerRef.current = focusMarker;
  }, [focusMarker]);

  const handleCta = (action: TeaserAction) => {
    if (user) {
      navigate(action === "book" ? "/book-barber-near-me" : "/barbers");
      return;
    }
    setTeaser({ open: true, action });
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-square select-none ${className}`}
      style={{ touchAction: "none", overscrollBehavior: "contain" }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          opacity: 0,
          transition: "opacity 0.8s ease",
          pointerEvents: "none",
          touchAction: "none",
        }}
      />
      <div
        ref={overlayRef}
        className="absolute inset-0"
        style={{ pointerEvents: "none" }}
        aria-hidden
      >
        {ghosts.map((g, i) => (
          <div
            key={`ghost-${g.cc}`}
            ref={(el) => (ghostRefs.current[i] = el)}
            className="absolute top-0 left-0 w-0 h-0 will-change-transform"
            style={{ transition: "opacity 0.25s linear", pointerEvents: "none" }}
          >
            <span className="absolute block text-[12px] leading-none -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
              {g.flag}
            </span>
          </div>
        ))}

        {liveMarkers.map((m, i) => {
          const isFocused = focusedId === m.id;
          return (
            <div
              key={m.id}
              ref={(el) => (flagRefs.current[i] = el)}
              className="absolute top-0 left-0 w-0 h-0 will-change-transform"
              style={{ transition: "opacity 0.25s linear", pointerEvents: "none" }}
            >
              {m.flag && (
                <span
                  className={`absolute block text-[18px] leading-none -translate-x-1/2 -translate-y-1/2 whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
                    isFocused ? "ring-2 ring-orange-400/80 rounded-full px-0.5" : ""
                  }`}
                >
                  {m.flag}
                </span>
              )}
              <span
                className="absolute left-1/2 -translate-x-1/2 pointer-events-none pole-glow"
                style={{ top: m.flag ? 8 : -7 }}
              >
                <BarberPole size={14} />
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes pole-pulse {
          0%, 100% { filter: drop-shadow(0 0 2px rgba(255,140,40,0.55)) drop-shadow(0 0 4px rgba(255,140,40,0.3)); }
          50%      { filter: drop-shadow(0 0 5px rgba(255,170,60,0.95)) drop-shadow(0 0 10px rgba(255,140,40,0.7)); }
        }
        .pole-glow { animation: pole-pulse 1.8s ease-in-out infinite; }
      `}</style>

      {chip && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-3 z-20 w-[min(92%,320px)] rounded-2xl border border-orange-400/40 bg-black/85 backdrop-blur-md p-3 shadow-[0_8px_28px_rgba(255,115,30,0.35)] animate-in fade-in slide-in-from-bottom-2"
          style={{ pointerEvents: "auto" }}
        >
          <div className="flex items-center gap-2 mb-1">
            {chip.flag && <span className="text-xl leading-none">{chip.flag}</span>}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">
                {chip.city ?? "Live barber"}
                {chip.country ? <span className="text-white/60 font-medium">, {chip.country}</span> : null}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-orange-400/90 font-semibold">
                Live barbers nearby
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={() => handleCta("find")}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white text-xs font-semibold py-2 px-2 border border-white/15 transition"
            >
              <MapPin className="w-3.5 h-3.5" /> Find Near You
            </button>
            <button
              type="button"
              onClick={() => handleCta("book")}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-black text-xs font-bold py-2 px-2 transition shadow-[0_0_12px_rgba(255,140,40,0.55)]"
            >
              <Calendar className="w-3.5 h-3.5" /> Book Now
            </button>
          </div>
        </div>
      )}

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/40">
          loading globe…
        </div>
      )}

      <BarberTeaserModal
        open={teaser.open}
        onOpenChange={(open) => setTeaser((s) => ({ ...s, open }))}
        action={teaser.action}
        city={chip?.city}
        country={chip?.country}
        flag={chip?.flag}
      />
    </div>
  );
}

export default GlobePulse;
