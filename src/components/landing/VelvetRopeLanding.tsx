import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { LaunchWizard } from '@/components/coming-soon/LaunchWizard';

import { FeatureHighlightReel } from './FeatureHighlightReel';
import { RotatingJoinCTA } from './RotatingJoinCTA';
import { InlineOtpBox } from './InlineOtpBox';
import { LiveStatsRow } from './LiveStatsRow';
import barberPole from '@/assets/barber-pole.png';

export const VelvetRopeLanding = () => {
  const [spinOpen, setSpinOpen] = useState(false);

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
                className="h-9 w-9 md:h-10 md:w-10"
              />
              <span className="text-lg md:text-xl font-black tracking-[0.18em] uppercase">
                <span className="text-white">BARBER</span>
                <span className="text-primary">-HUB</span>
              </span>
              <div className="w-9" />
            </div>
          </header>
        </div>

        {/* Feature Highlight Reel — takes available slack */}
        <div className="flex-1 min-h-0 flex flex-col px-3 pt-2 md:pt-4 pb-0 overflow-hidden">
          <FeatureHighlightReel>
            <div className="flex-none pt-4 md:pt-5 flex flex-col items-center">
              <RotatingJoinCTA onClick={() => setSpinOpen(true)} />
            </div>
            <div className="flex-none pt-4 md:pt-5">
              <LiveStatsRow />
            </div>
          </FeatureHighlightReel>
        </div>

        {/* Inline OTP — orange glow, under CTA */}
        <section className="flex-none px-3 pt-2">
          <InlineOtpBox />
        </section>


        <footer className="flex-none px-3 pb-2 text-center space-y-1">
          <nav className="flex items-center justify-center gap-3 text-[10px] text-white/45">
            <a href="/terms" className="hover:text-white/80 transition">Terms</a>
            <span className="text-white/20">·</span>
            <a href="/privacy" className="hover:text-white/80 transition">Privacy</a>
            <span className="text-white/20">·</span>
            <a href="/aup" className="hover:text-white/80 transition">Acceptable Use</a>
            <span className="text-white/20">·</span>
            <a href="/cookies" className="hover:text-white/80 transition">Cookies</a>
          </nav>
          <p className="text-[10px] text-white/35">
            © 2026 BARBER-HUB · Operated by Barber Hub LLC
          </p>
        </footer>
      </div>


      {spinOpen && <LaunchWizard onClose={() => setSpinOpen(false)} />}
    </div>
  );
};

export default VelvetRopeLanding;
