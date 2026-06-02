import { useEffect, useMemo, useRef, useState } from "react";
import createGlobe from "cobe";

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

// Ghost flag layer — broad worldwide spread (~40 capitals). Decorative only.
const GHOST_FLAGS: Array<{ cc: string; flag: string; loc: [number, number] }> = [
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
  { cc: "CA", flag: "🇨🇦", loc: [45.42, -75.69] },
  { cc: "AR", flag: "🇦🇷", loc: [-34.61, -58.38] },
  { cc: "CL", flag: "🇨🇱", loc: [-33.45, -70.67] },
  { cc: "PE", flag: "🇵🇪", loc: [-12.05, -77.04] },
  { cc: "DE", flag: "🇩🇪", loc: [52.52, 13.40] },
  { cc: "ES", flag: "🇪🇸", loc: [40.42, -3.70] },
  { cc: "IT", flag: "🇮🇹", loc: [41.90, 12.50] },
  { cc: "PT", flag: "🇵🇹", loc: [38.72, -9.14] },
  { cc: "NL", flag: "🇳🇱", loc: [52.37, 4.90] },
  { cc: "SE", flag: "🇸🇪", loc: [59.33, 18.07] },
  { cc: "NO", flag: "🇳🇴", loc: [59.91, 10.75] },
  { cc: "PL", flag: "🇵🇱", loc: [52.23, 21.01] },
  { cc: "TR", flag: "🇹🇷", loc: [39.93, 32.87] },
  { cc: "GR", flag: "🇬🇷", loc: [37.98, 23.73] },
  { cc: "RU", flag: "🇷🇺", loc: [55.75, 37.62] },
  { cc: "IN", flag: "🇮🇳", loc: [28.61, 77.21] },
  { cc: "CN", flag: "🇨🇳", loc: [39.90, 116.41] },
  { cc: "KR", flag: "🇰🇷", loc: [37.57, 126.98] },
  { cc: "TH", flag: "🇹🇭", loc: [13.76, 100.50] },
  { cc: "ID", flag: "🇮🇩", loc: [-6.21, 106.85] },
  { cc: "PH", flag: "🇵🇭", loc: [14.60, 120.98] },
  { cc: "SA", flag: "🇸🇦", loc: [24.71, 46.68] },
  { cc: "AE", flag: "🇦🇪", loc: [24.45, 54.38] },
  { cc: "ZA", flag: "🇿🇦", loc: [-25.75, 28.19] },
  { cc: "KE", flag: "🇰🇪", loc: [-1.29, 36.82] },
  { cc: "MA", flag: "🇲🇦", loc: [33.97, -6.85] },
  { cc: "NZ", flag: "🇳🇿", loc: [-41.29, 174.78] },
];

function Razor({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: "drop-shadow(0 0 4px rgba(255,115,30,0.95)) drop-shadow(0 0 8px rgba(255,115,30,0.55))",
      }}
    >
      {/* Straight razor: blade + handle */}
      <path
        d="M3 7 L15 5 L17 9 L5 11 Z"
        fill="hsl(28, 100%, 55%)"
        stroke="hsl(28, 100%, 65%)"
        strokeWidth="0.6"
      />
      <rect
        x="14"
        y="10"
        width="8"
        height="2.4"
        rx="1.2"
        transform="rotate(18 14 10)"
        fill="hsl(28, 100%, 50%)"
        stroke="hsl(28, 100%, 70%)"
        strokeWidth="0.5"
      />
    </svg>
  );
}

export function GlobePulse({
  markers,
  className = "",
  speed = 0.004,
}: GlobePulseProps) {
  const liveMarkers = markers && markers.length > 0 ? markers : defaultMarkers;

  // De-dupe ghosts: drop any ghost whose country matches a live marker country
  const ghosts = useMemo(() => {
    const liveCC = new Set(
      liveMarkers
        .map((m) => (m.country || "").toUpperCase())
        .filter(Boolean),
    );
    return GHOST_FLAGS.filter((g) => !liveCC.has(g.cc));
  }, [liveMarkers]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const flagRefs = useRef<Array<HTMLDivElement | null>>([]);
  const ghostRefs = useRef<Array<HTMLDivElement | null>>([]);

  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const phiRef = useRef(0);
  const targetPhiOffsetRef = useRef<number | null>(null);
  const targetThetaOffsetRef = useRef<number | null>(null);
  const focusStartRef = useRef(0);
  const focusFromPhiRef = useRef(0);
  const focusFromThetaRef = useRef(0);
  const visibleRef = useRef(true);
  const [ready, setReady] = useState(false);
  const [chip, setChip] = useState<{ city?: string; country?: string } | null>(null);
  const chipTimerRef = useRef<number | null>(null);

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
      list: Array<{ location: [number, number] }>,
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

      list.forEach((m, i) => {
        const el = refs[i];
        if (!el) return;
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

        const px = radius + x * radius * 0.9;
        const py = radius - y * radius * 0.9;
        const visible = z > 0.05;
        const scale = ghost ? 0.55 + z * 0.25 : 0.7 + z * 0.4;
        el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%) scale(${scale})`;
        const maxOpacity = ghost ? 0.55 : 1;
        el.style.opacity = visible ? String(Math.min(maxOpacity, z * (ghost ? 1.0 : 1.6))) : "0";
        if (!ghost) {
          el.style.pointerEvents = visible ? "auto" : "none";
        }
      });
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
        diffuse: 1.1,
        mapSamples: isMobile ? 6000 : 16000,
        mapBrightness: 4,
        // Deep muted cyan-blue water
        baseColor: [0.06, 0.22, 0.32],
        // Orange dots under flag pins (cobe-rendered)
        markerColor: [1, 0.45, 0.1],
        // Signature neon orange atmospheric glow
        glowColor: [1, 0.45, 0.1],
        markers: liveMarkers.map((m) => ({ location: m.location, size: 0.05 })),
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
          phi += speed;
        }

        phiRef.current = phi + phiOffsetRef.current;
        globe!.update({
          phi: phiRef.current,
          theta: 0.2 + thetaOffsetRef.current,
        });

        frame++;
        if (!isMobile || frame % 2 === 0) {
          projectGroup(liveMarkers, flagRefs.current, false);
          projectGroup(
            ghosts.map((g) => ({ location: g.loc })),
            ghostRefs.current,
            true,
          );
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
  }, [liveMarkers, ghosts, speed]);

  function focusMarker(m: PulseMarker) {
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

    setChip({ city: m.city, country: m.country });
    if (chipTimerRef.current) window.clearTimeout(chipTimerRef.current);
    chipTimerRef.current = window.setTimeout(() => setChip(null), 2200);
  }

  return (
    <div ref={containerRef} className={`relative w-full aspect-square ${className}`}>
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
        {/* Ghost flag layer (decorative, ~50% visible based on hemisphere) */}
        {ghosts.map((g, i) => (
          <div
            key={`ghost-${g.cc}`}
            ref={(el) => (ghostRefs.current[i] = el)}
            className="absolute top-0 left-0 will-change-transform"
            style={{ transition: "opacity 0.25s linear", pointerEvents: "none" }}
          >
            <span className="text-[14px] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] opacity-90">
              {g.flag}
            </span>
          </div>
        ))}

        {/* Live markers (razor + flag) */}
        {liveMarkers.map((m, i) => (
          <div
            key={m.id}
            ref={(el) => (flagRefs.current[i] = el)}
            className="absolute top-0 left-0 will-change-transform cursor-pointer"
            style={{ transition: "opacity 0.25s linear", pointerEvents: "none" }}
            onClick={() => focusMarker(m)}
            onTouchStart={() => focusMarker(m)}
          >
            <div className="relative flex flex-col items-center">
              <span className="text-[18px] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {m.flag}
              </span>
              <span className="mt-[1px] inline-flex">
                <Razor size={12} />
              </span>
            </div>
          </div>
        ))}
      </div>
      {chip && (
        <div className="pointer-events-none absolute left-1/2 bottom-3 -translate-x-1/2 rounded-full bg-black/70 backdrop-blur px-3 py-1 text-[11px] font-semibold text-white border border-orange-400/40 shadow-[0_0_12px_rgba(255,115,30,0.45)]">
          {[chip.city, chip.country].filter(Boolean).join(", ") || "Live"}
        </div>
      )}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/40">
          loading globe…
        </div>
      )}
    </div>
  );
}

export default GlobePulse;
