import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface IncomingChallengePayload {
  notification_id: string;
  challenge_id: string;
  challenger_id: string;
  challenger_username: string;
  challenger_avatar?: string | null;
  challenger_country?: string | null;
  title: string;
  stake_amount?: number | null;
  pot_total?: number | null;
  expires_at?: string | null;
  battle_id?: string | null;
}

/**
 * Watches for `challenge_received` notifications belonging to the signed-in user.
 *
 * Fires immediately on:
 *  - mount / auth change (covers "they re-opened the app while a challenge is pending")
 *  - realtime INSERT of a new `challenge_received` notification (covers "in-app right now")
 *  - polling fallback every 30s (covers realtime channel reconnects)
 *  - a window 'reopen-incoming-challenge' CustomEvent (bell click re-opens overlay)
 *
 * Returns the latest unhandled challenge so a global overlay can interrupt the user.
 */
export const useIncomingChallengeOverlay = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState<IncomingChallengePayload | null>(null);
  // Track session-dismissed notifications in a ref so dismiss() doesn't
  // re-trigger the initial-scan effect.
  const dismissedRef = useRef<Set<string>>(new Set());

  const hydrateFromNotification = useCallback(
    async (n: any): Promise<IncomingChallengePayload | null> => {
      const challengeId = n?.data?.challenge_id;
      if (!challengeId) return null;

      // Pull only columns that actually exist on open_challenges
      const { data: chRaw, error: chErr } = await supabase
        .from('open_challenges')
        .select(
          'id, challenger_id, challenger_username, title, stake_amount, pot_total, expires_at, status, target_barber_id, battle_id'
        )
        .eq('id', challengeId)
        .maybeSingle();

      if (chErr) {
        console.warn('[IncomingChallengeOverlay] hydrate query failed', chErr);
        return null;
      }
      const ch = chRaw as any;
      if (!ch) return null;

      // Real status check: open_challenges.status ∈ ('waiting_for_opponent','completed','expired')
      if (ch.status !== 'waiting_for_opponent') return null;
      // Defensive: if a target was set, only pop for the targeted user
      if (ch.target_barber_id && ch.target_barber_id !== user?.id) return null;
      // Skip already-expired
      if (ch.expires_at && new Date(ch.expires_at).getTime() <= Date.now()) return null;

      // Best-effort enrichment from profiles (avatar + country flag)
      let challenger_avatar: string | null = null;
      let challenger_country: string | null = null;
      if (ch.challenger_id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('avatar_url, country_code, display_name, username')
          .eq('user_id', ch.challenger_id)
          .maybeSingle();
        if (prof) {
          challenger_avatar = (prof as any).avatar_url ?? null;
          challenger_country = (prof as any).country_code ?? null;
        }
      }

      return {
        notification_id: n.id,
        challenge_id: ch.id,
        challenger_id: ch.challenger_id,
        challenger_username: ch.challenger_username || 'A barber',
        challenger_avatar,
        challenger_country,
        title: ch.title,
        stake_amount: ch.stake_amount ?? 0,
        pot_total: ch.pot_total ?? 0,
        expires_at: ch.expires_at,
        battle_id: ch.battle_id,
      };
    },
    [user?.id]
  );

  const scanLatest = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, type, data, read, dismissed_at, created_at')
      .eq('user_id', user.id)
      .eq('type', 'challenge_received')
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!data || data.length === 0) return;
    for (const n of data) {
      if (dismissedRef.current.has(n.id)) continue;
      const payload = await hydrateFromNotification(n);
      if (payload && !dismissedRef.current.has(payload.notification_id)) {
        setPending((cur) =>
          cur?.notification_id === payload.notification_id ? cur : payload
        );
        return;
      }
    }
  }, [user?.id, hydrateFromNotification]);

  // Initial scan on mount / login
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      if (!cancelled) await scanLatest();
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, scanLatest]);

  // Realtime: new INSERT
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`incoming-challenge-overlay-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload: any) => {
          const n = payload.new;
          if (n?.type !== 'challenge_received') return;
          if (dismissedRef.current.has(n.id)) return;
          const data = await hydrateFromNotification(n);
          if (data && !dismissedRef.current.has(data.notification_id)) {
            setPending(data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, hydrateFromNotification]);

  // Polling safety net (every 30s)
  useEffect(() => {
    if (!user?.id) return;
    const t = setInterval(() => {
      scanLatest();
    }, 30_000);
    return () => clearInterval(t);
  }, [user?.id, scanLatest]);

  // Bell click re-opens the overlay for a specific notification id
  useEffect(() => {
    const handler = async (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {};
      const notificationId = detail.notification_id;
      if (!notificationId || !user?.id) return;

      // Allow re-popping even if previously dismissed in this session
      dismissedRef.current.delete(notificationId);

      const { data } = await supabase
        .from('notifications')
        .select('id, type, data, read, dismissed_at, created_at')
        .eq('id', notificationId)
        .maybeSingle();
      if (!data || data.type !== 'challenge_received') return;
      const payload = await hydrateFromNotification(data);
      if (payload) setPending(payload);
    };
    window.addEventListener('reopen-incoming-challenge', handler as EventListener);
    return () =>
      window.removeEventListener('reopen-incoming-challenge', handler as EventListener);
  }, [user?.id, hydrateFromNotification]);

  const dismiss = useCallback(() => {
    setPending((p) => {
      if (p) dismissedRef.current.add(p.notification_id);
      return null;
    });
  }, []);

  return { pending, dismiss };
};
