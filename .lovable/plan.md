

## Fix Sponsor Logo Upload

### Root Cause
The `sponsor-logos` storage bucket has no INSERT policy, so uploads are blocked by RLS. The existing UPDATE/DELETE policies only check for the `admin` role, but the sovereign user has the `sovereign` role — not `admin`.

### Changes

#### 1. SQL migration: Add storage policies for `sponsor-logos`
- Add INSERT policy allowing users with `admin` OR `sovereign` role
- Update existing UPDATE and DELETE policies to also allow `sovereign` role
- Keep the public SELECT policy as-is

```sql
-- Add INSERT policy
CREATE POLICY "Admins and sovereigns can upload sponsor logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'sponsor-logos'
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sovereign'))
);

-- Drop and recreate UPDATE/DELETE to include sovereign
DROP POLICY "Admins can update sponsor logos" ON storage.objects;
CREATE POLICY "Admins and sovereigns can update sponsor logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'sponsor-logos'
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sovereign'))
);

DROP POLICY "Admins can delete sponsor logos" ON storage.objects;
CREATE POLICY "Admins and sovereigns can delete sponsor logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'sponsor-logos'
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sovereign'))
);
```

#### 2. Update `SponsorAdsManager.tsx` — improve file input
- Change `accept="image/*"` to `accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"` to prevent non-web formats like `.psd`
- Add client-side validation with a toast error if a user somehow selects an unsupported file
- Add a file size limit (e.g., 5MB max)

