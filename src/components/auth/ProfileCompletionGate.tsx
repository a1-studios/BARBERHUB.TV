import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Scissors, Heart, Sparkles, Globe, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { COUNTRIES } from '@/components/CountrySelector';

import { useQueryClient } from '@tanstack/react-query';
type Role = 'barber' | 'fan';
type BarberStatus = 'licensed' | 'unlicensed' | 'student' | 'beginner' | 'aspiring';

const STATUSES: { id: BarberStatus; label: string }[] = [
  { id: 'licensed', label: 'Licensed Pro' },
  { id: 'unlicensed', label: 'Unlicensed Pro' },
  { id: 'student', label: 'Student' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'aspiring', label: 'Aspiring' },
];

/**
 * Soft gate — shown to authed users whose profile is incomplete.
 * Lets them watch/scroll, but blocks any meaningful interaction
 * until they pick a role + country. Triggered by `requireProfileComplete()`.
 */
export const ProfileCompletionGate = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [needs, setNeeds] = useState(false);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [status, setStatus] = useState<BarberStatus | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setNeeds(false); return; }
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_type, country_code')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!mounted) return;
      const incomplete = !data?.user_type || !data?.country_code;
      setNeeds(incomplete);
    })();
    const handler = () => { if (needs) setOpen(true); };
    window.addEventListener('require-profile-complete', handler);
    return () => { mounted = false; window.removeEventListener('require-profile-complete', handler); };
  }, [user, needs]);

  // Auto-open shortly after sign-in so users see the prompt
  useEffect(() => { if (needs) { const t = setTimeout(() => setOpen(true), 800); return () => clearTimeout(t); } }, [needs]);

  // Re-open when navigating to gated routes if still incomplete
  const location = useLocation();
  useEffect(() => {
    if (!needs) return;
    const gated = ['/profile', '/portal', '/creator-hub', '/studio', '/analytics'];
    if (gated.some((p) => location.pathname.startsWith(p))) setOpen(true);
  }, [location.pathname, needs]);

  if (!user || !needs || !open) return null;

  const ready = !!role && !!country && (role !== 'barber' || !!status);

  const submit = async () => {
    if (!ready) return;
    setSubmitting(true);
    setError(null);
    const { data, error: fnErr } = await supabase.functions.invoke('finalize-oauth-claim', {
      body: { role, barber_status: status, country_code: country, phone_number: phone.trim() || null },
    });
    if (fnErr || (data as { error?: unknown } | null)?.error) {
      setError(fnErr?.message ?? 'Could not save. Try again.');
      setSubmitting(false);
      return;
    }
    setNeeds(false);
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['profile-incomplete'] });
    qc.invalidateQueries({ queryKey: ['profile'] });
    qc.invalidateQueries({ queryKey: ['userRoles'] });
    qc.invalidateQueries({ queryKey: ['header-profile'] });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-[22px] p-5 sm:p-6 space-y-4"
          style={{
            background: 'hsla(0,0%,3%,0.95)',
            border: '1px solid hsla(20,100%,56%,0.3)',
            boxShadow: '0 0 60px hsla(20,100%,56%,0.35)',
          }}
        >
          <div className="text-center space-y-1">
            <div className="text-3xl">🎟️</div>
            <h2 className="text-xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
              Lock in your prize
            </h2>
            <p className="text-xs text-white/65">
              Tell us who you are so we can credit your ticket and serve you right.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['barber', 'fan'] as Role[]).map((r) => {
              const active = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setRole(r); if (r === 'fan') setStatus(null); }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-[14px] transition-all active:scale-95"
                  style={{
                    background: active ? 'hsla(20,100%,56%,0.18)' : 'hsla(0,0%,100%,0.04)',
                    border: `1.5px solid ${active ? 'hsla(20,100%,56%,0.7)' : 'hsla(0,0%,100%,0.1)'}`,
                    boxShadow: active ? '0 0 18px hsla(20,100%,56%,0.4)' : 'none',
                  }}
                >
                  {r === 'barber' ? <Scissors className="w-5 h-5 text-orange-300" /> : <Heart className="w-5 h-5 text-orange-300" />}
                  <span className="text-sm font-black uppercase text-white">{r}</span>
                </button>
              );
            })}
          </div>

          {role === 'barber' && (
            <div className="grid grid-cols-2 gap-1.5">
              {STATUSES.map((s) => {
                const active = status === s.id;
                const aspiring = s.id === 'aspiring';
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus(s.id)}
                    className="relative h-12 rounded-[12px] text-xs font-black uppercase text-white transition-all active:scale-95"
                    style={{
                      background: active
                        ? 'hsla(20,100%,56%,0.22)'
                        : aspiring ? 'hsla(195,100%,50%,0.08)' : 'hsla(0,0%,100%,0.04)',
                      border: active
                        ? '1.5px solid hsla(20,100%,56%,0.85)'
                        : aspiring ? '1px solid hsla(195,100%,50%,0.35)' : '1px solid hsla(0,0%,100%,0.08)',
                    }}
                  >
                    {aspiring && !active && <Sparkles className="absolute top-1 right-1 w-3 h-3 text-cyan-300/80" />}
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400/70 pointer-events-none z-10" />
              <select
                value={country ?? ''}
                onChange={(e) => setCountry(e.target.value || null)}
                className="w-full h-11 pl-9 pr-3 rounded-[12px] bg-black/40 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/60 appearance-none"
                style={{ border: '1px solid hsla(20,100%,56%,0.3)' }}
              >
                <option value="" disabled>🌐 Country (required)</option>
                {COUNTRIES.map((c) => {
                  const flag = String.fromCodePoint(...c.code.toUpperCase().split('').map(ch => 127397 + ch.charCodeAt(0)));
                  return (
                    <option key={c.code} value={c.code} className="bg-black text-white">
                      {flag}  {c.name}
                    </option>
                  );
                })}
              </select>
              {country && (
                <span className="absolute right-9 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
                  {String.fromCodePoint(...country.toUpperCase().split('').map(ch => 127397 + ch.charCodeAt(0)))}
                </span>
              )}
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400/70 pointer-events-none z-10" />
              <input
                type="tel"
                inputMode="tel"
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
                className="w-full h-11 pl-9 pr-3 rounded-[12px] bg-black/40 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                style={{ border: '1px solid hsla(20,100%,56%,0.25)' }}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={!ready || submitting}
            className="w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, hsl(20,100%,56%) 0%, hsl(28,100%,50%) 50%, hsl(35,100%,65%) 100%)',
              boxShadow: '0 8px 24px hsla(20,100%,56%,0.45)',
            }}
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Locking…</> : 'Lock in my prize'}
          </button>

          <button type="button" onClick={() => setOpen(false)} className="w-full text-[10px] uppercase tracking-wider text-white/45 hover:text-white py-1">
            Watch first, decide later
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/** Call this from any interaction that requires a complete profile. */
export const requireProfileComplete = () => {
  window.dispatchEvent(new Event('require-profile-complete'));
};
