-- Add recording columns to stream_sessions for VOD storage
ALTER TABLE stream_sessions 
ADD COLUMN IF NOT EXISTS recording_url TEXT,
ADD COLUMN IF NOT EXISTS recording_sid TEXT,
ADD COLUMN IF NOT EXISTS recording_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS room_name TEXT;

-- Add index for quick lookups by room_sid (already exists)
CREATE INDEX IF NOT EXISTS idx_stream_sessions_room_sid ON stream_sessions(room_sid);

-- Add comment for documentation
COMMENT ON COLUMN stream_sessions.recording_url IS 'Twilio recording URL for VOD playback';
COMMENT ON COLUMN stream_sessions.recording_sid IS 'Twilio recording SID for API operations';
COMMENT ON COLUMN stream_sessions.recording_status IS 'Recording status: pending, processing, completed, failed';
COMMENT ON COLUMN stream_sessions.room_name IS 'Twilio room name for matching webhooks';