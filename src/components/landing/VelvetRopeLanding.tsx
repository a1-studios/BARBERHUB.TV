import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Sparkles, ArrowRight, Mail, Phone } from 'lucide-react';
import AuthModalV2 from '@/components/auth/AuthModalV2';
import { LaunchWizard } from '@/components/coming-soon/LaunchWizard';
import { LegendsHeadline } from './LegendsHeadline';
import { LiveStatsRow } from './LiveStatsRow';
import { WatchFeedStrip } from './teasers/WatchFeedStrip';
import { PublicBarber } from './teasers/useLandingData';
import barberPole from '@/assets/barber-pole.png';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export const VelvetRopeLanding = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [previewBarber, setPreviewBarber] = useState<PublicBarber | null>(null);
  const [identity, setIdentity] = useState('');
  const [spinOpen, setSpinOpen] = useState(false);

  const openAuth = (mode: 'signup' | 'signin', prefill = '') => {
    setAuthMode(mode);
    setPreviewBarber(null);
    setIdentity(prefill);
    setAuthOpen(true);
  };

  const looksLikePhone = identity.trim().length > 0 && !EMAIL_RE.test(identity.trim());
  const Icon = looksLikePhone ? Phone : Mail;

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#0a0a0f] text-white flex flex-col">
      <Helmet>
        <title>BARBER-HUB — Where Barbers Become Legends</title>
        <meta
          name="description"
          content="Join the global barber community. Live battles, sponsor deals, education, and the 2026 Global Championship. +15 BB on signup."
        />
        <link rel="canonical" href="https://barberhub.tv/" />
      </Helmet>

      {/* Signature Header — preserved */}
      <div className="flex-none px-4 pt-2">
        <header className="relative bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-2 border-primary/40 rounded-xl overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-0">
            <div className="absolute w-32 h-32 bg-cyan/20 rounded-full blur-2xl animate-[energy-pulse-1_8s_ease-in-out_infinite]" />
            <div className="absolute w-24 h-24 bg-cyan/15 rounded-full blur-xl animate-[energy-pulse-2_10s_ease-in-out_infinite_3s]" />
            <div className="absolute w-20 h-20 bg-cyan/10 rounded-full blur-lg animate-[energy-pulse-3_12s_ease-in-out_infinite_6s]" />
          </div>
          <div className="relative z-10 px-4 flex items-center justify-between h-14">
            <img
              src={barberPole}
              alt="BARBER-HUB Logo"
              className="h-10 w-10 animate-[spin_11s_linear_infinite]"
            />
            <span className="text-xl font-black tracking-[0.18em] uppercase">
              <span className="text-white">BARBER</span>
              <span className="text-primary">-HUB</span>
            </span>
            <div className="w-10" />
          </div>
        </header>
      </div>

      {/* Primary Auth Card — SPIN CTA + inline email/phone */}
      <section className="flex-none px-4 pt-5 pb-3">
        <div className="relative rounded-2xl border border-orange-500/30 bg-gradient-to-b from-orange-500/[0.06] to-transparent p-4 shadow-[0_0_40px_-12px_rgba(249,115,22,0.45)]">
          {/* SPIN TO WIN CTA */}
          <button
            onClick={() => setSpinOpen(true)}
            className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 via-orange-400 to-amber-500 px-6 py-4 text-base font-black uppercase tracking-wider shadow-[0_0_32px_rgba(249,115,22,0.5)] hover:shadow-[0_0_48px_rgba(249,115,22,0.7)] transition-shadow"
          >
            <span className="relative z-10 inline-flex items-center justify-center gap-2 text-black">
              <Sparkles className="h-5 w-5" />
              Spin to Win &amp; Join
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:translate-x-full transition-transform duration-1000" />
          </button>
          <p className="mt-2 text-center text-[11px] text-white/50">
            New here? Get <span className="text-orange-300 font-bold">+15 BB</span> on us.
          </p>

          {/* Divider */}
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">or sign in</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Inline identity input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              openAuth('signin', identity.trim());
            }}
            className="space-y-2"
          >
            <div className="relative">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="Email or phone"
                inputMode={looksLikePhone ? 'tel' : 'email'}
                autoComplete={looksLikePhone ? 'tel' : 'email'}
                className="w-full rounded-lg bg-white/[0.04] border border-white/10 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 px-4 py-2.5 text-sm font-bold text-white transition"
            >
              Continue
            </button>
          </form>
        </div>
      </section>

      {/* Headline + Live Stats */}
      <section className="flex-none px-4 py-4 space-y-4">
        <LegendsHeadline />
        <LiveStatsRow />
      </section>

      {/* Watch Feed teaser — pinned at bottom */}
      <div className="flex-1 min-h-0 flex flex-col justify-end">
        <WatchFeedStrip />
      </div>

      {/* Sign-in for existing users */}
      <footer className="flex-none px-4 pb-3 pt-2 text-center">
        <button
          onClick={() => openAuth('signin')}
          className="text-[11px] text-white/50 hover:text-white transition"
        >
          Already a member? <span className="underline text-white/80">Sign in</span>
        </button>
      </footer>

      <AuthModalV2
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        mode={authMode}
        previewBarber={previewBarber}
        prefillIdentity={identity}
      />

      {spinOpen && <LaunchWizard onClose={() => setSpinOpen(false)} />}
    </div>
  );
};

export default VelvetRopeLanding;
