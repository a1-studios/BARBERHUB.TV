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

interface LandingTeasersRpc {
  live_battle: {
    id: string;
    title: string | null;
    viewers: number;
    barber1: PublicBarber | null;
    barber2: PublicBarber | null;
  } | null;
  featured_clips: Array<{
    id: string;
    title: string | null;
    thumbnail_url: string | null;
    cloudflare_stream_uid: string | null;
    author: string | null;
  }>;
}

const useLandingTeasers = () =>
  useQuery<LandingTeasersRpc>({
    queryKey: ['landing-teasers-rpc'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_landing_teasers' as any);
      if (error) throw error;
      const v = (data ?? {}) as Partial<LandingTeasersRpc>;
      return {
        live_battle: v.live_battle ?? null,
        featured_clips: v.featured_clips ?? [],
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

export const useLiveBattle = () => {
  const q = useLandingTeasers();
  return { ...q, data: (q.data?.live_battle ?? null) as LiveBattleTease | null };
};

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

export const useFeaturedClips = () => {
  const q = useLandingTeasers();
  const data: ClipTease[] = (q.data?.featured_clips ?? [])
    .map((r) => ({
      id: r.id,
      title: r.title,
      thumbnail_url: r.thumbnail_url ?? cfStreamThumb(r.cloudflare_stream_uid),
      author: r.author,
    }))
    .filter((c) => !!c.thumbnail_url);
  return { ...q, data };
};

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
