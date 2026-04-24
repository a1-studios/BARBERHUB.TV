import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface IncomingChallengePayload {
  notification_id: string;
  challenge_id: string;
  challenger_username: string;
  challenger_avatar?: string | null;
  challenger_country?: string | null;
  title: string;
  stake_amount?: number | null;
  pot_total?: number | null;
  expires_at?: string | null;
}

/**
 * Watches for `challenge_received` notifications belonging to the signed-in user.
 *
 * Fires immediately on:
 *  - mount / auth change (covers "they re-opened the app while a challenge is pending")
 *  - realtime INSERT of a new `challenge_received` notification (covers "in-app right now")
 *
 * Returns the latest unhandled challenge so a global overlay can interrupt the user.
 */
export const useIncomingChallengeOverlay = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState<IncomingChallengePayload | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const hydrateFromNotification = useCallback(async (n: any): Promise<IncomingChallengePayload | null> => {
    const challengeId = n?.data?.challenge_id;
    if (!challengeId) return null;

    const { data: chRaw } = await supabase
      .from('open_challenges')
      .select('id, challenger_username, title, stake_amount, pot_total, expires_at, status')
      .eq('id', challengeId)
      .maybeSingle();

    const ch = chRaw as any;
    if (!ch) return null;
    if (ch.status && ch.status !== 'pending' && ch.status !== 'open' && ch.status !== 'active') return null;
    if (ch.expires_at && new Date(ch.expires_at).getTime() <= Date.now()) return null;

    return {
      notification_id: n.id,
      challenge_id: ch.id,
      challenger_username: ch.challenger_username,
      challenger_avatar: ch.challenger_avatar ?? null,
      challenger_country: ch.challenger_country ?? null,
      title: ch.title,
      stake_amount: ch.stake_amount ?? 0,
      pot_total: ch.pot_total ?? 0,
      expires_at: ch.expires_at,
    };
  }, []);

  // Initial scan on mount / login
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, type, data, read, dismissed_at, created_at')
        .eq('user_id', user.id)
        .eq('type', 'challenge_received')
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (cancelled || !data || data.length === 0) return;
      const payload = await hydrateFromNotification(data[0]);
      if (!cancelled && payload && !dismissedIds.has(payload.notification_id)) {
        setPending(payload);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, hydrateFromNotification, dismissedIds]);

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
          if (dismissedIds.has(n.id)) return;
          const data = await hydrateFromNotification(n);
          if (data) setPending(data);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, hydrateFromNotification, dismissedIds]);

  const dismiss = useCallback(() => {
    setPending((p) => {
      if (p) {
        setDismissedIds((s) => new Set(s).add(p.notification_id));
      }
      return null;
    });
  }, []);

  return { pending, dismiss };
};
