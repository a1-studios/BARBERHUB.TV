import { useEffect, useRef, useCallback, useState } from "react";
import createGlobe from "cobe";

interface PulseMarker {
  id: string;
  location: [number, number];
  delay: number;
  flag?: string;
}

interface GlobePulseProps {
  markers?: PulseMarker[];
  className?: string;
  speed?: number;
}

const defaultMarkers: PulseMarker[] = [
  { id: "p1", location: [40.71, -74.01], delay: 0, flag: "🇺🇸" },
  { id: "p2", location: [51.51, -0.13], delay: 0.3, flag: "🇬🇧" },
  { id: "p3", location: [48.85, 2.35], delay: 0.6, flag: "🇫🇷" },
  { id: "p4", location: [35.68, 139.65], delay: 0.9, flag: "🇯🇵" },
  { id: "p5", location: [-23.55, -46.63], delay: 1.2, flag: "🇧🇷" },
  { id: "p6", location: [19.43, -99.13], delay: 1.5, flag: "🇲🇽" },
  { id: "p7", location: [-33.87, 151.21], delay: 1.8, flag: "🇦🇺" },
  { id: "p8", location: [6.52, 3.38], delay: 2.1, flag: "🇳🇬" },
];

export function GlobePulse({
  markers = defaultMarkers,
  className = "",
  speed = 0.004,
}: GlobePulseProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const flagRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const phiRef = useRef(0);
  const isPausedRef = useRef(false);
  const [ready, setReady] = useState(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
    isPausedRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    isPausedRef.current = false;
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        };
      }
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerUp]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let animationId: number;
    let phi = 0;

    function projectMarkers() {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const size = overlay.clientWidth;
      const radius = size / 2;
      const theta = 0.2 + thetaOffsetRef.current + dragOffset.current.theta;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const currentPhi = phiRef.current;

      markers.forEach((m, i) => {
        const el = flagRefs.current[i];
        if (!el) return;
        const latRad = (m.location[0] * Math.PI) / 180;
        const lonRad = (m.location[1] * Math.PI) / 180;
        // cobe rotates around Y; phi increases => globe spins east
        const lon = lonRad - currentPhi - Math.PI / 2;
        let x = Math.cos(latRad) * Math.sin(lon);
        let y = Math.sin(latRad);
        let z = Math.cos(latRad) * Math.cos(lon);
        // apply theta (tilt around X)
        const y2 = y * cosT - z * sinT;
        const z2 = y * sinT + z * cosT;
        y = y2;
        z = z2;

        const px = radius + x * radius * 0.9;
        const py = radius - y * radius * 0.9;
        const visible = z > 0.05;
        el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%) scale(${0.7 + z * 0.4})`;
        el.style.opacity = visible ? String(Math.min(1, z * 1.6)) : "0";
      });
    }

    function init() {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      const isMobile =
        typeof window !== "undefined" &&
        (window.matchMedia?.("(max-width: 768px)").matches ||
          /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
      const renderScale = isMobile ? 1 : 2;

      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width: width * renderScale,
        height: width * renderScale,
        phi: 0,
        theta: 0.2,
        dark: 1,
        diffuse: 1.4,
        mapSamples: isMobile ? 6000 : 16000,
        mapBrightness: 8,
        baseColor: [0.35, 0.35, 0.4],
        markerColor: [1, 0.5, 0.1],
        glowColor: [0.6, 0.3, 0.05],
        markers: markers.map((m) => ({ location: m.location, size: 0.05 })),
      });


      function animate() {
        if (!isPausedRef.current) phi += speed;
        phiRef.current = phi + phiOffsetRef.current + dragOffset.current.phi;
        globe!.update({
          phi: phiRef.current,
          theta: 0.2 + thetaOffsetRef.current + dragOffset.current.theta,
        });
        projectMarkers();
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
  }, [markers, speed]);

  return (
    <div className={`relative w-full aspect-square ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          opacity: 0,
          transition: "opacity 0.8s ease",
        }}
      />
      <div
        ref={overlayRef}
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        {markers.map((m, i) => (
          <div
            key={m.id}
            ref={(el) => (flagRefs.current[i] = el)}
            className="absolute top-0 left-0 will-change-transform"
            style={{ transition: "opacity 0.25s linear" }}
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
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/40">
          loading globe…
        </div>
      )}
    </div>
  );
}

export default GlobePulse;
