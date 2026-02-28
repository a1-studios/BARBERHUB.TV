

## Fix Sponsor Ads RLS — Add `sovereign` Role

### Root Cause
The `sponsor_ads` table has RLS policies that only allow the `admin` role. Your account has the `sovereign` role, so INSERT/UPDATE/DELETE are all blocked.

### Changes

#### SQL migration: Update all 4 policies to include `sovereign`
Drop and recreate the INSERT, UPDATE, DELETE, and admin SELECT policies to allow both `admin` and `sovereign` roles:

```sql
-- INSERT
DROP POLICY "Admins can create sponsor ads" ON sponsor_ads;
CREATE POLICY "Admins and sovereigns can create sponsor ads"
ON sponsor_ads FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sovereign'));

-- UPDATE
DROP POLICY "Admins can update sponsor ads" ON sponsor_ads;
CREATE POLICY "Admins and sovereigns can update sponsor ads"
ON sponsor_ads FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sovereign'));

-- DELETE
DROP POLICY "Admins can delete sponsor ads" ON sponsor_ads;
CREATE POLICY "Admins and sovereigns can delete sponsor ads"
ON sponsor_ads FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sovereign'));

-- SELECT (admin-level full view)
DROP POLICY "Admins can view all sponsor ads" ON sponsor_ads;
CREATE POLICY "Admins and sovereigns can view all sponsor ads"
ON sponsor_ads FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sovereign'));
```

No frontend changes needed — the code is correct, only the database policies are blocking the operation.

