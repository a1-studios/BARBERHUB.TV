-- Add nationality and nickname fields to barber profiles
ALTER TABLE public.barber_profiles 
ADD COLUMN country_code TEXT,
ADD COLUMN nickname TEXT;

-- Add streaming and timing fields to battles table
ALTER TABLE public.battles 
ADD COLUMN stream_url TEXT,
ADD COLUMN live_viewers INTEGER DEFAULT 0;