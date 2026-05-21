import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  onContinue: () => void;
}

const haptic = (ms = 20) => { try { navigator.vibrate?.(ms); } catch { /* */ } };

export const StepBucksReward = ({ onContinue }: Props) => {
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [granted, setGranted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Count-up 0 → 15
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setCount(Math.round(15 * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    haptic(40);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Confetti burst
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr; ctx.scale(dpr, dpr);

    const colors = ['#FF5F1F', '#FF8C00', '#FFB347', '#00F0FF', '#FFFFFF'];
    const particles = Array.from({ length: 90 }).map(() => ({
      x: w / 2, y: h / 2,
      vx: (Math.random() - 0.5) * 9,
      vy: (Math.random() - 1) * 9,
      g: 0.22 + Math.random() * 0.1,
      size: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 1,
    }));

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.008;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
        ctx.restore();
      });
      if (particles.some((p) => p.life > 0)) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const claim = async () => {
    if (busy) return;
    setBusy(true);
    haptic(30);
    try {
      await supabase.functions.invoke('award-signup-bonus', { body: {} });
    } catch { /* tolerated — bonus is idempotent and can be retried later */ }
    setGranted(true);
    setTimeout(() => { onContinue(); }, 150);
  };

  const ring = useMemo(() => ({
    background: 'conic-gradient(from 0deg, #FF5F1F, #FF8C00, #FFB347, #FF8C00, #FF5F1F)',
  }), []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      className="relative flex flex-col items-center justify-between h-full text-center pb-2"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      <div className="space-y-2 pt-4 z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] font-black"
          style={{ background: 'rgba(0,240,255,0.08)', color: '#00F0FF', border: '1px solid rgba(0,240,255,0.35)' }}>
          <Sparkles className="w-3 h-3" /> Welcome bonus
        </div>
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
          Welcome to the Hub!
        </h2>
        <p className="text-sm text-white/70 px-6">You've just earned</p>
      </div>

      <div className="relative my-6 z-10">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute -inset-3 rounded-full opacity-60 blur-md"
          style={ring}
        />
        <motion.div
          initial={{ scale: 0.4, rotateY: -90 }}
          animate={{ scale: 1, rotateY: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.1 }}
          className="relative w-40 h-40 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #FFD27A, #FF8C00 50%, #B84A0E 100%)',
            boxShadow: '0 20px 60px rgba(255,95,31,0.55), inset 0 6px 12px rgba(255,255,255,0.45), inset 0 -10px 18px rgba(0,0,0,0.45)',
            border: '3px solid rgba(255,255,255,0.35)',
          }}
        >
          <div className="text-5xl font-black text-white tracking-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            BB
          </div>
        </motion.div>
      </div>

      <div className="space-y-3 z-10 w-full">
        <div className="flex items-baseline justify-center gap-2">
          <motion.span
            key={count}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-6xl font-black text-white tabular-nums"
            style={{ textShadow: '0 0 24px rgba(255,140,0,0.7)' }}
          >
            {count}
          </motion.span>
          <span className="text-sm font-black uppercase tracking-wider text-orange-300">Barber Bucks</span>
        </div>
        <p className="text-[11px] text-white/55 px-4">Spend them on votes, spins, and gear.</p>

        <button
          type="button"
          onClick={claim}
          disabled={busy}
          className="relative w-full h-14 rounded-[16px] font-black uppercase tracking-wider text-base text-white flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70"
          style={{
            background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
            border: '1px solid rgba(255,255,255,0.35)',
            boxShadow: '0 12px 28px rgba(255,95,31,0.55), inset 0 1px 0 rgba(255,255,255,0.5)',
          }}
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Claim & Continue <ArrowRight className="w-5 h-5" /></>}
        </button>
      </div>
    </motion.div>
  );
};
