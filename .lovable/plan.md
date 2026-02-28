

## Sponsor Ad Click Tracking + Metrics in Sovereign HQ

### 1. Database: Create `sponsor_ad_clicks` table
New table to log every click/impression:

```sql
CREATE TABLE sponsor_ad_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_ad_id UUID NOT NULL REFERENCES sponsor_ads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  click_type TEXT NOT NULL DEFAULT 'click', -- 'click', 'impression'
  slide_type TEXT, -- 'sponsor-image' or 'sponsor-text'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sponsor_ad_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert their own clicks
CREATE POLICY "Users can insert own clicks"
  ON sponsor_ad_clicks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow anonymous impressions too
CREATE POLICY "Anon can insert clicks"
  ON sponsor_ad_clicks FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Sovereign can read all
CREATE POLICY "Sovereign can read all clicks"
  ON sponsor_ad_clicks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'sovereign'));
```

### 2. `ArenaTicker.tsx` — Track clicks + open external links properly
- Update `handleClick` to:
  1. Insert a row into `sponsor_ad_clicks` with the sponsor_ad_id, user_id, slide_type
  2. If the link starts with `http`, open in a new tab via `window.open(link, '_blank')` instead of `onNavigate`
  3. Otherwise fall back to `onNavigate` for internal routes

### 3. `SponsorControlPanel.tsx` — Add engagement metrics section
- Fetch click counts per sponsor using a grouped query on `sponsor_ad_clicks`
- Display per-sponsor metrics inline: total clicks, unique users, last 7 days clicks
- Add a summary stats row at the top: Total Clicks, Unique Clickers, CTR estimate

### 4. `SovereignHQ.tsx` — No structural changes needed
The `SponsorControlPanel` already renders inside Sovereign HQ; the metrics will appear there automatically.

