

## Add User Directory Dropdown + Sub-Category System to Sovereign HQ

### What We're Building
1. **Full user directory dropdown** in Sovereign HQ — all users listed alphabetically, grouped by primary role (BARBER / FAN), selectable to open the profile inspector
2. **Sub-category system** — barbers can be tagged as "Educator", fans can be tagged as "Official Sponsor"
3. **Sub-category badge** on profile cards (similar to SubscriptionBadge) visible across the app

### Database Changes

**New column on `profiles` table:**
```sql
ALTER TABLE profiles ADD COLUMN sub_category TEXT DEFAULT NULL;
```
No new enum needed — we'll use text values: `educator`, `official_sponsor` (null = none). This keeps it extensible for future sub-categories.

**Add `sub_category` to allowed fields** in the sovereign edge function's whitelist so it can be set from god mode.

### Changes

#### 1. Edge function `sovereign-user-control` — add `list_all_users` action + whitelist `sub_category`
- New action `list_all_users`: fetches ALL profiles with their roles, ordered alphabetically by `display_name`
- Groups them by primary role (barber vs fan) in the response
- Add `sub_category` to `allowedProfileFields` whitelist so the profile inspector can set it

#### 2. `UserControlPanel.tsx` — add user directory dropdown
- Replace the "Search & Inspect Users" button with a split: keep search button + add a new "Browse All Users" dropdown button
- On click, fetch `list_all_users` and populate a dropdown/select grouped into two sections:
  - **BARBERS** — all barber-role users alphabetically
  - **FANS** — all fan-role users alphabetically
- Each entry shows: name, sub-category badge (if any), BB balance
- Clicking any user opens the existing profile inspector
- In the profile inspector, add a **Sub-Category** select field under the Identity section:
  - For barbers: options are `None`, `Educator`
  - For fans: options are `None`, `Official Sponsor`
  - The select auto-filters options based on the user's primary role

#### 3. New component `SubCategoryBadge.tsx`
- Small badge component similar to `SubscriptionBadge` but for sub-categories
- `educator` → green gradient badge with a graduation cap icon, label "Educator"
- `official_sponsor` → gold gradient badge with a handshake/award icon, label "Official Sponsor"
- Props: `subCategory: string | null`, `size: 'sm' | 'md'`
- Returns null if no sub-category

#### 4. Display sub-category badge on `BarberProfileCard.tsx`
- Fetch `sub_category` from the `profiles` table alongside existing queries
- Render `<SubCategoryBadge>` next to the `SubscriptionBadge` in the card header
- Small, non-intrusive — sits alongside existing badges

#### 5. Display sub-category badge on `RoleBadge.tsx`
- Accept optional `subCategory` prop
- Render `<SubCategoryBadge>` alongside the role badge when present

### Technical Details
- `list_all_users` uses service role so it sees all users regardless of RLS
- Sub-category is stored on `profiles` (not `user_roles`) because it's metadata about the user, not an access-control role — no privilege escalation risk
- The dropdown uses a `ScrollArea` with section headers for BARBER/FAN grouping
- Future sub-categories can be added by extending the select options — no schema changes needed

