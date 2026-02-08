
-- Fix security definer view warning
ALTER VIEW public_barber_profiles SET (security_invoker = on);
