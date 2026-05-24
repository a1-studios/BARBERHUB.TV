import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeagueStats {
  live_battles?: number;
  active_battles?: number;
  fans_total?: number;
  barbers_total?: number;
  countries_represented?: number;
  bb_in_circulation?: number;
}

export interface PublicBarber {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  country_code: string | null;
}

export interface LiveBattleTease {
  id: string;
  title: string | null;
  viewers: number;
  barber1: PublicBarber | null;
  barber2: PublicBarber | null;
}

export interface OpenChallengeTease {
  id: string;
  from: string;
  stake: number;
  expiresAt: string | null;
  status: 'open' | 'accepted' | 'history';
}

export interface ClipTease {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  author: string | null;
}

export const countryFlag = (code?: string | null) => {
  if (!code || code.length !== 2) return '🌍';
  return String.fromCodePoint(...code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0)));
};

const QUERY_OPTS = { staleTime: 60_000, refetchInterval: 90_000 } as const;

// Resolve barber_profiles.id -> public_user_profiles row
const resolveBarbers = async (barberProfileIds: string[]): Promise<Record<string, PublicBarber>> => {
  if (!barberProfileIds.length) return {};
  const { data: bp } = await supabase
    .from('barber_profiles')
    .select('id, user_id')
    .in('id', barberProfileIds);
  const userIds = (bp ?? []).map((r: any) => r.user_id).filter(Boolean) as string[];
  if (!userIds.length) return {};
  const { data: profs } = await supabase
    .from('public_user_profiles')
    .select('user_id, display_name, avatar_url, country_code')
    .in('user_id', userIds);
  const byUserId = new Map<string, PublicBarber>(
    (profs ?? []).map((p: any) => [p.user_id, p as PublicBarber]),
  );
  const out: Record<string, PublicBarber> = {};
  for (const row of bp ?? []) {
    const prof = byUserId.get((row as any).user_id);
    if (prof) out[(row as any).id] = prof;
  }
  return out;
};

export const useLeagueStats = () =>
  useQuery<LeagueStats>({
    queryKey: ['landing-league-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_league_stats');
      if (error) throw error;
      return (data as unknown as LeagueStats) ?? {};
    },
    ...QUERY_OPTS,
  });

export const useTopBarbers = (limit = 14) =>
  useQuery<PublicBarber[]>({
    queryKey: ['landing-top-barbers', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_user_profiles')
        .select('user_id, display_name, avatar_url, country_code')
        .eq('user_type', 'barber')
        .not('avatar_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as PublicBarber[];
    },
    ...QUERY_OPTS,
  });

export const useLiveBattle = () =>
  useQuery<LiveBattleTease | null>({
    queryKey: ['landing-live-battle'],
    queryFn: async () => {
      // Prefer a live, fully-paired battle
      const { data: battles, error } = await supabase
        .from('battles')
        .select('id, title, barber1_id, barber2_id, barber1_live_viewers, barber2_live_viewers, live_viewers, status, barber1_is_streaming, barber2_is_streaming, starts_at, created_at')
        .in('status', ['live', 'active', 'upcoming'])
        .not('barber1_id', 'is', null)
        .not('barber2_id', 'is', null)
        .order('status', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      const b = (battles ?? []).sort((a: any, z: any) => {
        const score = (x: any) => (x.status === 'live' ? 3 : x.status === 'active' ? 2 : 1)
          + ((x.barber1_is_streaming || x.barber2_is_streaming) ? 0.5 : 0);
        return score(z) - score(a);
      })[0];
      if (!b) return null;

      const ids = [b.barber1_id, b.barber2_id].filter(Boolean) as string[];
      const map = await resolveBarbers(ids);

      const viewers =
        (b.barber1_live_viewers ?? 0) + (b.barber2_live_viewers ?? 0) + (b.live_viewers ?? 0);

      return {
        id: b.id,
        title: b.title ?? null,
        viewers,
        barber1: b.barber1_id ? map[b.barber1_id] ?? null : null,
        barber2: b.barber2_id ? map[b.barber2_id] ?? null : null,
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

export const useOpenChallenges = () =>
  useQuery<OpenChallengeTease[]>({
    queryKey: ['landing-open-challenges'],
    queryFn: async () => {
      // Pull most recent of any status — we relabel client-side so the card
      // never has to invent fake stakes.
      const { data, error } = await supabase
        .from('open_challenges')
        .select('id, challenger_username, stake_amount, expires_at, status, created_at')
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      const rows = (data ?? []).map((c: any) => {
        const raw = (c.status as string) ?? 'open';
        const status: OpenChallengeTease['status'] =
          raw === 'open' ? 'open' : raw === 'accepted' || raw === 'matched' ? 'accepted' : 'history';
        return {
          id: c.id as string,
          from: (c.challenger_username as string) ?? 'Anon',
          stake: (c.stake_amount as number) ?? 0,
          expiresAt: (c.expires_at as string) ?? null,
          status,
        };
      });
      // Prioritize open > accepted > history
      const order = { open: 0, accepted: 1, history: 2 } as const;
      return rows.sort((a, b) => order[a.status] - order[b.status]).slice(0, 3);
    },
    ...QUERY_OPTS,
  });

export const useFeaturedClips = () =>
  useQuery<ClipTease[]>({
    queryKey: ['landing-featured-clips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battle_submissions')
        .select('id, title, thumbnail_url, stream_thumbnail_url, user_id')
        .or('thumbnail_url.not.is.null,stream_thumbnail_url.not.is.null')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      const rows = data ?? [];
      const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean))) as string[];
      let profiles: PublicBarber[] = [];
      if (userIds.length) {
        const { data: profs } = await supabase
          .from('public_user_profiles')
          .select('user_id, display_name, avatar_url, country_code')
          .in('user_id', userIds);
        profiles = (profs ?? []) as PublicBarber[];
      }
      return rows.map((r: any) => ({
        id: r.id as string,
        title: (r.title as string) ?? null,
        thumbnail_url: ((r.thumbnail_url ?? r.stream_thumbnail_url) as string) ?? null,
        author: profiles.find((p) => p.user_id === r.user_id)?.display_name ?? null,
      }));
    },
    ...QUERY_OPTS,
  });

export const useLandingData = () => {
  const stats = useLeagueStats();
  const liveBattle = useLiveBattle();
  const topBarbers = useTopBarbers(14);
  const challenges = useOpenChallenges();
  const clips = useFeaturedClips();
  return {
    stats: stats.data,
    liveBattle: liveBattle.data ?? null,
    topBarbers: topBarbers.data ?? [],
    challenges: challenges.data ?? [],
    clips: clips.data ?? [],
  };
};
