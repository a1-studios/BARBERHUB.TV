-- Add barber_position column to stream_sessions if it doesn't exist
ALTER TABLE stream_sessions 
ADD COLUMN IF NOT EXISTS barber_position INTEGER;

-- Make room_sid nullable since we may not always have it at creation time
ALTER TABLE stream_sessions 
ALTER COLUMN room_sid DROP NOT NULL;