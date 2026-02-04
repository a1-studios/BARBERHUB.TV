-- Fix notification triggers to prevent self-notifications
-- Add guard clauses to skip notification when actor = recipient

-- Prevent self-follow notifications
CREATE OR REPLACE FUNCTION notify_on_new_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_follower_name TEXT;
BEGIN
  -- Skip if user is following themselves (edge case)
  IF NEW.follower_id = NEW.creator_id THEN
    RETURN NEW;
  END IF;

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

-- Prevent self-like notifications  
CREATE OR REPLACE FUNCTION notify_on_new_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_liker_name TEXT;
BEGIN
  -- Skip if user is liking themselves (edge case)
  IF NEW.user_id = NEW.creator_id THEN
    RETURN NEW;
  END IF;

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

-- Prevent self-subscription notifications
CREATE OR REPLACE FUNCTION notify_on_new_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscriber_name TEXT;
BEGIN
  -- Skip if user is subscribing to themselves (edge case)
  IF NEW.user_id = NEW.creator_id THEN
    RETURN NEW;
  END IF;

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

-- Prevent self-donation notifications
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
  -- Skip if user is donating to themselves (edge case)
  IF NEW.fan_id = NEW.creator_id THEN
    RETURN NEW;
  END IF;

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

-- Cleanup existing self-action notifications that were incorrectly created
DELETE FROM notifications
WHERE type = 'new_like' 
  AND user_id = (data->>'liker_id')::uuid;

DELETE FROM notifications
WHERE type = 'new_follower' 
  AND user_id = (data->>'follower_id')::uuid;

DELETE FROM notifications
WHERE type = 'new_subscriber' 
  AND user_id = (data->>'subscriber_id')::uuid;

DELETE FROM notifications
WHERE type = 'new_donation' 
  AND user_id = (data->>'donor_id')::uuid;