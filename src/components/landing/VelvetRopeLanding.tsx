import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { DynamicBattleHero } from '@/components/DynamicBattleHero';
import { ImmersiveFactionBanners } from '@/components/factions/ImmersiveFactionBanners';
import { ProductShelf } from '@/components/ProductShelf';
import { LeaguePulseStrip } from './LeaguePulseStrip';
import { LockedTeaser } from './LockedTeaser';
import AuthModalV2 from '@/components/auth/AuthModalV2';
import {
  Swords, Radio, Flag, Trophy, GraduationCap, Award,
  Heart, HandHeart, Hammer, ShoppingBag, Globe2, Sparkles,
  Scissors, Users, ShieldCheck,
} from 'lucide-react';

type Role = 'barber' | 'fan';

interface TeaserDef {
  pillar: string;
  title: string;
  copy: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  gradient: string;
}

const TEASERS: TeaserDef[] = [
  { pillar: 'Compete',     title: 'Live PK Battles',          copy: 'Head-to-head challenges with real BB stakes.',     icon: Swords,          tint: 'text-rose-400',    gradient: 'from-rose-500/25 via-rose-500/5 to-transparent' },
  { pillar: 'Stream',      title: 'Go Live Now',              copy: 'Solo broadcasts and battle streams in 720p.',      icon: Radio,           tint: 'text-cyan-400',    gradient: 'from-cyan-500/25 via-cyan-500/5 to-transparent' },
  { pillar: 'Culture',     title: 'Faction Banners',          copy: 'Pick a faction. Wear your colors. Defend pride.',  icon: Flag,            tint: 'text-orange-400',  gradient: 'from-orange-500/25 via-orange-500/5 to-transparent' },
  { pillar: 'International', title: '2026 Global Championship', copy: 'National & international leagues, zero travel.',   icon: Globe2,          tint: 'text-blue-400',    gradient: 'from-blue-500/25 via-blue-500/5 to-transparent' },
  { pillar: 'Education',   title: 'Academy & Courses',        copy: 'Educator-led training. Earn certifications.',      icon: GraduationCap,   tint: 'text-emerald-400', gradient: 'from-emerald-500/25 via-emerald-500/5 to-transparent' },
  { pillar: 'Brand Deals', title: 'Sponsor Marketplace',      copy: 'Official brand partnerships and sponsor gigs.',    icon: Award,           tint: 'text-yellow-400',  gradient: 'from-yellow-500/25 via-yellow-500/5 to-transparent' },
  { pillar: 'Medical',     title: 'M4M Mental Health Fund',   copy: '3% of every transaction funds barber wellness.',   icon: Heart,           tint: 'text-pink-400',    gradient: 'from-pink-500/25 via-pink-500/5 to-transparent' },
  { pillar: 'Community',   title: 'Universal Barter',         copy: 'Donate time. Unlock perks. Lift your community.',  icon: HandHeart,       tint: 'text-purple-400',  gradient: 'from-purple-500/25 via-purple-500/5 to-transparent' },
  { pillar: 'Development', title: 'Creator Hub',              copy: 'Build a channel, post creations, earn followers.', icon: Hammer,          tint: 'text-amber-400',   gradient: 'from-amber-500/25 via-amber-500/5 to-transparent' },
  { pillar: 'Culture',     title: 'Official Gear Shelf',      copy: 'Native BB-priced merch from sponsored brands.',    icon: ShoppingBag,     tint: 'text-orange-300',  gradient: 'from-orange-400/25 via-orange-400/5 to-transparent' },
  { pillar: 'Trophy',      title: 'Prize Pools & Vault',      copy: 'Dynamic jackpots. 14-day hold. Verified payouts.', icon: Trophy,          tint: 'text-amber-300',   gradient: 'from-amber-300/25 via-amber-300/5 to-transparent' },
  { pillar: 'Champion',    title: 'Path to Victory',          copy: 'Climb from Beginner to Licensed Pro. Get verified.', icon: Sparkles,      tint: 'text-cyan-300',    gradient: 'from-cyan-300/25 via-cyan-300/5 to-transparent' },
];

const TeaserVisual = ({ icon: Icon, tint, gradient, copy }: TeaserDef) => (
  <div className="relative h-full w-full">
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
      <Icon className={`h-14 w-14 ${tint} drop-shadow-[0_0_18px_rgba(255,255,255,0.15)]`} />
      <p className="text-center text-xs sm:text-sm text-white/70 max-w-[28ch]">{copy}</p>
    </div>
  </div>
);

export const VelvetRopeLanding = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [intendedRole, setIntendedRole] = useState<Role | null>(null);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');

  const open = (role: Role | null = null, mode: 'signup' | 'signin' = 'signup') => {
    setIntendedRole(role);
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0a0a0f] text-white">
      <Helmet>
        <title>Barber Hub — Invite-Only Global Barber League</title>
        <meta
          name="description"
          content="Invite-only beta. Live PK battles, sponsor deals, education, and the 2026 Global Championship for licensed barbers and fans."
        />
        <link rel="canonical" href="https://barberhub-tv.lovable.app/" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Barber Hub',
          url: 'https://barberhub-tv.lovable.app/',
          description: 'Invite-only global barber competition platform.',
        })}</script>
      </Helmet>

      {/* Hero */}
      <header className="relative px-4 sm:px-6 pt-12 sm:pt-20 pb-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-4 w-4 text-orange-500" />
          <span className="text-[11px] uppercase tracking-[0.25em] text-orange-400/90">Invite-Only Beta</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] tracking-tight">
          The Velvet Rope
          <br />
          <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            for Licensed Barbers.
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-base sm:text-lg text-white/60">
          Live PK battles. Sponsor deals. Education. Mental-health support. National & international
          competition — built for the binary world of <strong className="text-white">Barbers</strong> and{' '}
          <strong className="text-white">Fans</strong>.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => open(null, 'signup')}
            className="inline-flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 transition px-6 py-3 text-sm font-semibold shadow-[0_0_28px_rgba(249,115,22,0.45)]"
          >
            Redeem VIP Invite
          </button>
          <button
            onClick={() => open('barber', 'signup')}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-orange-500/40 hover:border-orange-500 transition px-5 py-3 text-sm font-semibold text-orange-200"
          >
            <Scissors className="h-4 w-4" /> I’m a Barber
          </button>
          <button
            onClick={() => open('fan', 'signup')}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/40 hover:border-cyan-400 transition px-5 py-3 text-sm font-semibold text-cyan-200"
          >
            <Users className="h-4 w-4" /> I’m a Fan
          </button>
        </div>

        <button
          onClick={() => open(null, 'signin')}
          className="mt-4 text-xs text-white/40 hover:text-white/70 transition"
        >
          Already a member? <span className="underline">Sign in</span>
        </button>
      </header>

      {/* Aggregated stats — segmented by role + sub-category */}
      <section className="px-4 sm:px-6 max-w-6xl mx-auto">
        <LeaguePulseStrip />
      </section>

      {/* Live PK Hero (real component, locked) */}
      <section className="px-4 sm:px-6 mt-8 max-w-6xl mx-auto">
        <LockedTeaser
          pillar="Compete · Live"
          title="Live PK Battles — barbers vs barbers, scored by fans."
          onUnlock={() => open(null, 'signup')}
          heightClass="h-[60vh] min-h-[420px]"
        >
          <DynamicBattleHero />
        </LockedTeaser>
      </section>

      {/* Faction banners (real component, locked) */}
      <section className="px-4 sm:px-6 mt-6 max-w-6xl mx-auto">
        <LockedTeaser
          pillar="Culture · Factions"
          title="Pick a faction. Defend your colors."
          onUnlock={() => open(null, 'signup')}
          heightClass="h-[55vh] min-h-[380px]"
        >
          <ImmersiveFactionBanners />
        </LockedTeaser>
      </section>

      {/* Pillar grid */}
      <section className="px-4 sm:px-6 mt-10 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[11px] uppercase tracking-[0.25em] text-white/40">Inside the rope</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {TEASERS.map((t) => (
            <LockedTeaser
              key={t.title}
              pillar={t.pillar}
              title={t.title}
              onUnlock={() => open(null, 'signup')}
              heightClass="h-56"
            >
              <TeaserVisual {...t} />
            </LockedTeaser>
          ))}
        </div>
      </section>

      {/* Gear shelf — real component, locked */}
      <section className="px-4 sm:px-6 mt-10 max-w-6xl mx-auto">
        <LockedTeaser
          pillar="Culture · Gear"
          title="Official BB-priced gear from sponsored brands."
          onUnlock={() => open(null, 'signup')}
          heightClass="h-[42vh] min-h-[320px]"
        >
          <ProductShelf />
        </LockedTeaser>
      </section>

      {/* Footer CTA */}
      <section className="px-4 sm:px-6 mt-12 mb-16 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold">Ready to step inside?</h2>
        <p className="mt-2 text-sm text-white/60">
          The rope drops only for verified barbers and invited fans. Bring your code.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => open(null, 'signup')}
            className="inline-flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 transition px-6 py-3 text-sm font-semibold shadow-[0_0_28px_rgba(249,115,22,0.45)]"
          >
            Redeem VIP Invite
          </button>
          <button
            onClick={() => open(null, 'signin')}
            className="inline-flex items-center justify-center rounded-full border border-white/15 hover:border-white/40 transition px-6 py-3 text-sm font-semibold"
          >
            Sign in
          </button>
        </div>
      </section>

      <AuthModalV2
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        intendedRole={intendedRole}
        mode={authMode}
      />
    </div>
  );
};

export default VelvetRopeLanding;
