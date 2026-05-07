"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, useTransform, useSpring, useMotionValue, animate } from "framer-motion";
import { Scissors, Crown, Flame, Star, Sparkles, Award } from "lucide-react";

export type AnimationPhase = "scatter" | "line" | "circle" | "bottom-strip";
export type TierColor = "white" | "blue" | "orange";

const TOTAL_IMAGES = 14;
const MAX_SCROLL = 3000;

const IMG_W = 64;
const IMG_H = 92;

const ICONS = [Scissors, Crown, Flame, Star, Sparkles, Award];
const HOLO_TINTS = [
  "linear-gradient(135deg, hsla(195,100%,50%,0.18), hsla(265,80%,60%,0.10))",
  "linear-gradient(135deg, hsla(20,100%,56%,0.18), hsla(195,100%,50%,0.08))",
  "linear-gradient(135deg, hsla(195,100%,60%,0.22), hsla(195,100%,40%,0.08))",
];

interface CardProps {
  index: number;
  phase: AnimationPhase;
  target: { x: number; y: number; rotation: number; scale: number; opacity: number };
}

const HoloCard = React.memo(function HoloCard({ index, target }: CardProps) {
  const Icon = ICONS[index % ICONS.length];
  const tint = HOLO_TINTS[index % HOLO_TINTS.length];
  return (
    <motion.div
      style={{
        position: "absolute",
        width: IMG_W,
        height: IMG_H,
        left: "50%",
        top: "50%",
        marginLeft: -IMG_W / 2,
        marginTop: -IMG_H / 2,
        willChange: "transform, opacity",
      }}
      animate={{
        x: target.x,
        y: target.y,
        rotate: target.rotation,
        scale: target.scale,
        opacity: target.opacity,
      }}
      transition={{ type: "spring", stiffness: 90, damping: 18, mass: 0.6 }}
    >
      <div
        className="relative w-full h-full rounded-[10px] overflow-hidden"
        style={{
          background: tint,
          border: "1px solid hsla(195,100%,70%,0.45)",
          boxShadow:
            "0 0 14px hsla(195,100%,50%,0.35), inset 0 1px 0 hsla(0,0%,100%,0.25), inset 0 -8px 18px hsla(195,100%,50%,0.15)",
          backdropFilter: "blur(6px)",
        }}
      >
        {/* holo sheen */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(115deg, transparent 30%, hsla(0,0%,100%,0.18) 50%, transparent 70%)",
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <Icon className="w-5 h-5" style={{ color: "hsl(195,100%,80%)" }} />
          <span
            className="text-[8px] font-black uppercase tracking-wider"
            style={{ color: "hsl(195,100%,90%)" }}
          >
            BH
          </span>
        </div>
      </div>
    </motion.div>
  );
});

const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;

interface Props {
  /** Auto-spin once on mount */
  autoSpin?: boolean;
  /** Fired after the wheel settles into the bottom arc */
  onSettle?: () => void;
  /** Color tier to glow with after settle */
  tierColor?: TierColor;
  /** Center reveal slot — render the ticket card here once spin ends */
  centerSlot?: React.ReactNode;
  /** Pre-spin label */
  idleLabel?: string;
  /** Post-spin label */
  settledLabel?: string;
}

export default function ScrollMorphHero({
  autoSpin = true,
  onSettle,
  tierColor = "white",
  centerSlot,
  idleLabel = "Spinning the vault…",
  settledLabel = "Your color is locked",
}: Props) {
  const [introPhase, setIntroPhase] = useState<AnimationPhase>("scatter");
  const [settled, setSettled] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setContainerSize({ width: e.contentRect.width, height: e.contentRect.height });
      }
    });
    ro.observe(containerRef.current);
    setContainerSize({
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight,
    });
    return () => ro.disconnect();
  }, []);

  const virtualScroll = useMotionValue(0);
  const morphProgress = useTransform(virtualScroll, [0, 600], [0, 1]);
  const smoothMorph = useSpring(morphProgress, { stiffness: 60, damping: 22 });
  const scrollRotate = useTransform(virtualScroll, [600, 3000], [0, 360]);
  const smoothScrollRotate = useSpring(scrollRotate, { stiffness: 60, damping: 22 });

  const [morphValue, setMorphValue] = useState(0);
  const [rotateValue, setRotateValue] = useState(0);

  useEffect(() => {
    const u1 = smoothMorph.on("change", setMorphValue);
    const u2 = smoothScrollRotate.on("change", setRotateValue);
    return () => { u1(); u2(); };
  }, [smoothMorph, smoothScrollRotate]);

  // Auto-spin sequence
  useEffect(() => {
    if (!autoSpin) return;
    const t1 = setTimeout(() => setIntroPhase("line"), 350);
    const t2 = setTimeout(() => setIntroPhase("circle"), 1400);
    const t3 = setTimeout(() => {
      animate(virtualScroll, MAX_SCROLL, {
        duration: 2.6,
        ease: [0.22, 1, 0.36, 1],
        onComplete: () => {
          setSettled(true);
          onSettle?.();
        },
      });
    }, 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [autoSpin, onSettle, virtualScroll]);

  const scatterPositions = useMemo(
    () =>
      Array.from({ length: TOTAL_IMAGES }).map(() => ({
        x: (Math.random() - 0.5) * 900,
        y: (Math.random() - 0.5) * 600,
        rotation: (Math.random() - 0.5) * 180,
        scale: 0.5,
        opacity: 0,
      })),
    [],
  );

  const tierGlow = (() => {
    switch (tierColor) {
      case "orange":
        return "0 0 90px hsla(20,100%,56%,0.55), 0 0 220px hsla(20,100%,56%,0.35)";
      case "blue":
        return "0 0 70px hsla(195,100%,55%,0.55), 0 0 180px hsla(195,100%,55%,0.30)";
      default:
        return "0 0 50px hsla(0,0%,100%,0.35), 0 0 140px hsla(0,0%,100%,0.18)";
    }
  })();

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ touchAction: "none" }}
    >
      {/* Glow center plate */}
      {settled && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full pointer-events-none"
          style={{ boxShadow: tierGlow }}
        />
      )}

      {/* Status caption */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
        <p
          className="text-[10px] uppercase tracking-[0.25em] font-black"
          style={{ color: settled ? "hsl(195,100%,80%)" : "hsla(0,0%,100%,0.55)" }}
        >
          {settled ? settledLabel : idleLabel}
        </p>
      </div>

      {/* Center slot (ticket reveal) */}
      {settled && centerSlot && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">{centerSlot}</div>
        </div>
      )}

      {/* Cards */}
      <div className="absolute inset-0">
        {Array.from({ length: TOTAL_IMAGES }).map((_, i) => {
          let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

          if (introPhase === "scatter") {
            target = scatterPositions[i];
          } else if (introPhase === "line") {
            const spacing = 56;
            const totalW = TOTAL_IMAGES * spacing;
            target = { x: i * spacing - totalW / 2, y: 0, rotation: 0, scale: 0.85, opacity: 1 };
          } else {
            const isMobile = containerSize.width < 768;
            const minDim = Math.min(containerSize.width, containerSize.height);

            const circleR = Math.min(minDim * 0.36, 220);
            const cAngle = (i / TOTAL_IMAGES) * 360;
            const cRad = (cAngle * Math.PI) / 180;
            const circlePos = {
              x: Math.cos(cRad) * circleR,
              y: Math.sin(cRad) * circleR,
              rotation: cAngle + 90,
            };

            const baseR = Math.min(containerSize.width, containerSize.height * 1.4);
            const arcR = baseR * (isMobile ? 1.2 : 0.95);
            const apexY = containerSize.height * (isMobile ? 0.30 : 0.22);
            const arcCenterY = apexY + arcR;
            const spread = isMobile ? 95 : 120;
            const startA = -90 - spread / 2;
            const step = spread / (TOTAL_IMAGES - 1);
            const progress = Math.min(Math.max(rotateValue / 360, 0), 1);
            const bounded = -progress * (spread * 0.7);
            const a = startA + i * step + bounded;
            const rad = (a * Math.PI) / 180;
            const arcPos = {
              x: Math.cos(rad) * arcR,
              y: Math.sin(rad) * arcR + arcCenterY - containerSize.height / 2,
              rotation: a + 90,
              scale: isMobile ? 1.05 : 1.25,
            };

            target = {
              x: lerp(circlePos.x, arcPos.x, morphValue),
              y: lerp(circlePos.y, arcPos.y, morphValue),
              rotation: lerp(circlePos.rotation, arcPos.rotation, morphValue),
              scale: lerp(0.85, arcPos.scale, morphValue),
              opacity: 1,
            };
          }

          return <HoloCard key={i} index={i} phase={introPhase} target={target} />;
        })}
      </div>
    </div>
  );
}
