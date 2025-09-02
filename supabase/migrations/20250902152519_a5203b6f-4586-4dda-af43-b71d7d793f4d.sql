
-- 1) Profiles: country and favorite creator reference
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS favorite_creator_id uuid;

-- 2) Follow creators
CREATE TABLE IF NOT EXISTS public.creator_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, creator_id)
);
ALTER TABLE public.creator_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Followers and creators can view relevant follows"
  ON public.creator_follows
  FOR SELECT
  USING (auth.uid() = follower_id OR auth.uid() = creator_id);

CREATE POLICY "Users can follow creators"
  ON public.creator_follows
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow creators"
  ON public.creator_follows
  FOR DELETE
  USING (auth.uid() = follower_id);

CREATE INDEX IF NOT EXISTS idx_creator_follows_creator ON public.creator_follows (creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_follows_follower ON public.creator_follows (follower_id);

-- 3) Like creators
CREATE TABLE IF NOT EXISTS public.creator_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, creator_id)
);
ALTER TABLE public.creator_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and creators can view relevant likes"
  ON public.creator_likes
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = creator_id);

CREATE POLICY "Users can like creators"
  ON public.creator_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike creators"
  ON public.creator_likes
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_creator_likes_creator ON public.creator_likes (creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_likes_user ON public.creator_likes (user_id);

-- 4) Subscribe to creators (free/notifications)
CREATE TABLE IF NOT EXISTS public.creator_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, creator_id)
);
ALTER TABLE public.creator_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and creators can view relevant subscriptions"
  ON public.creator_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = creator_id);

CREATE POLICY "Users can subscribe to creators"
  ON public.creator_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsubscribe from creators"
  ON public.creator_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_creator_subs_creator ON public.creator_subscriptions (creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_subs_user ON public.creator_subscriptions (user_id);

-- 5) Donations (one-off)
CREATE TABLE IF NOT EXISTS public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'usd',
  message text,
  status text NOT NULL DEFAULT 'pending', -- pending | paid | canceled | failed
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fan and creator can view related donations"
  ON public.donations
  FOR SELECT
  USING (auth.uid() = fan_id OR auth.uid() = creator_id);

CREATE POLICY "Fan can create donation records"
  ON public.donations
  FOR INSERT
  WITH CHECK (auth.uid() = fan_id);

-- service role will bypass RLS for updates (e.g., mark paid)

CREATE INDEX IF NOT EXISTS idx_donations_creator ON public.donations (creator_id);
CREATE INDEX IF NOT EXISTS idx_donations_fan ON public.donations (fan_id);

-- 6) Public creators list (bypasses RLS via SECURITY DEFINER)
create or replace function public.get_public_creator_profiles()
returns table (
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  bio text,
  country_code text,
  follower_count integer,
  like_count integer,
  subscription_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id,
         p.display_name,
         p.username,
         p.avatar_url,
         p.bio,
         p.country_code,
         coalesce(f.followers, 0)::int as follower_count,
         coalesce(l.likes, 0)::int as like_count,
         coalesce(s.subs, 0)::int as subscription_count
  from public.profiles p
  left join (
    select creator_id, count(*) as followers
    from public.creator_follows
    group by creator_id
  ) f on f.creator_id = p.user_id
  left join (
    select creator_id, count(*) as likes
    from public.creator_likes
    group by creator_id
  ) l on l.creator_id = p.user_id
  left join (
    select creator_id, count(*) as subs
    from public.creator_subscriptions
    group by creator_id
  ) s on s.creator_id = p.user_id
  where coalesce(p.user_type, 'fan') = 'barber' or coalesce(p.is_creator, false) = true
$$;

-- 7) Creator summary helper
create or replace function public.get_creator_summary(_creator_id uuid)
returns table (
  follower_count integer,
  like_count integer,
  subscription_count integer,
  total_donated_cents integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.creator_follows where creator_id = _creator_id) as follower_count,
    (select count(*)::int from public.creator_likes where creator_id = _creator_id) as like_count,
    (select count(*)::int from public.creator_subscriptions where creator_id = _creator_id) as subscription_count,
    (select coalesce(sum(amount_cents)::int, 0) from public.donations where creator_id = _creator_id and status = 'paid') as total_donated_cents
$$;
