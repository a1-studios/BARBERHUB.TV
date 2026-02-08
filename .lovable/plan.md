

## Smart Search Bar with Location and Autocomplete

### What Changes
The search bar on the main dashboard will become much smarter. When a user taps on it, two things will happen:

1. **Location detection** -- The app will ask permission to access your location, then automatically suggest barbers nearby (matching by city/country).
2. **Autocomplete dropdown** -- As you type, a dropdown will appear showing matching barber names, locations, specialties, and countries already in the database, so you can quickly pick what you're looking for.

### How It Will Work

1. User taps the search bar
2. A small location button (pin icon) appears -- tapping it triggers the browser's "Allow location access?" prompt
3. If allowed, the user's country/area is detected and the search pre-fills with their location (e.g., "new york" or "US")
4. As the user types, a dropdown appears below the search bar showing:
   - **Barbers** matching the name (with their avatar and location)
   - **Locations** matching the text (cities/countries from the database)
   - **Specialties** matching the text (e.g., "beard", "texture", "fades")
5. Clicking a suggestion navigates directly to the barbers directory with that filter pre-applied
6. Pressing Enter still works as before, navigating to `/barbers?search=...`

---

### Technical Details

#### 1. New Component: `BarberSearchAutocomplete.tsx`

A new component replacing the current inline search bar in `GlobalLeagueDashboard.tsx`.

- **State**: `searchQuery`, `isOpen` (dropdown visible), `userLocation` (detected coords/country), `isLocating` (loading state)
- **Geolocation**: Uses `navigator.geolocation.getCurrentPosition()` to get lat/lng, then reverse-geocodes to a country code using a simple lookup or the Intl API (`Intl.DisplayNames`)
- **Data query**: Uses the existing `public_barber_profiles` view to build suggestion lists:
  - Distinct barber names (matching typed text)
  - Distinct locations (matching typed text)
  - Distinct specialties (matching typed text)
  - Distinct country codes (matching typed text)
- **Dropdown UI**: Built with the existing `Command` (cmdk) component for accessible, keyboard-navigable autocomplete with grouped sections (Barbers, Locations, Specialties)
- **Navigation**: Selecting a suggestion navigates to `/barbers?search=<value>` or `/barbers?country=<code>`

#### 2. Modify `GlobalLeagueDashboard.tsx`

- Remove the current inline search input/button
- Import and render the new `BarberSearchAutocomplete` component in its place
- Keep the same pill-shaped, minimal styling

#### 3. Modify `BarbersDirectory.tsx`

- Read `?search=` and `?country=` URL params on mount to pre-populate filters
- This ensures suggestions from the dashboard carry through correctly

#### 4. Location Flow

- On first focus of the search bar, a small MapPin button pulses to invite the user to share location
- On click, calls `navigator.geolocation.getCurrentPosition()`
- Success: determines country from coordinates (using a lightweight reverse-geocode approach via timezone/locale or a free API)
- The detected location auto-fills the search, showing nearby barbers first
- If denied: no error shown, the user just types manually

#### Files Created
- `src/components/BarberSearchAutocomplete.tsx` -- new autocomplete search component

#### Files Modified
- `src/components/GlobalLeagueDashboard.tsx` -- swap inline search for the new component
- `src/pages/BarbersDirectory.tsx` -- read URL params to pre-apply filters from search suggestions

