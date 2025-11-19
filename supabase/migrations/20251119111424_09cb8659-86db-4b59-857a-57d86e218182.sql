-- Update get_battle_vote_results to include subscription tier checking
DROP FUNCTION IF EXISTS public.get_battle_vote_results(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.get_battle_vote_results(
  _battle_id uuid,
  _barber_weight integer DEFAULT 3,
  _fan_weight integer DEFAULT 1
)
RETURNS TABLE(submission_id uuid, weighted_votes bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT v.submission_id,
         SUM(
           CASE 
             -- Barbers with active subscriptions get 3x vote
             WHEN COALESCE(p.user_type, 'fan') = 'barber' 
                  AND EXISTS (
                    SELECT 1 FROM barber_profiles bp 
                    WHERE bp.user_id = p.user_id 
                    AND bp.active_subscription_tier IS NOT NULL
                  ) THEN (_fan_weight * 3)
             
             -- Barbers who are verified by competition get 3x vote
             WHEN COALESCE(p.user_type, 'fan') = 'barber' 
                  AND p.is_verified_by_competition = true THEN (_fan_weight * 3)
             
             -- Fans verified by competition (not expired) get 3x vote
             WHEN COALESCE(p.user_type, 'fan') = 'fan'
                  AND p.is_verified_by_competition = true 
                  AND (p.three_x_vote_expires_at IS NULL OR p.three_x_vote_expires_at > now()) 
             THEN (_fan_weight * 3)
             
             -- Everyone else gets standard weight
             ELSE _fan_weight
           END
         )::bigint AS weighted_votes
  FROM public.battle_votes v
  LEFT JOIN public.profiles p
    ON p.user_id = v.voter_id
  WHERE v.battle_id = _battle_id
  GROUP BY v.submission_id
  ORDER BY weighted_votes DESC;
END;
$function$;

-- Add helpful comment
COMMENT ON FUNCTION public.get_battle_vote_results IS 'Calculates weighted votes for battle submissions. Barbers with active subscriptions or tournament verification get 3x vote. Fans only get 3x from tournament verification (time-limited).';
