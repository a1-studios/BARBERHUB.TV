
-- 1) Private contact data — phone numbers locked to owner only
CREATE TABLE IF NOT EXISTS public.user_private_contacts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_private_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own private contact"
  ON public.user_private_contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners insert own private contact"
  ON public.user_private_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners update own private contact"
  ON public.user_private_contacts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners delete own private contact"
  ON public.user_private_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Migrate existing phone numbers
INSERT INTO public.user_private_contacts (user_id, phone_number)
SELECT user_id, phone_number
FROM public.profiles
WHERE phone_number IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
SET phone_number = COALESCE(public.user_private_contacts.phone_number, EXCLUDED.phone_number);

INSERT INTO public.user_private_contacts (user_id, phone_number)
SELECT user_id, phone_number
FROM public.barber_profiles
WHERE phone_number IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
SET phone_number = COALESCE(public.user_private_contacts.phone_number, EXCLUDED.phone_number);

-- Drop phone_number columns from publicly-readable tables
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_number;
ALTER TABLE public.barber_profiles DROP COLUMN IF EXISTS phone_number;

-- 2) Creator content — hide drafts from non-owners
DROP POLICY IF EXISTS "Content is viewable by authenticated users with course gating" ON public.creator_content;
CREATE POLICY "Published content viewable; owners see drafts"
  ON public.creator_content FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = creator_id)
    OR (
      is_published = true
      AND (content_type <> 'course_teaser' OR public.has_role(auth.uid(), 'barber'::app_role))
    )
  );

-- 3) M4M session logs — restrict broad read to involved parties only
DROP POLICY IF EXISTS "Anyone can read verified sessions" ON public.m4m_session_logs;
CREATE POLICY "Parties read own verified sessions"
  ON public.m4m_session_logs FOR SELECT
  TO authenticated
  USING (
    barber_user_id = auth.uid()
    OR client_user_id = auth.uid()
  );

-- 4) Realtime notifications channel — exact match, no prefix bypass
DROP POLICY IF EXISTS "authenticated_realtime_read" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated_realtime_write" ON realtime.messages;

CREATE POLICY "authenticated_realtime_read"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    (realtime.topic() LIKE 'battle-presence-%')
    OR (realtime.topic() LIKE 'battle-chat-%')
    OR (realtime.topic() LIKE 'battle-viewers-%')
    OR (realtime.topic() LIKE 'battle-room-%')
    OR (realtime.topic() LIKE 'contender-%')
    OR (realtime.topic() LIKE 'arena-%')
    OR (realtime.topic() LIKE 'theater-%')
    OR (realtime.topic() LIKE 'tournament-%')
    OR (realtime.topic() LIKE 'live-pulse%')
    OR (realtime.topic() = 'match-notifications')
    OR (realtime.topic() = ('user-' || auth.uid()::text))
    OR (realtime.topic() = ('notifications-' || auth.uid()::text))
    OR ((realtime.topic() LIKE 'sovereign-%') AND public.has_role(auth.uid(), 'sovereign'::app_role))
    OR ((realtime.topic() LIKE 'admin-%') AND (public.has_role(auth.uid(), 'sovereign'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)))
  );

CREATE POLICY "authenticated_realtime_write"
  ON realtime.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (realtime.topic() LIKE 'battle-presence-%')
    OR (realtime.topic() LIKE 'battle-chat-%')
    OR (realtime.topic() LIKE 'battle-viewers-%')
    OR (realtime.topic() LIKE 'battle-room-%')
    OR (realtime.topic() LIKE 'contender-%')
    OR (realtime.topic() LIKE 'arena-%')
    OR (realtime.topic() LIKE 'theater-%')
    OR (realtime.topic() LIKE 'tournament-%')
    OR (realtime.topic() LIKE 'live-pulse%')
    OR (realtime.topic() = 'match-notifications')
    OR (realtime.topic() = ('user-' || auth.uid()::text))
    OR (realtime.topic() = ('notifications-' || auth.uid()::text))
    OR ((realtime.topic() LIKE 'sovereign-%') AND public.has_role(auth.uid(), 'sovereign'::app_role))
    OR ((realtime.topic() LIKE 'admin-%') AND (public.has_role(auth.uid(), 'sovereign'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)))
  );
