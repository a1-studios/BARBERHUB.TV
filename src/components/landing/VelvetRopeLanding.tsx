import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Scissors, Users } from 'lucide-react';
import AuthModalV2 from '@/components/auth/AuthModalV2';
import { LeaguePulseStrip } from './LeaguePulseStrip';
import { RotatingTeaserStage } from './RotatingTeaserStage';
import barberPole from '@/assets/barber-pole.png';

type Role = 'barber' | 'fan';

export const VelvetRopeLanding = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [code, setCode] = useState('');

  const openAuth = (r: Role | null, mode: 'signup' | 'signin') => {
    setRole(r);
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="h-[100dvh] w-full max-w-full overflow-hidden bg-[#0a0a0f] text-white flex flex-col">
      <Helmet>
        <title>Global Barber Streaming Platform — Invite-Only Beta</title>
        <meta
          name="description"
          content="Invite-only global barber streaming platform. Live PK battles, sponsor deals, education, and the 2026 Global Championship."
        />
        <link rel="canonical" href="https://barberhub-tv.lovable.app/" />
      </Helmet>

      {/* Signature Header */}
      <header className="flex-none px-4 pt-3 pb-2 flex items-center justify-center border-b border-white/5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-orange-500" />
          <span className="text-base font-bold tracking-tight">
            <span className="text-white">Barber</span>
            <span className="text-orange-500"> Hub</span>
          </span>
        </div>
      </header>

      {/* Global Title (binary two-color) */}
      <section className="flex-none px-4 pt-3 pb-2 text-center">
        <h1 className="text-[22px] leading-tight font-black tracking-tight">
          <span className="text-white">Global Barber</span>{' '}
          <span className="text-orange-500">Streaming Platform</span>
        </h1>
      </section>

      {/* Role pills — medium, side-by-side */}
      <section className="flex-none px-4 pb-2 flex items-center justify-center gap-2.5">
        <button
          onClick={() => setRole('barber')}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition border ${
            role === 'barber'
              ? 'bg-orange-500 border-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.5)]'
              : 'border-orange-500/40 text-orange-200 hover:border-orange-500'
          }`}
        >
          <Scissors className="h-4 w-4" /> I'm a Barber
        </button>
        <button
          onClick={() => setRole('fan')}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition border ${
            role === 'fan'
              ? 'bg-cyan-400 border-cyan-400 text-[#0a0a0f] shadow-[0_0_20px_rgba(34,211,238,0.45)]'
              : 'border-cyan-400/40 text-cyan-200 hover:border-cyan-400'
          }`}
        >
          <Users className="h-4 w-4" /> I'm a Fan
        </button>
      </section>

      {/* Promo + Redeem panel — only after pill selection */}
      {role && (
        <section className="flex-none px-4 pb-2 animate-fade-in">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 flex items-center gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VIP code (optional)"
              className="flex-1 min-w-0 bg-transparent text-xs uppercase tracking-widest text-white placeholder:text-white/30 outline-none px-2"
            />
            <button
              onClick={() => openAuth(role, 'signup')}
              className="flex-none rounded-full bg-orange-500 hover:bg-orange-600 transition px-3.5 py-1.5 text-xs font-semibold shadow-[0_0_18px_rgba(249,115,22,0.4)]"
            >
              Redeem VIP Invite
            </button>
          </div>
        </section>
      )}

      {/* League Pulse — thin band */}
      <section className="flex-none px-4 pb-2">
        <LeaguePulseStrip />
      </section>

      {/* Rotating Teaser Stage — fills remaining space, no scroll */}
      <section className="flex-1 min-h-0 px-4 pb-2">
        <RotatingTeaserStage />
      </section>

      {/* Sign-in for existing users */}
      <footer className="flex-none px-4 pb-3 pt-1 text-center">
        <button
          onClick={() => openAuth(null, 'signin')}
          className="text-[11px] text-white/50 hover:text-white transition"
        >
          Already a member? <span className="underline text-white/80">Sign in</span>
        </button>
      </footer>

      <AuthModalV2
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        intendedRole={role}
        mode={authMode}
      />
    </div>
  );
};

export default VelvetRopeLanding;
