-- Add verification fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_verified_by_competition BOOLEAN DEFAULT false,
ADD COLUMN three_x_vote_expires_at TIMESTAMPTZ;

-- Update the get_battle_vote_results function to handle 3x vote power for verified users
CREATE OR REPLACE FUNCTION public.get_battle_vote_results(_battle_id uuid, _barber_weight integer DEFAULT 3, _fan_weight integer DEFAULT 1)
 RETURNS TABLE(submission_id uuid, weighted_votes bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT v.submission_id,
         SUM(
           CASE 
             WHEN COALESCE(p.user_type, 'fan') = 'barber' THEN _barber_weight
             WHEN p.is_verified_by_competition = true 
                  AND (p.three_x_vote_expires_at IS NULL OR p.three_x_vote_expires_at > now()) THEN (_fan_weight * 3)
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