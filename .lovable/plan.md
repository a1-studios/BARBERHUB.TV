

# Make Country Required for All Users + Fix Profile Save Crash

## Two Problems, One Fix

### Problem 1: Profile save crashes
When a fan clicks "Create Profile", the form sends `country_code` to the `client_profiles` table -- but that table doesn't have a `country_code` column. That's the error you're seeing. The country should only be saved to the `profiles` table.

### Problem 2: Country is optional
Currently, the country selector is labeled "optional" on the sign-up form. You want **every user** (barber or fan) to pick a country.

---

## Changes

### 1. Fix the crash in ClientProfileForm

**File: `src/components/profiles/ClientProfileForm.tsx`**

Stop spreading the full `formData` (which includes `country_code`) into the `client_profiles` insert/update. Instead, only send columns that exist on `client_profiles`:

- Build a separate `clientProfileData` object with just `username`, `avatar_url`, and `user_id`
- Keep the existing code that saves `country_code` to the `profiles` table (lines 74-81) -- that part is correct

### 2. Make country required on the sign-up form

**File: `src/components/auth/SignUpForm.tsx`**

- Change the label from "Country (optional)" to "Country *"
- Add validation: if no country is selected, show an error and block sign-up
- Add a helper text like "Represent your nation in battles and tournaments"

### 3. Make country required on the client profile form too

**File: `src/components/profiles/ClientProfileForm.tsx`**

- Change the label from "Country (optional)" to "Country *"
- Add validation: require `country_code` before allowing profile creation
- Update the helper text to emphasize its importance

---

## Technical Details

### ClientProfileForm.tsx -- Fix the insert payload

Current (broken):
```tsx
const profileData = {
  ...formData,        // includes country_code -- crashes!
  user_id: user.id
};
await supabase.from('client_profiles').insert(profileData);
```

Fixed:
```tsx
const clientProfileData = {
  username: formData.username,
  avatar_url: formData.avatar_url || null,
  user_id: user.id,
};
await supabase.from('client_profiles').insert(clientProfileData);

// country_code goes to profiles table only (already exists)
await supabase
  .from('profiles')
  .update({ username: formData.username, country_code: formData.country_code || null })
  .eq('user_id', user.id);
```

### SignUpForm.tsx -- Add country validation

```tsx
const validateForm = () => {
  // ... existing checks ...

  if (!formData.countryCode) {
    toast.error('Please select your country');
    return false;
  }

  return true;
};
```

And update the label:
```tsx
<Label htmlFor="country">Country *</Label>
```

### ClientProfileForm.tsx -- Add country validation

```tsx
const validate = () => {
  // ... existing username check ...

  if (!formData.country_code) {
    newErrors.country_code = 'Country is required';
  }

  return Object.keys(newErrors).length === 0;
};
```

And update the label:
```tsx
<Label>Country *</Label>
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/profiles/ClientProfileForm.tsx` | Fix insert payload (don't send `country_code` to `client_profiles`); make country required with validation |
| `src/components/auth/SignUpForm.tsx` | Make country required with validation; update label from "optional" to required |

No database changes needed -- `country_code` already exists on the `profiles` table where it belongs.
