-- Phase 1: Fix Materialized View Auto-Refresh
-- Create function to refresh barber_stats when relevant data changes
CREATE OR REPLACE FUNCTION refresh_barber_stats_on_change()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY barber_stats;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on creator_follows (INSERT/DELETE)
CREATE TRIGGER refresh_stats_on_follow
AFTER INSERT OR DELETE ON creator_follows
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_barber_stats_on_change();

-- Trigger on creator_likes (INSERT/DELETE)
CREATE TRIGGER refresh_stats_on_like
AFTER INSERT OR DELETE ON creator_likes
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_barber_stats_on_change();

-- Trigger on creator_subscriptions (INSERT/DELETE)
CREATE TRIGGER refresh_stats_on_subscription
AFTER INSERT OR DELETE ON creator_subscriptions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_barber_stats_on_change();

-- Trigger on donations (INSERT/UPDATE for paid status)
CREATE TRIGGER refresh_stats_on_donation
AFTER INSERT OR UPDATE ON donations
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_barber_stats_on_change();

-- One-time refresh to fix current data
REFRESH MATERIALIZED VIEW CONCURRENTLY barber_stats;