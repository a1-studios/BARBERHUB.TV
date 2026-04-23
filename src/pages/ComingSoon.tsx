import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { LaunchWizard } from '@/components/coming-soon/LaunchWizard';
import { captureAttribution } from '@/lib/urlParams';

const ComingSoon = () => {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    captureAttribution();
    supabase.rpc('get_marketing_lead_count').then(({ data, error }) => {
      if (!error && typeof data === 'number') setCount(data);
    });
  }, []);

  return (
    <div className="min-h-screen w-full bg-background text-white relative overflow-hidden">
      {/* Animated background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 30% 20%, rgba(255,95,31,0.18), transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,140,0,0.12), transparent 55%)',
        }}
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,95,31,0.2), transparent 60%)',
          filter: 'blur(60px)',
        }}
      />

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-20 text-center">
        {/* Lockup */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-3 mb-3"
        >
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.4em] text-orange-400/80 font-bold">
            The Global Barber Arena
          </p>
          <h1
            className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-none"
            style={{
              background: 'linear-gradient(135deg, #FFD37A 0%, #FF8C00 45%, #FF5F1F 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 24px rgba(255,95,31,0.45))',
            }}
          >
            BARBERHUB.TV
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-base sm:text-lg text-white/70 max-w-md mb-8 font-medium"
        >
          Launching soon. Compete, vote, and earn in the world's first global barber league.
        </motion.p>

        {/* Live counter pill */}
        {count !== null && count > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 mb-10"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
            </span>
            <span className="text-xs font-semibold text-orange-300 tracking-wide">
              {count.toLocaleString()} {count === 1 ? 'barber' : 'people'} already inside
            </span>
          </motion.div>
        )}

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setWizardOpen(true)}
          className="relative px-10 py-5 rounded-[14px] font-black uppercase tracking-wider text-base sm:text-lg text-black overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
            boxShadow: '0 12px 40px rgba(255,95,31,0.55), inset 0 1px 0 rgba(255,255,255,0.35)',
          }}
        >
          <motion.span
            aria-hidden
            className="absolute inset-y-0 -left-1/3 w-1/3 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
              transform: 'skewX(-20deg)',
            }}
            animate={{ x: ['0%', '450%'] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
          />
          <span className="relative">⚡ Claim Your Spot</span>
        </motion.button>

        <p className="mt-5 text-[11px] text-white/40 max-w-xs">
          Free to join. Spin the wheel for an early-bird prize.
        </p>
      </main>

      {wizardOpen && <LaunchWizard onClose={() => setWizardOpen(false)} />}
    </div>
  );
};

export default ComingSoon;
