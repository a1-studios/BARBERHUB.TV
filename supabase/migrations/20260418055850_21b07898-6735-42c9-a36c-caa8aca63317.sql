INSERT INTO public.platform_state (key, value, updated_at)
VALUES 
  ('challenge_stakes_enabled', 'false', now()),
  ('challenge_min_stake_bb', '100', now())
ON CONFLICT (key) DO NOTHING;