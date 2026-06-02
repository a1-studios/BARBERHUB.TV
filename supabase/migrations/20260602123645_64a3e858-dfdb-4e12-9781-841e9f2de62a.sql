-- 1. Battles: lock down IVS streaming credentials so only service_role can read/write them.
REVOKE SELECT (ivs_stream_key, ivs_channel_arn) ON public.battles FROM authenticated, anon;
REVOKE UPDATE (ivs_stream_key, ivs_channel_arn) ON public.battles FROM authenticated, anon;
REVOKE INSERT (ivs_stream_key, ivs_channel_arn) ON public.battles FROM authenticated, anon;

-- 2. Profiles: lock down sensitive financial/admin columns from broad cross-user reads.
-- Users may read their own row via service-definer functions; cross-user SELECT * will
-- still succeed but these columns will be omitted/denied by column-level grants.
REVOKE SELECT (banned_reason, banned_at, barber_bucks, total_earnings, referral_code, referred_by)
  ON public.profiles FROM authenticated, anon;

-- 3. Barber profiles: prevent unauthenticated visitors from reading rows (incl. lat/lng).
DROP POLICY IF EXISTS "Public barber profiles are viewable by everyone" ON public.barber_profiles;

-- service_role retains full access for edge functions / admin tooling.
GRANT ALL ON public.battles TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.barber_profiles TO service_role;