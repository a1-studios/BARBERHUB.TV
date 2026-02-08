

## Allow Profile Editing While Keeping Country Locked

### What This Does
Makes all profile fields (display name, username, bio, avatar) editable for both barbers and fans, while ensuring the country/flag can never be changed after sign-up. This enforces the platform rule that nationality is permanent for tournament integrity.

### Current Issues Found

1. **Fan profile page**: The country selector becomes editable when the user clicks "Edit Profile" -- it should always be locked
2. **Fan profile page**: The save mutation sends `country_code` to the database, so even though the UI locks it, the data payload could overwrite it
3. **Barber settings page**: The country selector is visually locked (good), but both mutations still include `country_code` in the update payload -- a safety hole
4. **Fan profile page**: The duplicate username error is already handled with a toast, but the error message from the screenshot ("duplicate key value violates unique constraint") suggests the specific handler might not be catching all cases

### Changes

#### 1. Fan Profile Page (`src/pages/Profile.tsx`)

- Lock the country selector permanently (always `disabled={true}`, regardless of edit mode)
- Add the "Locked" badge and helper text matching the barber settings style
- Remove `country_code` from the mutation payload so it is never sent to the database on save
- Improve the duplicate username error handler to also catch the raw constraint message

#### 2. Barber Settings (`src/components/profiles/BarberSettings.tsx`)

- **Profile mutation**: Instead of sending the full `data` object (which includes `country_code`), explicitly send only `display_name`, `username`, `bio`, and `avatar_url` -- exclude `country_code`
- **Barber mutation**: Remove `country_code` from the barber data payload so it cannot be overwritten
- Remove the secondary barber_profiles country sync logic (no longer needed since country never changes)
- Add duplicate username error handling (same pattern as the fan profile)

### Technical Details

**Profile.tsx mutation change:**
```
// Before (sends country_code)
.update({ display_name, bio, username, country_code })

// After (excludes country_code)
.update({ display_name, bio, username })
```

**Profile.tsx country field change:**
```
// Before (editable in edit mode)
<CountrySelector disabled={!isEditing} onChange={...} />

// After (always locked)
<Label>Country <Badge>Locked</Badge></Label>
<CountrySelector disabled={true} onChange={() => {}} />
<p>Nationality is permanently set during sign-up</p>
```

**BarberSettings.tsx profile mutation change:**
```
// Before (sends everything including country_code)
.update(data)

// After (explicit fields, no country_code)  
.update({ display_name: data.display_name, username: data.username, bio: data.bio, avatar_url: data.avatar_url })
```

**BarberSettings.tsx barber mutation change:**
```
// Before
country_code: data.country_code  // included in barberData

// After
// country_code line removed from barberData object
```

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Profile.tsx` | Lock country field, remove country_code from mutation, improve error handling |
| `src/components/profiles/BarberSettings.tsx` | Remove country_code from both mutation payloads, add username error handling |
