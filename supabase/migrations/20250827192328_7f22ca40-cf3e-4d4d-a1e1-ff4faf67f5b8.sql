-- Add user_type column to profiles table for role selection
ALTER TABLE public.profiles 
ADD COLUMN user_type text CHECK (user_type IN ('barber', 'creator', 'fan', 'client')) DEFAULT 'fan';