import { useState } from 'react';
import { Helmet } from 'react-helmet';
import AuthModalV2 from '@/components/auth/AuthModalV2';
import { InsideTheHubStage } from './InsideTheHubStage';
import { WatchFeedStrip } from './teasers/WatchFeedStrip';
import { BottomGlobeSection } from './teasers/BottomGlobeSection';
import { PublicBarber } from './teasers/useLandingData';
import barberPole from '@/assets/barber-pole.png';

export const VelvetRopeLanding = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [previewBarber, setPreviewBarber] = useState<PublicBarber | null>(null);

  const openAuth = (mode: 'signup' | 'signin') => {
    setAuthMode(mode);
    setPreviewBarber(null);
    setAuthOpen(true);
  };

  const openAuthForBarber = (b: PublicBarber) => {
    setPreviewBarber(b.user_id ? b : null);
    setAuthMode('signup');
    setAuthOpen(true);
  };

  return (
    <div className="h-[100dvh] w-full max-w-full overflow-hidden bg-[#0a0a0f] text-white flex flex-col">
      <Helmet>
        <title>BARBER-HUB — Global Barber Streaming</title>
        <meta
          name="description"
          content="Global barber streaming platform. Live PK battles, sponsor deals, education, and the 2026 Global Championship."
        />
        <link rel="canonical" href="https://barberhub.tv/" />
      </Helmet>

      {/* Signature Header */}
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

      {/* Single primary CTA — frictionless entry */}
      <section className="flex-none px-4 py-3 flex flex-col items-center gap-2">
        <button
          onClick={() => openAuth('signup')}
          className="w-full max-w-sm rounded-full bg-orange-500 hover:bg-orange-600 transition px-6 py-3 text-sm font-bold uppercase tracking-wider shadow-[0_0_22px_rgba(249,115,22,0.45)]"
        >
          Enter Barber Hub — Free
        </button>
        <p className="text-[11px] text-white/40">
          Sign up with email or phone. Get <span className="text-orange-300 font-bold">+15 BB</span> on us.
        </p>
      </section>

      {/* Inside the Hub — rotating feature tease */}
      <section className="flex-1 min-h-0 px-4 pb-2">
        <InsideTheHubStage onPinClick={openAuthForBarber} />
      </section>

      {/* Watch Feed strip */}
      <div className="flex-none">
        <WatchFeedStrip />
      </div>

      {/* Global BarbershopSpin — pinned to bottom */}
      <BottomGlobeSection onPinClick={openAuthForBarber} />

      {/* Sign-in for existing users */}
      <footer className="flex-none px-4 pb-3 pt-1 text-center">
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
      />
    </div>
  );
};

export default VelvetRopeLanding;
