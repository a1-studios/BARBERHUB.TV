-- Phase 1: Fix Critical Privilege Escalation
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('barber', 'fan', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Migrate existing data from profiles.user_type to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, user_type::app_role
FROM public.profiles
WHERE user_type IN ('barber', 'fan', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Only system can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Users cannot update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Users cannot delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (false);

-- Update profiles table policies to prevent users from changing user_type
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile (excluding user_type)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- Prevent updating user_type by checking it hasn't changed
  user_type = (SELECT user_type FROM public.profiles WHERE user_id = auth.uid())
);

-- Update battle-related policies to use has_role function
DROP POLICY IF EXISTS "Only barbers can create battles" ON public.battles;
CREATE POLICY "Only barbers can create battles"
ON public.battles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = organizer_id AND
  public.has_role(auth.uid(), 'barber')
);

DROP POLICY IF EXISTS "Only barbers can join battles" ON public.battle_participants;
CREATE POLICY "Only barbers can join battles"
ON public.battle_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  public.has_role(auth.uid(), 'barber')
);

DROP POLICY IF EXISTS "Barber participants can create submissions" ON public.battle_submissions;
CREATE POLICY "Barber participants can create submissions"
ON public.battle_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.battle_participants p
    WHERE p.battle_id = battle_submissions.battle_id
    AND p.user_id = auth.uid()
  ) AND
  public.has_role(auth.uid(), 'barber')
);

-- Update barber_profiles policies
DROP POLICY IF EXISTS "Barbers can insert their own profile" ON public.barber_profiles;
CREATE POLICY "Barbers can insert their own profile"
ON public.barber_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  public.has_role(auth.uid(), 'barber')
);

-- Update client_profiles policies
DROP POLICY IF EXISTS "Clients can insert their own profile" ON public.client_profiles;
CREATE POLICY "Clients can insert their own profile"
ON public.client_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  public.has_role(auth.uid(), 'fan')
);

-- Update creations policies
DROP POLICY IF EXISTS "Barbers can manage their own creations" ON public.creations;
CREATE POLICY "Barbers can manage their own creations"
ON public.creations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.barber_profiles bp
    WHERE bp.id = creations.barber_id
    AND bp.user_id = auth.uid()
  ) AND
  public.has_role(auth.uid(), 'barber')
);

-- Update handle_new_user trigger to also insert into user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type TEXT;
BEGIN
  v_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'fan');
  
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, display_name, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    v_user_type
  );
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_user_type::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;