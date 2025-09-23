-- Phase 1: Enhance existing tables and create new binary user flow architecture

-- Add profile_id to existing profiles table for the new architecture
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_id uuid UNIQUE;

-- Create barber_profiles table for professional creators
CREATE TABLE IF NOT EXISTS public.barber_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  name text NOT NULL,
  specialty text,
  portfolio_url text,
  rating numeric DEFAULT 0,
  bio text,
  years_experience integer,
  location text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create client_profiles table for consumer clients
CREATE TABLE IF NOT EXISTS public.client_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  username text NOT NULL,
  avatar_url text,
  voting_power integer DEFAULT 1,
  total_votes_cast integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create creations table for individual barber content
CREATE TABLE IF NOT EXISTS public.creations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id uuid NOT NULL REFERENCES public.barber_profiles(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  thumbnail_url text,
  description text,
  title text,
  category text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Update existing battles table to support head-to-head format
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS barber1_id uuid REFERENCES public.barber_profiles(id);
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS barber2_id uuid REFERENCES public.barber_profiles(id);
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS creation1_id uuid REFERENCES public.creations(id);
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS creation2_id uuid REFERENCES public.creations(id);
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS vote_count1 integer DEFAULT 0;
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS vote_count2 integer DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.barber_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for barber_profiles
CREATE POLICY "All authenticated users can view barber profiles" 
ON public.barber_profiles 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Barbers can update their own profile" 
ON public.barber_profiles 
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Barbers can insert their own profile" 
ON public.barber_profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'barber'
));

-- RLS Policies for client_profiles
CREATE POLICY "All authenticated users can view client profiles" 
ON public.client_profiles 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Clients can update their own profile" 
ON public.client_profiles 
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Clients can insert their own profile" 
ON public.client_profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'fan'
));

-- RLS Policies for creations
CREATE POLICY "All authenticated users can view creations" 
ON public.creations 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Barbers can manage their own creations" 
ON public.creations 
FOR ALL 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM public.barber_profiles bp 
  WHERE bp.id = barber_id AND bp.user_id = auth.uid()
));

-- Create PostgreSQL Functions for validation
CREATE OR REPLACE FUNCTION public.validate_user_action(action_type text, target_user_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_type_val text;
BEGIN
  SELECT user_type INTO user_type_val
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- Validate action matches user type
  CASE action_type
    WHEN 'create_battle' THEN
      RETURN user_type_val = 'barber';
    WHEN 'vote' THEN
      RETURN user_type_val = 'fan';
    WHEN 'create_content' THEN
      RETURN user_type_val = 'barber';
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Function to check vote eligibility
CREATE OR REPLACE FUNCTION public.check_vote_eligibility(battle_id_param uuid, creation_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_type_val text;
  existing_vote_count integer;
  battle_status_val text;
BEGIN
  -- Check if user is a fan/client
  SELECT user_type INTO user_type_val
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  IF user_type_val != 'fan' THEN
    RETURN false;
  END IF;
  
  -- Check if user has already voted in this battle
  SELECT COUNT(*) INTO existing_vote_count
  FROM public.battle_votes
  WHERE battle_id = battle_id_param AND voter_id = auth.uid();
  
  IF existing_vote_count > 0 THEN
    RETURN false;
  END IF;
  
  -- Check if battle is active
  SELECT status INTO battle_status_val
  FROM public.battles
  WHERE id = battle_id_param;
  
  IF battle_status_val != 'voting' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to calculate battle results
CREATE OR REPLACE FUNCTION public.calculate_battle_results(battle_id_param uuid)
RETURNS TABLE(creation1_votes bigint, creation2_votes bigint, winner_creation_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creation1_id_val uuid;
  creation2_id_val uuid;
  creation1_vote_count bigint;
  creation2_vote_count bigint;
  winner_id uuid;
BEGIN
  -- Get the two creations for this battle
  SELECT battles.creation1_id, battles.creation2_id 
  INTO creation1_id_val, creation2_id_val
  FROM public.battles 
  WHERE id = battle_id_param;
  
  -- Count votes for each creation
  SELECT COUNT(*) INTO creation1_vote_count
  FROM public.battle_votes
  WHERE battle_id = battle_id_param AND submission_id = creation1_id_val;
  
  SELECT COUNT(*) INTO creation2_vote_count
  FROM public.battle_votes
  WHERE battle_id = battle_id_param AND submission_id = creation2_id_val;
  
  -- Determine winner
  IF creation1_vote_count > creation2_vote_count THEN
    winner_id := creation1_id_val;
  ELSIF creation2_vote_count > creation1_vote_count THEN
    winner_id := creation2_id_val;
  ELSE
    winner_id := NULL; -- Tie
  END IF;
  
  RETURN QUERY SELECT creation1_vote_count, creation2_vote_count, winner_id;
END;
$$;

-- Create storage buckets for creations and portfolios
INSERT INTO storage.buckets (id, name, public) 
VALUES ('creations', 'creations', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('portfolios', 'portfolios', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for creations bucket
CREATE POLICY "Authenticated users can view creation files" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'creations');

CREATE POLICY "Barbers can upload creation files" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'creations' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'barber')
);

-- Storage RLS policies for portfolios bucket
CREATE POLICY "Authenticated users can view portfolio files" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'portfolios');

CREATE POLICY "Barbers can manage portfolio files" 
ON storage.objects 
FOR ALL 
TO authenticated 
USING (
  bucket_id = 'portfolios' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'barber')
);

-- Update triggers for updated_at columns
CREATE TRIGGER update_barber_profiles_updated_at
  BEFORE UPDATE ON public.barber_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_profiles_updated_at
  BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creations_updated_at
  BEFORE UPDATE ON public.creations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();