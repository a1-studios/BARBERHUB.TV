-- Phase 1.1: Add streaming columns to battles table
ALTER TABLE battles ADD COLUMN IF NOT EXISTS twilio_room_sid TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS barber1_stream_sid TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS barber2_stream_sid TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS barber1_is_streaming BOOLEAN DEFAULT false;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS barber2_is_streaming BOOLEAN DEFAULT false;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS barber1_stream_started_at TIMESTAMPTZ;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS barber2_stream_started_at TIMESTAMPTZ;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS streaming_type TEXT DEFAULT 'twilio';

-- Phase 1.2: Add streaming columns to barber_profiles table
ALTER TABLE barber_profiles ADD COLUMN IF NOT EXISTS can_stream BOOLEAN DEFAULT true;
ALTER TABLE barber_profiles ADD COLUMN IF NOT EXISTS total_streams INTEGER DEFAULT 0;
ALTER TABLE barber_profiles ADD COLUMN IF NOT EXISTS total_stream_minutes INTEGER DEFAULT 0;

-- Phase 1.3: Create stream_sessions table
CREATE TABLE IF NOT EXISTS stream_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES barber_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  room_sid TEXT NOT NULL,
  participant_sid TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  peak_viewers INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  status TEXT DEFAULT 'connecting',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on stream_sessions
ALTER TABLE stream_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stream_sessions
CREATE POLICY "Anyone can view stream sessions" ON stream_sessions FOR SELECT USING (true);
CREATE POLICY "Barbers can create their own sessions" ON stream_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Barbers can update their own sessions" ON stream_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at trigger for stream_sessions
CREATE TRIGGER update_stream_sessions_updated_at
  BEFORE UPDATE ON stream_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for stream_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE stream_sessions;

-- Phase 3: Update existing battle to 'active' for testing with proper dates
UPDATE battles 
SET status = 'active', 
    starts_at = NOW(),
    ends_at = NOW() + INTERVAL '2 hours',
    voting_ends_at = NOW() + INTERVAL '3 hours',
    streaming_type = 'twilio'
WHERE id = '43aafe5c-b20f-4d30-854c-e446db068daa';