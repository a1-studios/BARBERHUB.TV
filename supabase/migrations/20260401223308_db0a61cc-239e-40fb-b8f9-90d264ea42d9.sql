
-- Add stream_type column to stream_sessions
ALTER TABLE public.stream_sessions
ADD COLUMN IF NOT EXISTS stream_type text NOT NULL DEFAULT 'battle';

-- Insert premium streaming feature flag into platform_state
INSERT INTO public.platform_state (key, value)
VALUES ('is_premium_streaming_enforced', 'false')
ON CONFLICT (key) DO NOTHING;
