import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Mail, Phone } from 'lucide-react';
import AuthModalV2 from '@/components/auth/AuthModalV2';
import { LaunchWizard } from '@/components/coming-soon/LaunchWizard';
import { LegendsHeadline } from './LegendsHeadline';
import { LiveStatsRow } from './LiveStatsRow';
import { WatchFeedStrip } from './teasers/WatchFeedStrip';
import { RotatingJoinCTA } from './RotatingJoinCTA';
import { PublicBarber } from './teasers/useLandingData';
import barberPole from '@/assets/barber-pole.png';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export const VelvetRopeLanding = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [previewBarber] = useState<PublicBarber | null>(null);
  const [identity, setIdentity] = useState('');
  const [spinOpen, setSpinOpen] = useState(false);

  const openAuth = (mode: 'signup' | 'signin', prefill = '') => {
    setAuthMode(mode);
    setIdentity(prefill);
    setAuthOpen(true);
  };

  const looksLikePhone = identity.trim().length > 0 && !EMAIL_RE.test(identity.trim());
  const Icon = looksLikePhone ? Phone : Mail;

  return (
    <div className="h-[100dvh] w-full max-w-full overflow-hidden bg-[#0a0a0f] text-white flex flex-col">
      <Helmet>
        <title>BARBER-HUB — Where Barbers Become Legends</title>
        <meta
          name="description"
          content="Join the global barber community. Live battles, sponsor deals, education, and the 2026 Global Championship. +15 BB on signup."
        />
        <link rel="canonical" href="https://barberhub.tv/" />
      </Helmet>

      <div className="mx-auto w-full max-w-md md:max-w-2xl lg:max-w-3xl flex-1 flex flex-col min-h-0">
        {/* Signature Header */}
        <div className="flex-none px-3 pt-2">
          <header className="relative bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-2 border-primary/40 rounded-xl overflow-hidden">
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-0">
              <div className="absolute w-32 h-32 bg-cyan/20 rounded-full blur-2xl animate-[energy-pulse-1_8s_ease-in-out_infinite]" />
              <div className="absolute w-24 h-24 bg-cyan/15 rounded-full blur-xl animate-[energy-pulse-2_10s_ease-in-out_infinite_3s]" />
            </div>
            <div className="relative z-10 px-4 flex items-center justify-between h-12 md:h-14">
              <img
                src={barberPole}
                alt="BARBER-HUB Logo"
                className="h-9 w-9 md:h-10 md:w-10 animate-[spin_11s_linear_infinite]"
              />
              <span className="text-lg md:text-xl font-black tracking-[0.18em] uppercase">
                <span className="text-white">BARBER</span>
                <span className="text-primary">-HUB</span>
              </span>
              <div className="w-9" />
            </div>
          </header>
        </div>

        {/* Headline */}
        <section className="flex-none px-3 pt-3">
          <LegendsHeadline />
        </section>

        {/* Watch feed teaser — takes available slack */}
        <div className="flex-1 min-h-0 flex flex-col justify-center px-3 py-2 overflow-hidden">
          <WatchFeedStrip />
        </div>

        {/* Inline sign-in */}
        <section className="flex-none px-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              openAuth('signin', identity.trim());
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="Email or phone"
                inputMode={looksLikePhone ? 'tel' : 'email'}
                autoComplete={looksLikePhone ? 'tel' : 'email'}
                className="w-full rounded-lg bg-white/[0.04] border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 px-4 py-2 text-sm font-bold text-white transition"
            >
              Go
            </button>
          </form>
        </section>

        {/* Rotating CTA — bottom */}
        <section className="flex-none px-3 pt-3 pb-2 flex flex-col items-center gap-1.5">
          <RotatingJoinCTA onClick={() => setSpinOpen(true)} />
          <p className="text-[10px] text-white/45">
            New here? <span className="text-orange-300 font-bold">+15 BB</span> on signup
          </p>
        </section>

        {/* Stats */}
        <section className="flex-none px-3 pt-2 pb-1">
          <LiveStatsRow />
        </section>

        <footer className="flex-none px-3 pb-2 text-center">
          <button
            onClick={() => openAuth('signin')}
            className="text-[11px] text-white/50 hover:text-white transition"
          >
            Already a member? <span className="underline text-white/80">Sign in</span>
          </button>
        </footer>
      </div>

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
