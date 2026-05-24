import { useEffect, useMemo, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import { Globe2 } from 'lucide-react';
import { countryFlag, PublicBarber } from './useLandingData';

interface Props {
  barbers: PublicBarber[];
  onPinClick: (barber: PublicBarber) => void;
}

const RADIUS = 110; // px

// Even point distribution on a sphere (Fibonacci spiral)
const fibonacciSphere = (n: number) => {
  const points: { x: number; y: number; z: number }[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(n - 1, 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    points.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
  }
  return points;
};

// World-space z after rotateY(rx) then rotateX(ry) — match CSS order rotateY rotateX
const rotatedZ = (x: number, y: number, z: number, rxDeg: number, ryDeg: number) => {
  const rx = (rxDeg * Math.PI) / 180;
  const ry = (ryDeg * Math.PI) / 180;
  // CSS applies right-to-left → point first gets rotateX then rotateY
  // rotateX(ry):
  const y1 = y * Math.cos(ry) - z * Math.sin(ry);
  const z1 = y * Math.sin(ry) + z * Math.cos(ry);
  // rotateY(rx):
  const z2 = -x * Math.sin(rx) + z1 * Math.cos(rx);
  return z2;
};

const Pin = ({
  point,
  barber,
  rx,
  ry,
  onClick,
}: {
  point: { x: number; y: number; z: number };
  barber: PublicBarber | null;
  rx: any;
  ry: any;
  onClick: () => void;
}) => {
  const px = point.x * RADIUS;
  const py = point.y * RADIUS;
  const pz = point.z * RADIUS;

  const opacity = useTransform([rx, ry], (vals: any) => {
    const z = rotatedZ(point.x, point.y, point.z, vals[0], vals[1]);
    // -1 (back) → 0, +1 (front) → 1, smooth fade across the rim
    return Math.max(0, Math.min(1, (z + 0.3) / 1.0));
  });
  const scale = useTransform(opacity, [0, 1], [0.6, 1]);

  // Counter-rotate so the pin always faces the viewer (billboard)
  const counter = useTransform([rx, ry], (vals: any) => `rotateY(${-vals[0]}deg) rotateX(${-vals[1]}deg)`);

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute left-1/2 top-1/2 will-change-transform"
      style={{
        transform: `translate3d(${px}px, ${py}px, ${pz}px)`,
        transformStyle: 'preserve-3d',
      }}
    >
      <motion.div
        style={{ opacity, scale, transform: counter }}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.92 }}
        className="-translate-x-1/2 -translate-y-1/2 relative"
      >
        {barber?.avatar_url ? (
          <img
            src={barber.avatar_url}
            alt={barber.display_name ?? 'barber'}
            className={`h-9 w-9 rounded-full object-cover ring-2 ${barber.is_live ? 'ring-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.85)] animate-pulse' : 'ring-orange-400/80 shadow-[0_0_14px_rgba(249,115,22,0.7)]'}`}
          />
        ) : (
          <div className={`h-9 w-9 rounded-full bg-[#0a0a0f] ring-2 flex items-center justify-center text-base ${barber?.is_live ? 'ring-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.7)]' : 'ring-cyan-400/70 shadow-[0_0_14px_rgba(34,211,238,0.5)]'}`}>
            {countryFlag(barber?.country_code)}
          </div>
        )}
        <span className="absolute -bottom-1 -right-1 text-[10px] leading-none">
          {countryFlag(barber?.country_code)}
        </span>
      </motion.div>
    </motion.button>
  );
};

export const BarberGlobeCard = ({ barbers, onPinClick }: Props) => {
  const pinCount = Math.max(8, Math.min(14, barbers.length || 8));
  const points = useMemo(() => fibonacciSphere(pinCount), [pinCount]);

  const rxRaw = useMotionValue(20);
  const ryRaw = useMotionValue(-10);
  const rx = useSpring(rxRaw, { stiffness: 80, damping: 20 });
  const ry = useSpring(ryRaw, { stiffness: 80, damping: 20 });

  const draggingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const idleAnimRef = useRef<ReturnType<typeof animate> | null>(null);

  // Auto-rotate when idle
  useEffect(() => {
    let stopped = false;
    const startIdleSpin = () => {
      if (draggingRef.current || stopped) return;
      idleAnimRef.current?.stop();
      idleAnimRef.current = animate(rxRaw, rxRaw.get() + 360, {
        duration: 38,
        ease: 'linear',
        repeat: Infinity,
        repeatType: 'loop',
      });
    };
    startIdleSpin();
    return () => {
      stopped = true;
      idleAnimRef.current?.stop();
    };
  }, [rxRaw]);

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    lastRef.current = { x: e.clientX, y: e.clientY };
    idleAnimRef.current?.stop();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || !lastRef.current) return;
    const dx = e.clientX - lastRef.current.x;
    const dy = e.clientY - lastRef.current.y;
    rxRaw.set(rxRaw.get() + dx * 0.5);
    ryRaw.set(Math.max(-70, Math.min(70, ryRaw.get() - dy * 0.5)));
    lastRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = () => {
    draggingRef.current = false;
    lastRef.current = null;
    // Resume idle spin from current rx
    idleAnimRef.current?.stop();
    idleAnimRef.current = animate(rxRaw, rxRaw.get() + 360, {
      duration: 38,
      ease: 'linear',
      repeat: Infinity,
      repeatType: 'loop',
    });
  };

  // Build a list of (point, barber) pairs — fill missing slots with null
  const slots = points.map((p, i) => ({ point: p, barber: barbers[i] ?? null }));

  const sphereTransform = useTransform([rx, ry], (vals: any) => `rotateY(${vals[0]}deg) rotateX(${vals[1]}deg)`);

  return (
    <div className="relative h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-cyan-400/15 text-cyan-300 border border-cyan-400/40">
          <Globe2 className="h-3 w-3" /> Global Barbershop
        </span>
        <span className="text-[10px] text-white/60">Spin · Tap a barber</span>
      </div>

      <div
        className="relative flex-1 rounded-xl overflow-hidden border border-white/10 bg-gradient-to-b from-cyan-500/[0.05] via-transparent to-orange-500/[0.05] flex items-center justify-center touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ perspective: 800 }}
      >
        {/* Soft orange glow behind sphere */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-56 w-56 rounded-full bg-orange-500/15 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full border border-cyan-400/15" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-56 w-56 rounded-full border border-cyan-400/10" />
        </div>

        {/* Sphere */}
        <motion.div
          className="relative"
          style={{
            width: RADIUS * 2,
            height: RADIUS * 2,
            transformStyle: 'preserve-3d',
            transform: sphereTransform,
          }}
        >
          {/* Latitude / longitude wireframe */}
          {[0, 30, 60, 90, 120, 150].map((deg) => (
            <div
              key={`lat-${deg}`}
              className="absolute left-1/2 top-1/2 rounded-full border border-cyan-400/10"
              style={{
                width: RADIUS * 2,
                height: RADIUS * 2,
                transform: `translate(-50%, -50%) rotateY(${deg}deg)`,
                transformStyle: 'preserve-3d',
              }}
            />
          ))}
          {[-60, -30, 0, 30, 60].map((deg) => {
            const r = RADIUS * Math.cos((deg * Math.PI) / 180);
            const yOff = RADIUS * Math.sin((deg * Math.PI) / 180);
            return (
              <div
                key={`lng-${deg}`}
                className="absolute left-1/2 top-1/2 rounded-full border border-orange-400/10"
                style={{
                  width: r * 2,
                  height: r * 2,
                  transform: `translate(-50%, -50%) translateY(${yOff}px) rotateX(90deg)`,
                  transformStyle: 'preserve-3d',
                }}
              />
            );
          })}

          {slots.map((s, i) => (
            <Pin
              key={s.barber?.user_id ?? `ghost-${i}`}
              point={s.point}
              barber={s.barber}
              rx={rx}
              ry={ry}
              onClick={() => onPinClick(s.barber ?? { user_id: '', display_name: null, avatar_url: null, country_code: null })}
            />
          ))}
        </motion.div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-white/70 font-medium">{barbers.length || pinCount}+ barbers worldwide</span>
        <span className="text-cyan-300">Drag to spin →</span>
      </div>
    </div>
  );
};

export default BarberGlobeCard;
