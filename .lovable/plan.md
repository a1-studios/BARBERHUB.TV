

## Add Social Media Links to Barber Profile Header (Max 3)

### What This Does
Displays up to 3 social media icons (Instagram, Facebook, Twitter/X, YouTube) on the barber's profile header card, right below the specialty text. Each icon links out to the barber's social profile. The data is saved in the database and managed through Barber Settings.

### Current State
- The **BarberSettings** form already has input fields for Instagram, Facebook, Twitter, and YouTube
- However, these fields are **never saved** -- the `barber_profiles` database table has no social media columns
- The form always resets social media fields to empty strings on load (lines 153-156 in BarberSettings.tsx)
- The social media data is completely non-functional right now

### Changes Required

#### 1. Database Migration -- Add Social Media Columns
Add 4 nullable text columns to `barber_profiles`:
- `instagram_handle`
- `facebook_handle`
- `twitter_handle`
- `youtube_handle`

Also update the `public_barber_profiles` view to include these new columns so they're available on the public profile page too.

#### 2. BarberSettings.tsx -- Save and Load Social Media
- **Load**: Populate the form fields from `barberProfile.instagram_handle`, `.facebook_handle`, `.twitter_handle`, `.youtube_handle` instead of hardcoded empty strings
- **Save**: Add the 4 social media fields to the `barberData` object in the `updateBarberMutation` so they actually persist to the database

#### 3. BarberProfileHeader.tsx -- Display Social Icons
- Add a new optional prop `socialLinks` with type `{ instagram?: string; facebook?: string; twitter?: string; youtube?: string }`
- Below the specialty text, render a row of clickable social media icons
- Only show icons for platforms the barber has filled in
- Cap display at 3 icons maximum (in the order: Instagram, Twitter, YouTube, Facebook)
- Each icon opens the social profile in a new tab
- Use branded colors: Instagram (pink), Twitter/X (blue), YouTube (red), Facebook (blue)

#### 4. Profile.tsx -- Pass Social Data to Header
- Pass the new `socialLinks` prop to `BarberProfileHeader` using data from `barberProfile`

#### 5. BarberPublicProfile.tsx -- Show Social on Public Profile Too
- After the view is updated, read the social columns from `public_barber_profiles`
- Display the same social icons on the public-facing barber profile

### Visual Layout

The social icons will appear as small, colored icon buttons in a horizontal row:

```text
 BarberProfileHeader
+-----------------------------------------------+
| [Avatar]  Display Name  [Tier Badge] [Flag]   |
|           texture (specialty)                  |
|           [IG] [X] [YT]  <-- social icons     |
|                                                |
|  7 Followers  7 Likes  4 Subscribers  $0 Don.  |
|  [View Public Profile]  [Settings]             |
+-----------------------------------------------+
```

### Technical Details

**Database migration SQL:**
```sql
ALTER TABLE barber_profiles
  ADD COLUMN instagram_handle text,
  ADD COLUMN facebook_handle text,
  ADD COLUMN twitter_handle text,
  ADD COLUMN youtube_handle text;

CREATE OR REPLACE VIEW public_barber_profiles AS
  SELECT ... (existing columns) ...,
    bp.instagram_handle,
    bp.facebook_handle,
    bp.twitter_handle,
    bp.youtube_handle
  FROM barber_profiles bp
  LEFT JOIN profiles p ON ...
  (rest of existing view definition);
```

**BarberProfileHeader social rendering logic:**
```typescript
const socialLinks = [
  { key: 'instagram', url: socialLinks?.instagram, icon: Instagram, color: 'text-pink-500' },
  { key: 'twitter', url: socialLinks?.twitter, icon: Twitter, color: 'text-blue-400' },
  { key: 'youtube', url: socialLinks?.youtube, icon: Youtube, color: 'text-red-500' },
  { key: 'facebook', url: socialLinks?.facebook, icon: Facebook, color: 'text-blue-500' },
].filter(s => s.url).slice(0, 3); // max 3
```

**BarberSettings save fix:**
```typescript
const barberData = {
  ...existingFields,
  instagram_handle: data.instagram,
  facebook_handle: data.facebook,
  twitter_handle: data.twitter,
  youtube_handle: data.youtube
};
```

### Files Modified

| File | Change |
|------|--------|
| Database migration | Add 4 social media columns to `barber_profiles`, update `public_barber_profiles` view |
| `src/components/profiles/BarberSettings.tsx` | Load and save social media fields to/from database |
| `src/components/barber/BarberProfileHeader.tsx` | Add `socialLinks` prop, render up to 3 social icons |
| `src/pages/Profile.tsx` | Pass social data from `barberProfile` to `BarberProfileHeader` |
| `src/pages/BarberPublicProfile.tsx` | Display social icons on public profile |

