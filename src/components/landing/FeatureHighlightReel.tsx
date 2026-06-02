import { useRef, useState } from 'react';
import { MapPin, Search, Radio, Coins } from 'lucide-react';
import { GlobePulse } from '@/components/ui/cobe-globe-pulse';
import { useLiveBarberMarkers } from '@/hooks/useLiveBarberMarkers';
import { RotatingBBCoin } from '@/components/economy/RotatingBBCoin';

const LiveGlobe = () => {
  const markers = useLiveBarberMarkers();
  return <GlobePulse markers={markers ?? undefined} />;
};


/**
 * Manually-controlled highlight reel. User swipes or taps dots to navigate.
 * Globe is the first slide and renders full-bleed (no chrome) so users have
 * maximum room to drag it; the slogan orbits around it.
 */

type Slide = { id: string; label: string; render: () => React.ReactNode };

const SlideShell = ({
  tag,
  title,
  sub,
  children,
  accent = 'orange',
}: {
  tag: string;
  title: string;
  sub: string;
  children: React.ReactNode;
  accent?: 'orange' | 'cyan';
}) => (
  <div className="absolute inset-0 flex flex-col">
    <div className="flex items-center justify-between px-3 pt-2">
      <span
        className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${
          accent === 'orange'
            ? 'bg-orange-400/15 text-orange-300 border-orange-400/40'
            : 'bg-cyan-400/15 text-cyan-200 border-cyan-400/40'
        }`}
      >
        {tag}
      </span>
      <span className="text-[9px] text-white/45 uppercase tracking-widest">Features</span>
    </div>
    <div className="flex-1 relative overflow-hidden">{children}</div>
    <div className="px-3 pb-2">
      <p className="text-[13px] font-black text-white leading-tight">{title}</p>
      <p className="text-[10px] text-white/55">{sub}</p>
    </div>
  </div>
);

const slides: Slide[] = [
  {
    id: 'global',
    label: 'Global',
    render: () => (
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="w-full max-w-[360px] md:max-w-[360px] lg:max-w-[384px] relative mx-auto">
          <LiveGlobe />
        </div>
        <div className="mt-2 flex justify-center pointer-events-none">
          <p className="whitespace-nowrap text-[12px] md:text-sm font-extrabold uppercase tracking-[0.22em] drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            <span className="text-orange-400">Where </span>
            <span className="text-white">Barbers </span>
            <span className="text-orange-400">Become </span>
            <span className="text-white">Legends</span>
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'map',
    label: 'Global Map',
    render: () => (
      <SlideShell tag="Global Map" title="Find Barbers Anywhere" sub="Live map of barbers worldwide">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#0c2340_0%,#000_70%)]">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(34,211,238,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.18) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          {[
            { l: '22%', t: '38%' },
            { l: '46%', t: '28%' },
            { l: '65%', t: '52%' },
            { l: '34%', t: '62%' },
            { l: '78%', t: '40%' },
          ].map((p, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: p.l, top: p.t, animationDelay: `${i * 0.4}s` }}
            >
              <MapPin className="h-4 w-4 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.9)]" />
              <span className="absolute inset-0 -z-10 rounded-full bg-orange-500/40 blur-md animate-ping" />
            </span>
          ))}
        </div>
      </SlideShell>
    ),
  },
  {
    id: 'find',
    label: 'Find Barber',
    render: () => (
      <SlideShell
        tag="Near You"
        title="Book in 15 miles"
        sub="Standard · House-Call · SOS"
        accent="cyan"
      >
        <div className="absolute inset-0 px-3 pt-2 flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-md bg-white/[0.06] border border-white/15 px-2 py-1.5">
            <Search className="h-3.5 w-3.5 text-white/60" />
            <span className="text-[11px] text-white/70">Zip code or “Near me”</span>
          </div>
          {[
            { name: 'Marco T.', dist: '0.8 mi', tag: 'Diamond' },
            { name: 'Jay K.', dist: '1.4 mi', tag: 'Gold' },
            { name: 'Ava R.', dist: '2.1 mi', tag: 'Silver' },
          ].map((b, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md bg-white/[0.04] border border-white/10 px-2 py-1.5"
            >
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-orange-500 to-rose-700" />
                <span className="text-[11px] text-white font-bold">{b.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-cyan-200">{b.tag}</span>
                <span className="text-[9px] text-white/50">{b.dist}</span>
              </div>
            </div>
          ))}
        </div>
      </SlideShell>
    ),
  },
  {
    id: 'live',
    label: 'Live',
    render: () => (
      <SlideShell
        tag="Live Now"
        title="Watch & Vote in Real Time"
        sub="PK battles · Streams · Tournaments"
        accent="orange"
      >
        <div className="absolute inset-0 grid grid-cols-2 gap-1.5 p-3">
          {[
            'from-orange-600 via-rose-700 to-purple-900',
            'from-cyan-600 via-blue-800 to-indigo-900',
            'from-fuchsia-600 via-purple-700 to-indigo-900',
            'from-emerald-600 via-teal-700 to-cyan-900',
          ].map((g, i) => (
            <div
              key={i}
              className={`relative rounded-md overflow-hidden bg-gradient-to-br ${g} border border-white/10`}
            >
              <span className="absolute top-1 left-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/60 text-[8px] font-black text-red-400 uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                Live
              </span>
              <Radio className="absolute bottom-1 right-1 h-3 w-3 text-white/60" />
            </div>
          ))}
        </div>
      </SlideShell>
    ),
  },
  {
    id: 'earn',
    label: 'Earn BB',
    render: () => (
      <SlideShell
        tag="Earn BB"
        title="+15 BB just for signing up"
        sub="Earn, gift, withdraw — real value"
        accent="orange"
      >
        <div className="absolute inset-0 flex items-center justify-center gap-4 bg-[radial-gradient(ellipse_at_center,#1a0f04_0%,#000_70%)]">
          <RotatingBBCoin size="lg" animate />
          <div className="flex flex-col gap-1">
            {[
              { v: '+5', l: 'Vote' },
              { v: '+15', l: 'Sign up' },
              { v: '+50', l: 'Win battle' },
            ].map((row) => (
              <div
                key={row.l}
                className="flex items-center gap-2 rounded-md bg-white/[0.05] border border-white/10 px-2 py-1"
              >
                <Coins className="h-3 w-3 text-amber-400" />
                <span className="text-[11px] font-black text-amber-300">{row.v} BB</span>
                <span className="text-[10px] text-white/55">{row.l}</span>
              </div>
            ))}
          </div>
        </div>
      </SlideShell>
    ),
  },
];

export const FeatureHighlightReel = ({ children }: { children?: React.ReactNode }) => {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const go = (dir: number) =>
    setIdx((i) => (i + dir + slides.length) % slides.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const isGlobe = slides[idx]?.id === 'global';

  return (
    <div className="w-full h-full min-h-[180px] flex flex-col">
      <div
        className={`relative flex-1 rounded-xl overflow-visible ${
          isGlobe
            ? 'border border-transparent bg-transparent shadow-none'
            : 'border border-orange-500/30 bg-black/60 shadow-[0_0_24px_rgba(249,115,22,0.25)] overflow-hidden'
        }`}
        onTouchStart={isGlobe ? undefined : onTouchStart}
        onTouchEnd={isGlobe ? undefined : onTouchEnd}
      >
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              i === idx ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {s.render()}
          </div>
        ))}
      </div>
      {/* dots — placed directly under the slogan */}
      <div className="flex items-center justify-center gap-2 pt-1">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={s.label}
            className="p-1.5 -m-1 group"
          >
            <span
              className={`block h-1.5 rounded-full transition-all ${
                i === idx ? 'w-5 bg-orange-400' : 'w-1.5 bg-white/25 group-hover:bg-white/50'
              }`}
            />
          </button>
        ))}
      </div>
      {children}
    </div>
  );
};

export default FeatureHighlightReel;
