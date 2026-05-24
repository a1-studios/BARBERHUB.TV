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
  is_live?: boolean;
}

export interface BarberDetail extends PublicBarber {
  specialty: string | null;
  rating: number | null;
  years_experience: number | null;
  shop_city: string | null;
  cuts_this_month: number;
  next_slot: string | null; // ISO
  open_slots: string[]; // ISO list, max 3
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

export interface ProductTease {
  id: string;
  name: string;
  category: string | null;
  price_bb: number;
  image_url: string | null;
}

export const countryFlag = (code?: string | null) => {
  if (!code || code.length !== 2) return '🌍';
  return String.fromCodePoint(...code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0)));
};

const QUERY_OPTS = { staleTime: 60_000, refetchInterval: 90_000 } as const;

const cfStreamThumb = (uid: string | null | undefined) =>
  uid ? `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg?time=2s` : null;

// Resolve barber_profiles.id -> public_user_profiles row (+is_live)
const resolveBarbers = async (barberProfileIds: string[]): Promise<Record<string, PublicBarber>> => {
  if (!barberProfileIds.length) return {};
  const { data: bp } = await supabase
    .from('barber_profiles')
    .select('id, user_id, is_live')
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
    if (prof) out[(row as any).id] = { ...prof, is_live: !!(row as any).is_live };
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
      const { data: profs, error } = await supabase
        .from('public_user_profiles')
        .select('user_id, display_name, avatar_url, country_code')
        .eq('user_type', 'barber')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      const list = (profs ?? []) as PublicBarber[];
      const userIds = list.map((p) => p.user_id);
      if (!userIds.length) return list;
      const { data: bps } = await supabase
        .from('barber_profiles')
        .select('user_id, is_live, country_code')
        .in('user_id', userIds);
      const byUid = new Map((bps ?? []).map((r: any) => [r.user_id, r]));
      return list.map((p) => ({
        ...p,
        country_code: p.country_code ?? (byUid.get(p.user_id)?.country_code ?? null),
        is_live: !!byUid.get(p.user_id)?.is_live,
      }));
    },
    ...QUERY_OPTS,
  });

export const useLiveBattle = () =>
  useQuery<LiveBattleTease | null>({
    queryKey: ['landing-live-battle'],
    queryFn: async () => {
      const { data: battles, error } = await supabase
        .from('battles')
        .select('id, title, barber1_id, barber2_id, barber1_live_viewers, barber2_live_viewers, live_viewers, status, barber1_is_streaming, barber2_is_streaming, starts_at, created_at')
        .in('status', ['live', 'active', 'upcoming'])
        .not('barber1_id', 'is', null)
        .not('barber2_id', 'is', null)
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
        .select('id, title, thumbnail_url, stream_thumbnail_url, cloudflare_stream_uid, user_id')
        .order('created_at', { ascending: false })
        .limit(12);
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
      return rows
        .map((r: any) => {
          const thumb =
            (r.thumbnail_url as string | null) ??
            (r.stream_thumbnail_url as string | null) ??
            cfStreamThumb(r.cloudflare_stream_uid as string | null);
          return {
            id: r.id as string,
            title: (r.title as string) ?? null,
            thumbnail_url: thumb,
            author: profiles.find((p) => p.user_id === r.user_id)?.display_name ?? null,
          };
        })
        .filter((c) => !!c.thumbnail_url)
        .slice(0, 8);
    },
    ...QUERY_OPTS,
  });

export const useFeaturedProducts = () =>
  useQuery<ProductTease[]>({
    queryKey: ['landing-featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, price_bb, image_url, image_urls, display_order, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(6);
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category ?? null,
        price_bb: p.price_bb ?? 0,
        image_url: p.image_url ?? (Array.isArray(p.image_urls) ? p.image_urls[0] : null) ?? null,
      }));
    },
    ...QUERY_OPTS,
  });

// Derive 3 next-open slots for a given barber against a 9–17 working day,
// excluding existing appointment scheduled_at values.
const deriveSlots = (booked: Date[]): { next: string | null; slots: string[] } => {
  const bookedKeys = new Set(booked.map((d) => d.toISOString().slice(0, 13))); // YYYY-MM-DDTHH
  const out: string[] = [];
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  for (let dayOffset = 0; dayOffset < 7 && out.length < 3; dayOffset++) {
    for (let hour = 9; hour < 17 && out.length < 3; hour++) {
      const candidate = new Date(start);
      candidate.setDate(start.getDate() + dayOffset);
      candidate.setHours(hour, 0, 0, 0);
      if (candidate <= now) continue;
      const key = candidate.toISOString().slice(0, 13);
      if (bookedKeys.has(key)) continue;
      out.push(candidate.toISOString());
    }
  }
  return { next: out[0] ?? null, slots: out };
};

export const useFeaturedBarberDetail = (uid: string | null | undefined) =>
  useQuery<BarberDetail | null>({
    queryKey: ['landing-barber-detail', uid],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) return null;
      const [{ data: prof }, { data: bp }, { data: appts }] = await Promise.all([
        supabase
          .from('public_user_profiles')
          .select('user_id, display_name, avatar_url, country_code')
          .eq('user_id', uid)
          .maybeSingle(),
        supabase
          .from('barber_profiles')
          .select('specialty, rating, years_experience, shop_city, is_live, country_code')
          .eq('user_id', uid)
          .maybeSingle(),
        supabase
          .from('appointments')
          .select('scheduled_at, status, created_at')
          .eq('barber_user_id', uid)
          .order('scheduled_at', { ascending: true }),
      ]);

      const future = (appts ?? [])
        .filter((a: any) => new Date(a.scheduled_at) > new Date() && ['pending', 'confirmed'].includes(a.status))
        .map((a: any) => new Date(a.scheduled_at));

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const cuts_this_month = (appts ?? []).filter(
        (a: any) => new Date(a.created_at) >= monthStart && a.status !== 'denied',
      ).length;

      const { next, slots } = deriveSlots(future);

      return {
        user_id: uid,
        display_name: (prof as any)?.display_name ?? null,
        avatar_url: (prof as any)?.avatar_url ?? null,
        country_code: (prof as any)?.country_code ?? (bp as any)?.country_code ?? null,
        is_live: !!(bp as any)?.is_live,
        specialty: (bp as any)?.specialty ?? null,
        rating: (bp as any)?.rating ?? null,
        years_experience: (bp as any)?.years_experience ?? null,
        shop_city: (bp as any)?.shop_city ?? null,
        cuts_this_month,
        next_slot: next,
        open_slots: slots,
      };
    },
    ...QUERY_OPTS,
  });

export const useLandingData = () => {
  const stats = useLeagueStats();
  const liveBattle = useLiveBattle();
  const topBarbers = useTopBarbers(14);
  const challenges = useOpenChallenges();
  const clips = useFeaturedClips();
  const products = useFeaturedProducts();
  const featuredUid = topBarbers.data?.[0]?.user_id ?? null;
  const featuredDetail = useFeaturedBarberDetail(featuredUid);
  return {
    stats: stats.data,
    liveBattle: liveBattle.data ?? null,
    topBarbers: topBarbers.data ?? [],
    challenges: challenges.data ?? [],
    clips: clips.data ?? [],
    products: products.data ?? [],
    featuredDetail: featuredDetail.data ?? null,
  };
};
