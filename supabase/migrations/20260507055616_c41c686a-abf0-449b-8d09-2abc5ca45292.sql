
-- 1. Fix Security Definer View
DROP VIEW IF EXISTS public.tournament_finalists;
CREATE VIEW public.tournament_finalists
WITH (security_invoker = on) AS
WITH ranked AS (
  SELECT ts.id, ts.tournament_id, ts.barber_id, ts.phase_id, ts.points,
    ts.wins, ts.draws, ts.losses, ts.votes_for, ts.votes_against,
    ts.vote_difference, ts.matches_played, ts.rank, ts.qualified,
    ts.created_at, ts.updated_at, ts.show_up_points,
    bp.name AS barber_name, bp.country_code, bp.specialty AS category,
    row_number() OVER (PARTITION BY bp.specialty ORDER BY ts.points DESC, ts.votes_for DESC, ts.show_up_points DESC) AS category_rank
  FROM tournament_standings ts
  JOIN barber_profiles bp ON bp.user_id = ts.barber_id
)
SELECT * FROM ranked WHERE category_rank <= 5;

-- 2. Realtime channel authorization
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- SELECT (subscribe) policy
CREATE POLICY "authenticated_realtime_read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Public live battle rooms
  realtime.topic() LIKE 'battle-presence-%'
  OR realtime.topic() LIKE 'battle-chat-%'
  OR realtime.topic() LIKE 'battle-viewers-%'
  OR realtime.topic() LIKE 'battle-room-%'
  OR realtime.topic() LIKE 'contender-%'
  OR realtime.topic() LIKE 'arena-%'
  OR realtime.topic() LIKE 'theater-%'
  OR realtime.topic() LIKE 'tournament-%'
  OR realtime.topic() LIKE 'live-pulse%'
  -- User-scoped notification channels (postgres_changes filtered by user_id, but we still gate channel access)
  OR realtime.topic() = 'match-notifications'
  OR realtime.topic() LIKE ('user-' || auth.uid()::text || '%')
  OR realtime.topic() LIKE ('notifications-' || auth.uid()::text || '%')
  -- Sovereign-only channels
  OR (realtime.topic() LIKE 'sovereign-%' AND public.has_role(auth.uid(), 'sovereign'))
  OR (realtime.topic() LIKE 'admin-%' AND (public.has_role(auth.uid(), 'sovereign') OR public.has_role(auth.uid(), 'admin')))
);

-- INSERT (broadcast/presence write) policy — same scoping
CREATE POLICY "authenticated_realtime_write"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() LIKE 'battle-presence-%'
  OR realtime.topic() LIKE 'battle-chat-%'
  OR realtime.topic() LIKE 'battle-viewers-%'
  OR realtime.topic() LIKE 'battle-room-%'
  OR realtime.topic() LIKE 'contender-%'
  OR realtime.topic() LIKE 'arena-%'
  OR realtime.topic() LIKE 'theater-%'
  OR realtime.topic() LIKE 'tournament-%'
  OR realtime.topic() LIKE 'live-pulse%'
  OR realtime.topic() = 'match-notifications'
  OR realtime.topic() LIKE ('user-' || auth.uid()::text || '%')
  OR realtime.topic() LIKE ('notifications-' || auth.uid()::text || '%')
  OR (realtime.topic() LIKE 'sovereign-%' AND public.has_role(auth.uid(), 'sovereign'))
  OR (realtime.topic() LIKE 'admin-%' AND (public.has_role(auth.uid(), 'sovereign') OR public.has_role(auth.uid(), 'admin')))
);
