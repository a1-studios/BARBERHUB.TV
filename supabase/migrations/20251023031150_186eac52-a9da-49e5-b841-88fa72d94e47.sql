-- Function to notify barber on new follower
CREATE OR REPLACE FUNCTION notify_on_new_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_follower_name TEXT;
BEGIN
  -- Get follower's display name
  SELECT display_name INTO v_follower_name
  FROM profiles
  WHERE user_id = NEW.follower_id;
  
  -- Create notification for the creator/barber
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.creator_id,
    'new_follower',
    'New Follower! 🎉',
    COALESCE(v_follower_name, 'Someone') || ' started following you',
    jsonb_build_object('follower_id', NEW.follower_id, 'follow_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

-- Function to notify barber on new like
CREATE OR REPLACE FUNCTION notify_on_new_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_liker_name TEXT;
BEGIN
  -- Get liker's display name
  SELECT display_name INTO v_liker_name
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- Create notification for the creator/barber
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.creator_id,
    'new_like',
    'New Like! ❤️',
    COALESCE(v_liker_name, 'Someone') || ' liked your profile',
    jsonb_build_object('liker_id', NEW.user_id, 'like_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

-- Function to notify barber on new subscription
CREATE OR REPLACE FUNCTION notify_on_new_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscriber_name TEXT;
BEGIN
  -- Get subscriber's display name
  SELECT display_name INTO v_subscriber_name
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- Create notification for the creator/barber
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.creator_id,
    'new_subscriber',
    'New Subscriber! 🌟',
    COALESCE(v_subscriber_name, 'Someone') || ' subscribed to you',
    jsonb_build_object('subscriber_id', NEW.user_id, 'subscription_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

-- Function to notify barber on new donation
CREATE OR REPLACE FUNCTION notify_on_new_donation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_donor_name TEXT;
  v_amount_display TEXT;
BEGIN
  -- Only notify on paid donations
  IF NEW.status = 'paid' THEN
    -- Get donor's display name
    SELECT display_name INTO v_donor_name
    FROM profiles
    WHERE user_id = NEW.fan_id;
    
    -- Format amount (convert cents to dollars)
    v_amount_display := '$' || (NEW.amount_cents::DECIMAL / 100)::TEXT;
    
    -- Create notification for the creator/barber
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.creator_id,
      'new_donation',
      'New Donation! 💰',
      COALESCE(v_donor_name, 'Someone') || ' donated ' || v_amount_display || 
      CASE WHEN NEW.message IS NOT NULL THEN ': "' || LEFT(NEW.message, 50) || '"' ELSE '' END,
      jsonb_build_object(
        'donor_id', NEW.fan_id, 
        'donation_id', NEW.id, 
        'amount_cents', NEW.amount_cents,
        'message', NEW.message
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_notify_new_follow
  AFTER INSERT ON creator_follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_follow();

CREATE TRIGGER trigger_notify_new_like
  AFTER INSERT ON creator_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_like();

CREATE TRIGGER trigger_notify_new_subscription
  AFTER INSERT ON creator_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_subscription();

CREATE TRIGGER trigger_notify_new_donation
  AFTER INSERT OR UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_donation();