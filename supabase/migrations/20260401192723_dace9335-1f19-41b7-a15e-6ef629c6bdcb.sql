
-- RPC to increment views on a specific creator_content row
CREATE OR REPLACE FUNCTION public.increment_content_views(p_content_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE creator_content
  SET views = COALESCE(views, 0) + 1
  WHERE id = p_content_id;
END;
$$;

-- RPC to increment shares on a specific creator_content row
CREATE OR REPLACE FUNCTION public.increment_content_shares(p_content_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE creator_content
  SET shares = COALESCE(shares, 0) + 1
  WHERE id = p_content_id;
END;
$$;
