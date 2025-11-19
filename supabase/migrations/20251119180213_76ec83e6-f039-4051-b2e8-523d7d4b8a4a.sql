-- Create function to create battle notifications
CREATE OR REPLACE FUNCTION create_battle_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Create function to notify battle participants
CREATE OR REPLACE FUNCTION notify_battle_participants(
  p_battle_id UUID,
  p_winner_id UUID,
  p_title TEXT,
  p_message TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant RECORD;
BEGIN
  -- Notify all voters
  FOR v_participant IN 
    SELECT DISTINCT voter_id 
    FROM battle_votes 
    WHERE battle_id = p_battle_id
  LOOP
    PERFORM create_battle_notification(
      v_participant.voter_id,
      'battle_completed',
      p_title,
      p_message,
      jsonb_build_object(
        'battle_id', p_battle_id,
        'winner_id', p_winner_id
      )
    );
  END LOOP;
  
  -- Notify battle participants
  FOR v_participant IN 
    SELECT user_id 
    FROM battle_participants 
    WHERE battle_id = p_battle_id
  LOOP
    PERFORM create_battle_notification(
      v_participant.user_id,
      'battle_result',
      p_title,
      CASE 
        WHEN v_participant.user_id = p_winner_id THEN '🎉 Congratulations! You won the battle!'
        ELSE 'Your battle has ended. Better luck next time!'
      END,
      jsonb_build_object(
        'battle_id', p_battle_id,
        'winner_id', p_winner_id,
        'is_winner', v_participant.user_id = p_winner_id
      )
    );
  END LOOP;
END;
$$;

-- Create index for better notification query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id) WHERE read = false;