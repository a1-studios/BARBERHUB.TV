import { useEffect, useState, useRef, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Swords, Radio, Flag, Trophy, GraduationCap, Award,
  Heart, HandHeart, Hammer, ShoppingBag, Globe2, Sparkles, Play,
} from 'lucide-react';

interface Slide {
  pillar: string;
  title: string;
  copy: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  gradient: string;
  visual?: ReactNode;
}

const SLIDES: Slide[] = [
  { pillar: 'Compete',       title: 'Live PK Battles',         copy: 'Head-to-head, scored by fans in real time.',  icon: Swords,        tint: 'text-rose-400',    gradient: 'from-rose-500/30 via-rose-500/5 to-transparent' },
  { pillar: 'Stream',        title: 'Go Live Now',             copy: 'Solo broadcasts and battle streams in 720p.', icon: Radio,         tint: 'text-cyan-400',    gradient: 'from-cyan-500/30 via-cyan-500/5 to-transparent',
    visual: (
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        autoPlay muted loop playsInline
        poster="/placeholder.svg"
        src="https://customer-7p1xwy4q4r9d3p7l.cloudflarestream.com/9d8a3a7e8a1d4f3a8b8e8f8e8f8e8f8e/manifest/video.m3u8"
      />
    )
  },
  { pillar: 'Watch',         title: 'Vertical Watch Feed',     copy: 'TikTok-style auto-scroll of battles & creators.', icon: Play,    tint: 'text-orange-400',  gradient: 'from-orange-500/30 via-orange-500/5 to-transparent' },
  { pillar: 'Merch',         title: 'Official BB Gear',        copy: 'Native BB-priced merch from sponsored brands.', icon: ShoppingBag, tint: 'text-orange-300',  gradient: 'from-orange-400/30 via-orange-400/5 to-transparent' },
  { pillar: 'Culture',       title: 'Faction Banners',         copy: 'Pick a faction. Defend your colors.',          icon: Flag,         tint: 'text-orange-400',  gradient: 'from-orange-500/30 via-orange-500/5 to-transparent' },
  { pillar: 'Global',        title: '2026 Championship',       copy: 'National & international leagues, zero travel.', icon: Globe2,    tint: 'text-blue-400',    gradient: 'from-blue-500/30 via-blue-500/5 to-transparent' },
  { pillar: 'Education',     title: 'Academy & Courses',       copy: 'Educator-led training. Earn certifications.',  icon: GraduationCap, tint: 'text-emerald-400', gradient: 'from-emerald-500/30 via-emerald-500/5 to-transparent' },
  { pillar: 'Brand Deals',   title: 'Sponsor Marketplace',     copy: 'Official partnerships and sponsor gigs.',      icon: Award,        tint: 'text-yellow-400',  gradient: 'from-yellow-500/30 via-yellow-500/5 to-transparent' },
  { pillar: 'Medical',       title: 'M4M Mental Health',       copy: '3% of every transaction funds wellness.',      icon: Heart,        tint: 'text-pink-400',    gradient: 'from-pink-500/30 via-pink-500/5 to-transparent' },
  { pillar: 'Community',     title: 'Universal Barter',        copy: 'Donate time. Unlock perks.',                    icon: HandHeart,    tint: 'text-purple-400',  gradient: 'from-purple-500/30 via-purple-500/5 to-transparent' },
  { pillar: 'Development',   title: 'Creator Hub',             copy: 'Build a channel. Post creations. Earn.',        icon: Hammer,       tint: 'text-amber-400',   gradient: 'from-amber-500/30 via-amber-500/5 to-transparent' },
  { pillar: 'Trophy',        title: 'Prize Pools & Vault',     copy: 'Dynamic jackpots. Verified payouts.',          icon: Trophy,       tint: 'text-amber-300',   gradient: 'from-amber-300/30 via-amber-300/5 to-transparent' },
  { pillar: 'Champion',      title: 'Path to Victory',         copy: 'Climb from Beginner to Licensed Pro.',         icon: Sparkles,     tint: 'text-cyan-300',    gradient: 'from-cyan-300/30 via-cyan-300/5 to-transparent' },
];

const ROTATE_MS = 4000;
const PAUSE_MS = 8000;

export const RotatingTeaserStage = () => {
  const [idx, setIdx] = useState(0);
  const [pausedUntil, setPausedUntil] = useState(0);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (Date.now() < pausedUntil) return;
      setIdx((i) => (i + 1) % SLIDES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [pausedUntil]);

  const jump = (i: number) => {
    setIdx((i + SLIDES.length) % SLIDES.length);
    setPausedUntil(Date.now() + PAUSE_MS);
  };

  const onTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 40) jump(idx + (dx < 0 ? 1 : -1));
    touchStart.current = null;
  };

  const slide = SLIDES[idx];
  const Icon = slide.icon;

  return (
    <div
      className="relative h-full w-full rounded-2xl border border-white/10 overflow-hidden bg-[#0a0a0f]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          {slide.visual}
          <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          <div className="absolute top-3 left-3">
            <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30">
              {slide.pillar}
            </span>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <Icon className={`h-12 w-12 mb-3 ${slide.tint} drop-shadow-[0_0_18px_rgba(255,255,255,0.18)]`} />
            <h3 className="text-2xl font-bold text-white">{slide.title}</h3>
            <p className="mt-2 text-sm text-white/70 max-w-[28ch]">{slide.copy}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => jump(i)}
            aria-label={`Show slide ${i + 1}`}
            className={`h-1 rounded-full transition-all ${i === idx ? 'w-5 bg-orange-500' : 'w-1.5 bg-white/30'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default RotatingTeaserStage;
