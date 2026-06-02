import { useEffect, useRef, useState } from "react";
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
  { id: "p1", location: [40.71, -74.01], delay: 0, flag: "🇺🇸", city: "New York" },
  { id: "p2", location: [51.51, -0.13], delay: 0.3, flag: "🇬🇧", city: "London" },
  { id: "p3", location: [48.85, 2.35], delay: 0.6, flag: "🇫🇷", city: "Paris" },
  { id: "p4", location: [35.68, 139.65], delay: 0.9, flag: "🇯🇵", city: "Tokyo" },
  { id: "p5", location: [-23.55, -46.63], delay: 1.2, flag: "🇧🇷", city: "São Paulo" },
  { id: "p6", location: [19.43, -99.13], delay: 1.5, flag: "🇲🇽", city: "Mexico City" },
  { id: "p7", location: [-33.87, 151.21], delay: 1.8, flag: "🇦🇺", city: "Sydney" },
  { id: "p8", location: [6.52, 3.38], delay: 2.1, flag: "🇳🇬", city: "Lagos" },
];

export function GlobePulse({
  markers,
  className = "",
  speed = 0.004,
}: GlobePulseProps) {
  const activeMarkers = markers && markers.length > 0 ? markers : defaultMarkers;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const flagRefs = useRef<Array<HTMLDivElement | null>>([]);

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

  // Pause RAF when scrolled off-screen
  useEffect(() => {
    if (!containerRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
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

    function projectMarkers() {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const size = overlay.clientWidth;
      const radius = size / 2;
      const theta = 0.2 + thetaOffsetRef.current;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const currentPhi = phiRef.current;

      activeMarkers.forEach((m, i) => {
        const el = flagRefs.current[i];
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
        el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%) scale(${0.7 + z * 0.4})`;
        el.style.opacity = visible ? String(Math.min(1, z * 1.6)) : "0";
        el.style.pointerEvents = visible ? "auto" : "none";
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
        mapBrightness: 5,
        // Cyan-leaning ocean tone (Zion Blue)
        baseColor: [0.05, 0.32, 0.45],
        // Neon orange markers
        markerColor: [1, 0.45, 0.1],
        // Cyan atmospheric glow
        glowColor: [0.1, 0.55, 0.75],
        markers: activeMarkers.map((m) => ({ location: m.location, size: 0.05 })),
      });

      function animate() {
        if (!visibleRef.current) {
          animationId = requestAnimationFrame(animate);
          return;
        }

        // Easing toward a focus target if set
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
        if (!isMobile || frame % 2 === 0) projectMarkers();
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
  }, [activeMarkers, speed]);

  function focusMarker(m: PulseMarker) {
    // Solve for offsets such that the marker projects to (phi*=0 longitude facing camera, theta*=0.2)
    const latRad = (m.location[0] * Math.PI) / 180;
    const lonRad = (m.location[1] * Math.PI) / 180;
    // We want: currentPhi = lonRad - (-Math.PI/2)  => phi + phiOffset = lonRad + Math.PI/2
    // Compute current phi by subtracting current phiOffset from phiRef
    const phiNoOffset = phiRef.current - phiOffsetRef.current;
    const targetPhiOffset = lonRad + Math.PI / 2 - phiNoOffset;
    // Wrap to nearest 2π for shortest path
    let delta = targetPhiOffset - phiOffsetRef.current;
    delta = ((delta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

    focusFromPhiRef.current = phiOffsetRef.current;
    focusFromThetaRef.current = thetaOffsetRef.current;
    targetPhiOffsetRef.current = phiOffsetRef.current + delta;
    // Tilt so that latitude is roughly centered; clamp
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
        {activeMarkers.map((m, i) => (
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
              <span className="absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.9)]" />
            </div>
          </div>
        ))}
      </div>
      {chip && (
        <div className="pointer-events-none absolute left-1/2 bottom-3 -translate-x-1/2 rounded-full bg-black/70 backdrop-blur px-3 py-1 text-[11px] font-semibold text-white border border-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.35)]">
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
