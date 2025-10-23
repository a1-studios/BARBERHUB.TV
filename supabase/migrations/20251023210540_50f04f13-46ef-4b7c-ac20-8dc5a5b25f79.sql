-- Add live viewer tracking columns to battles table
ALTER TABLE battles 
ADD COLUMN IF NOT EXISTS barber1_live_viewers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS barber2_live_viewers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewer_check TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS barber1_youtube_video_id TEXT,
ADD COLUMN IF NOT EXISTS barber2_youtube_video_id TEXT,
ADD COLUMN IF NOT EXISTS barber1_peak_viewers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS barber2_peak_viewers INTEGER DEFAULT 0;

-- Create index for efficient querying of active battles
CREATE INDEX IF NOT EXISTS idx_battles_status_voting 
ON battles(status) 
WHERE status = 'voting';

-- Enable Realtime on battles table for live updates
ALTER TABLE battles REPLICA IDENTITY FULL;

-- Add battles table to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'battles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE battles;
  END IF;
END $$;