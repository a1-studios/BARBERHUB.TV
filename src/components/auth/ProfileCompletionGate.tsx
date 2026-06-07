import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Scissors, Heart, Sparkles, Globe, Phone, KeyRound, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { COUNTRIES } from '@/components/CountrySelector';
import { IntakeWalkthrough } from '@/components/onboarding/IntakeWalkthrough';

import { useQueryClient } from '@tanstack/react-query';
type Role = 'barber' | 'fan';
type BarberStatus = 'licensed' | 'unlicensed' | 'student' | 'beginner' | 'aspiring';
type Phase = 'collect' | 'intake';

const STATUSES: { id: BarberStatus; label: string }[] = [
  { id: 'licensed', label: 'Licensed Pro' },
  { id: 'unlicensed', label: 'Unlicensed Pro' },
  { id: 'student', label: 'Student' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'aspiring', label: 'Aspiring' },
];

const phaseKey = (uid: string) => `gate_phase:${uid}`;

/**
 * Profile completion + role gateway.
 *
 * Two phases:
 *   1. `collect` — role, country, phone, (barber status + VIP) selection
 *   2. `intake`  — HowItWorks-style walkthrough, +15 BB claim on the final step
 *
 * Listens to `onAuthStateChange` so the gate reliably opens after email
 * confirmation, magic-link sign-in, or OAuth callback — situations where the
 * `user` from context isn't yet hydrated on first mount.
 */
export const ProfileCompletionGate = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [needs, setNeeds] = useState(false);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('collect');
  const [role, setRole] = useState<Role | null>(null);
  const [status, setStatus] = useState<BarberStatus | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [vipCode, setVipCode] = useState('');
  const [vipMode, setVipMode] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkedForUid = useRef<string | null>(null);

  // Profile-status check, runs whenever we resolve a userId (from context OR auth events)
  const refreshStatus = async (uid: string, opts?: { forceOpen?: boolean }) => {
    const [{ data: profile }, { data: vipOn }] = await Promise.all([
      supabase.from('profiles').select('user_type, country_code').eq('user_id', uid).maybeSingle(),
      supabase.rpc('is_global_vip_mode'),
    ]);
    const incomplete = !profile?.user_type || !profile?.country_code;
    setNeeds(incomplete);
    setVipMode(Boolean(vipOn));

    // Resume mid-flow: collected role/country but never finished intake -> bonus
    const savedPhase = localStorage.getItem(phaseKey(uid));
    if (!incomplete && savedPhase === 'intake' && (profile?.user_type === 'barber' || profile?.user_type === 'fan')) {
      setRole(profile.user_type as Role);
      setCountry(profile.country_code ?? null);
      setPhase('intake');
      setOpen(true);
      return;
    }

    if (incomplete && opts?.forceOpen) setOpen(true);
  };

  // Listen to auth events so we catch post-confirm / OAuth sign-ins
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id;
      if (!uid) {
        setNeeds(false);
        setOpen(false);
        checkedForUid.current = null;
        return;
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        // Force-open for fresh sign-ins / email confirmations
        const forceOpen = event === 'SIGNED_IN';
        refreshStatus(uid, { forceOpen });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Initial check + manual trigger
  useEffect(() => {
    if (!user) { setNeeds(false); return; }
    if (checkedForUid.current === user.id) return;
    checkedForUid.current = user.id;
    refreshStatus(user.id);

    const handler = () => setOpen(true);
    window.addEventListener('require-profile-complete', handler);
    return () => { window.removeEventListener('require-profile-complete', handler); };
  }, [user]);

  // Confirmation handoff: ?confirmed=1 or hash with access_token/type=signup
  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = window.location.hash;
    const confirmed =
      url.searchParams.get('confirmed') === '1' ||
      hash.includes('access_token=') ||
      hash.includes('type=signup') ||
      hash.includes('type=recovery');
    if (confirmed) {
      setOpen(true);
      url.searchParams.delete('confirmed');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, []);

  // Auto-open shortly after sign-in so users see the prompt
  useEffect(() => { if (needs) { const t = setTimeout(() => setOpen(true), 600); return () => clearTimeout(t); } }, [needs]);

  // Re-open when navigating to gated routes if still incomplete
  const location = useLocation();
  useEffect(() => {
    if (!needs) return;
    const gated = ['/profile', '/portal', '/creator-hub', '/studio', '/analytics'];
    if (gated.some((p) => location.pathname.startsWith(p))) setOpen(true);
  }, [location.pathname, needs]);

  if (!user || !open) return null;

  const barberReady =
    role === 'barber' && !!status && phone.trim().length >= 5 && (!vipMode || vipCode.trim().length > 0);
  const fanReady = role === 'fan';
  const ready = !!country && (barberReady || fanReady);
  const canDismiss = role !== 'barber'; // barbers must satisfy VIP gate, no escape hatch

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['profile-incomplete'] });
    qc.invalidateQueries({ queryKey: ['profile'] });
    qc.invalidateQueries({ queryKey: ['userRoles'] });
    qc.invalidateQueries({ queryKey: ['header-profile'] });
    qc.invalidateQueries({ queryKey: ['barber_bucks'] });
    qc.invalidateQueries({ queryKey: ['barber_bucks_transactions'] });
  };

  const submit = async () => {
    if (!ready || !role) return;
    setSubmitting(true);
    setError(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('finalize-oauth-claim', {
        body: {
          role,
          barber_status: status,
          country_code: country,
          phone_number: phone.trim() || null,
          vip_code: role === 'barber' ? vipCode.trim().toUpperCase() : null,
        },
      });
      const errPayload = (data as { error?: string } | null)?.error;
      if (fnErr || errPayload) {
        const msg = errPayload === 'invalid_vip_code' || fnErr?.message?.includes('invalid_vip_code')
          ? 'Invalid or exhausted VIP code.'
          : errPayload === 'vip_code_required' || fnErr?.message?.includes('vip_code_required')
            ? 'VIP code is required to become a barber.'
            : fnErr?.message ?? errPayload ?? 'Could not save your profile.';
        throw new Error(msg);
      }

      // Profile saved — refresh role/profile caches now, hold the BB bonus
      // until the user finishes the intake walkthrough.
      invalidateAll();
      if (user?.id) localStorage.setItem(phaseKey(user.id), 'intake');
      setNeeds(false);
      setSubmitting(false);
      setPhase('intake');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Try again.');
      setSubmitting(false);
    }
  };

  const finishIntake = () => {
    if (user?.id) localStorage.removeItem(phaseKey(user.id));
    invalidateAll();
    setOpen(false);
    setPhase('collect');
  };

  const skipIntake = () => {
    // Fan-only escape: don't claim the bonus, but mark we're past collect so we
    // don't trap them on next load.
    if (user?.id) localStorage.removeItem(phaseKey(user.id));
    setOpen(false);
    setPhase('collect');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-[22px] p-5 sm:p-6 space-y-4 max-h-[92dvh] overflow-y-auto"
          style={{
            background: 'hsla(0,0%,3%,0.95)',
            border: '1px solid hsla(20,100%,56%,0.3)',
            boxShadow: '0 0 60px hsla(20,100%,56%,0.35)',
          }}
        >
          <div className="text-center space-y-1">
            <div className="text-3xl">{phase === 'intake' ? '🚀' : '🎁'}</div>
            <h2 className="text-xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
              {phase === 'intake' ? 'Quick tour' : 'Finish your profile'}
            </h2>
            <p className="text-xs text-white/65 flex items-center justify-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-300" />
              {phase === 'intake'
                ? <>Finish the tour to claim <span className="text-amber-300 font-bold">+15 BB</span>.</>
                : <>Finish setup, then claim <span className="text-amber-300 font-bold">+15 BB</span>.</>}
            </p>
          </div>

          {phase === 'intake' && role ? (
            <IntakeWalkthrough
              role={role}
              onComplete={finishIntake}
              onDismiss={canDismiss ? skipIntake : undefined}
            />
          ) : (
          <>


          <div className="grid grid-cols-2 gap-2">
            {(['fan', 'barber'] as Role[]).map((r) => {
              const active = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setRole(r); if (r === 'fan') { setStatus(null); setVipCode(''); } }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-[14px] transition-all active:scale-95"
                  style={{
                    background: active ? 'hsla(20,100%,56%,0.18)' : 'hsla(0,0%,100%,0.04)',
                    border: `1.5px solid ${active ? 'hsla(20,100%,56%,0.7)' : 'hsla(0,0%,100%,0.1)'}`,
                    boxShadow: active ? '0 0 18px hsla(20,100%,56%,0.4)' : 'none',
                  }}
                >
                  {r === 'barber' ? <Scissors className="w-5 h-5 text-orange-300" /> : <Heart className="w-5 h-5 text-orange-300" />}
                  <span className="text-sm font-black uppercase text-white">{r === 'fan' ? 'Fan' : 'Barber'}</span>
                  <span className="text-[10px] text-white/45 leading-tight text-center px-1">
                    {r === 'fan' ? 'Watch, vote, sponsor' : 'Compete & earn (VIP only)'}
                  </span>
                </button>
              );
            })}
          </div>

          {role === 'barber' && (
            <>
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

              {vipMode && (
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400/70 pointer-events-none z-10" />
                  <input
                    type="text"
                    inputMode="text"
                    placeholder="VIP Invite Code (required)"
                    value={vipCode}
                    onChange={(e) => setVipCode(e.target.value.toUpperCase())}
                    maxLength={32}
                    autoCapitalize="characters"
                    className="w-full h-11 pl-9 pr-3 rounded-[12px] bg-black/40 text-white text-sm font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                    style={{ border: '1px solid hsla(20,100%,56%,0.4)' }}
                  />
                  <p className="text-[10px] text-white/50 mt-1.5 px-1">
                    Barber spots are invite-only during beta. Don't have a code? Switch to Fan to enter free.
                  </p>
                </div>
              )}
            </>
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
                placeholder={role === 'barber' ? 'Phone (required for barbers)' : 'Phone (optional)'}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
                className="w-full h-11 pl-9 pr-3 rounded-[12px] bg-black/40 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                style={{ border: `1px solid ${role === 'barber' ? 'hsla(20,100%,56%,0.5)' : 'hsla(20,100%,56%,0.25)'}` }}
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
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : (
              <><Coins className="w-4 h-4" /> Claim +15 BB</>
            )}
          </button>

          {canDismiss && (
            <button type="button" onClick={() => setOpen(false)} className="w-full text-[10px] uppercase tracking-wider text-white/45 hover:text-white py-1">
              Watch first, decide later
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/** Call this from any interaction that requires a complete profile. */
export const requireProfileComplete = () => {
  window.dispatchEvent(new Event('require-profile-complete'));
};
