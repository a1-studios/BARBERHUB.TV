

## Pioneer Mutual Reputation System (Anti-Gravity Native)

### Clarification Applied
All backend workflows run through **Anti-Gravity** -- Supabase DB triggers, functions, and edge functions. No n8n dependency. Anti-Gravity autonomously detects completed appointments and manages reputation computation.

---

### Database Migration

**Tables:**

```sql
CREATE TABLE appointment_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  reviewee_id UUID NOT NULL,
  star_rating INTEGER NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
  comment TEXT,
  is_internal_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, reviewer_id)
);

CREATE TABLE review_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES appointment_reviews(id) ON DELETE CASCADE,
  tag_slug TEXT NOT NULL,
  is_negative BOOLEAN NOT NULL DEFAULT false,
  is_internal_only BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE reputation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  avg_star_rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  top_tags JSONB DEFAULT '[]',
  internal_top_tags JSONB DEFAULT '[]',
  risk_flags JSONB DEFAULT '{}',
  last_computed_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS:** Public reviews visible to all authenticated. Internal reviews/tags (`is_internal_only = true`) visible only via `has_role(auth.uid(), 'barber')`. `reputation_scores` readable by all for public fields; `internal_top_tags` and `risk_flags` exposed only through a security definer function for barbers.

**Anti-Gravity DB Trigger (replaces n8n):**

```sql
-- Auto-notify users when appointment completes
CREATE FUNCTION notify_review_prompt() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Notify client
    PERFORM create_battle_notification(
      NEW.client_id, 'review_prompt',
      'How was your cut? ✂️', 'Rate your barber!',
      jsonb_build_object('appointment_id', NEW.id, 'reviewee_id', NEW.barber_id)
    );
    -- Notify barber (via barber_profiles user_id lookup)
    PERFORM create_battle_notification(
      (SELECT user_id FROM barber_profiles WHERE id = NEW.barber_id),
      'review_prompt',
      'Rate your client', 'Leave internal feedback',
      jsonb_build_object('appointment_id', NEW.id, 'reviewee_id', NEW.client_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_review_prompt
  AFTER UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION notify_review_prompt();
```

**Anti-Gravity Reputation Recompute Trigger:**

```sql
CREATE FUNCTION recompute_reputation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Recompute for the reviewee after each review insert
  INSERT INTO reputation_scores (user_id, avg_star_rating, total_reviews, top_tags, internal_top_tags, risk_flags, last_computed_at)
  SELECT
    NEW.reviewee_id,
    (SELECT AVG(star_rating)::NUMERIC(3,2) FROM appointment_reviews WHERE reviewee_id = NEW.reviewee_id),
    (SELECT COUNT(*) FROM appointment_reviews WHERE reviewee_id = NEW.reviewee_id),
    (SELECT COALESCE(jsonb_agg(t), '[]') FROM (
      SELECT tag_slug as slug, count(*) as count, is_negative
      FROM review_tags rt JOIN appointment_reviews ar ON ar.id = rt.review_id
      WHERE ar.reviewee_id = NEW.reviewee_id AND rt.is_internal_only = false
      GROUP BY tag_slug, is_negative ORDER BY count DESC LIMIT 5
    ) t),
    (SELECT COALESCE(jsonb_agg(t), '[]') FROM (
      SELECT tag_slug as slug, count(*) as count, is_negative
      FROM review_tags rt JOIN appointment_reviews ar ON ar.id = rt.review_id
      WHERE ar.reviewee_id = NEW.reviewee_id AND rt.is_internal_only = true
      GROUP BY tag_slug, is_negative ORDER BY count DESC LIMIT 5
    ) t),
    (SELECT COALESCE(jsonb_object_agg(tag_slug, cnt), '{}') FROM (
      SELECT tag_slug, count(*) as cnt
      FROM review_tags rt JOIN appointment_reviews ar ON ar.id = rt.review_id
      WHERE ar.reviewee_id = NEW.reviewee_id AND rt.is_internal_only = true AND rt.is_negative = true
      GROUP BY tag_slug
    ) rf),
    NOW()
  ON CONFLICT (user_id) DO UPDATE SET
    avg_star_rating = EXCLUDED.avg_star_rating,
    total_reviews = EXCLUDED.total_reviews,
    top_tags = EXCLUDED.top_tags,
    internal_top_tags = EXCLUDED.internal_top_tags,
    risk_flags = EXCLUDED.risk_flags,
    last_computed_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recompute_reputation
  AFTER INSERT ON appointment_reviews
  FOR EACH ROW EXECUTE FUNCTION recompute_reputation();
```

---

### Edge Function: `submit-review`

Server-side validation and atomic insert. Sets `is_internal_only` automatically based on reviewer's role. Inserts `appointment_reviews` + bulk `review_tags`. The DB trigger handles reputation recompute.

---

### Frontend Components

| File | Action |
|------|--------|
| `src/config/reviewTags.ts` | **Create** -- Tag taxonomy arrays (barber tags + client tags with slugs, emojis, is_negative, is_internal) |
| `src/components/reviews/TagSelector.tsx` | **Create** -- Pill toggle grid component |
| `src/components/reviews/PostAppointmentReviewModal.tsx` | **Create** -- Star rating + pills + optional comment. Calls `submit-review` edge function |
| `src/components/reviews/ClientSnapshotWidget.tsx` | **Create** -- Reads `reputation_scores` for barber-only client insight |
| `src/components/fan/MyAppointments.tsx` | **Modify** -- Add "Review" button on completed past appointments |
| `src/components/booking/BarberAppointmentManager.tsx` | **Modify** -- Add "Review Client" button + `ClientSnapshotWidget` on pending cards |

---

### Anti-Gravity Touchpoints (All Supabase-Native)

| Capability | Mechanism |
|------------|-----------|
| Review prompt trigger | DB trigger on `appointments` status change to `completed` |
| Reputation recompute | DB trigger on `appointment_reviews` INSERT |
| Risk flag surfacing | `ClientSnapshotWidget` reads `reputation_scores.risk_flags` |
| Barber rating sync | Recompute trigger can also update `barber_profiles.rating` |
| Abuse detection | Future: security definer function scanning review patterns |

