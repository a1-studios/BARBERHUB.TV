
ALTER TABLE public.barber_profiles
ADD COLUMN competition_categories text[] DEFAULT '{}';
