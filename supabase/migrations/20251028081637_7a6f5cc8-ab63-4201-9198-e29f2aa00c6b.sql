-- Ensure profiles.user_id is unique for FK reference
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_user_id_unique'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- Add FK from community_notes.user_id -> profiles.user_id for embedding/joins
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_notes_user_id_fkey'
  ) THEN
    ALTER TABLE public.community_notes
    ADD CONSTRAINT community_notes_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(user_id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Public, minimal view for user directory (safe columns only)
CREATE OR REPLACE VIEW public.public_user_profiles AS
SELECT user_id, display_name, username, avatar_url, user_type
FROM public.profiles;

-- Allow frontend to read the public view
GRANT SELECT ON public.public_user_profiles TO anon, authenticated;