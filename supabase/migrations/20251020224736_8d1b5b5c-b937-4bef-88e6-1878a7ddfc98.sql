-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read) WHERE read = false;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- System can create notifications
CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Function to create battle notification
CREATE OR REPLACE FUNCTION public.create_battle_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Function to notify battle participants
CREATE OR REPLACE FUNCTION public.notify_battle_participants(
  p_battle_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'battle_update',
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_participant RECORD;
BEGIN
  -- Notify all participants
  FOR v_participant IN 
    SELECT DISTINCT user_id 
    FROM public.battle_participants 
    WHERE battle_id = p_battle_id
  LOOP
    PERFORM create_battle_notification(
      v_participant.user_id,
      p_type,
      p_title,
      p_message,
      jsonb_build_object('battle_id', p_battle_id) || p_data
    );
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Function to notify battle voters
CREATE OR REPLACE FUNCTION public.notify_battle_voters(
  p_battle_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'battle_result',
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_voter RECORD;
BEGIN
  -- Notify all voters
  FOR v_voter IN 
    SELECT DISTINCT voter_id 
    FROM public.battle_votes 
    WHERE battle_id = p_battle_id
  LOOP
    PERFORM create_battle_notification(
      v_voter.voter_id,
      p_type,
      p_title,
      p_message,
      jsonb_build_object('battle_id', p_battle_id) || p_data
    );
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;