

## Add User Profile Deep-Dive to Sovereign Command Center

### Overview
When you click a user from search results, open a full profile inspector dialog where you can view and edit all their data across tables — profiles, barber_profiles, client_profiles, roles, BB balance — with inline editing controls.

### Changes

#### 1. Update `sovereign-user-control` edge function — add `update_profile` action
- New action `update_profile` that accepts `user_id` and a `updates` object with optional fields
- Uses service role to update `profiles` table fields: `display_name`, `username`, `bio`, `avatar_url`, `barber_bucks`, `is_verified_by_competition`, `three_x_vote_expires_at`, `is_creator`, `creator_level`, `total_earnings`
- Also accepts `barber_updates` to update `barber_profiles` fields: `name`, `nickname`, `rating`, `specialty`, `location`, `years_experience`, `bio`, `can_stream`, `battles_created_this_month`, `active_subscription_tier`
- Also accepts `client_updates` to update `client_profiles` fields: `voting_power`, `total_votes_cast`
- Logs changes to `sovereign_audit_log` with before/after state

#### 2. Rewrite `UserControlPanel.tsx` — add User Profile Inspector modal
- When clicking a search result, call `get_user_details` and open a new `profile` modal type
- Profile Inspector shows all data in editable fields organized in sections:
  - **Identity**: display_name, username, bio, avatar_url, user_type (read-only), country_code (read-only)
  - **Economy**: barber_bucks (editable number input), total_earnings
  - **Status**: is_verified_by_competition (toggle), is_creator (toggle), creator_level (select), three_x_vote_expires_at (date input)
  - **Roles**: show current roles with add/remove buttons inline
  - **Barber Profile** (if barber): name, nickname, rating, specialty, location, years_experience, can_stream, battles_created_this_month, active_subscription_tier
  - **Client Profile** (if fan): voting_power, total_votes_cast
  - **Recent Transactions**: read-only list from get_user_details
  - **Recent Battles**: read-only list from get_user_details
- "Save Changes" button calls the new `update_profile` action
- Quick action buttons at top: Freeze/Unfreeze, Verify/Unverify, Mint BB, Burn BB (inline amount input)
- All actions pre-fill the user_id so no manual UUID copying needed

#### 3. Wire search → profile flow
- Clicking a user in search results opens the profile inspector directly (instead of just selecting user_id)
- Profile inspector is the central hub — all actions flow from there

### Technical Details
- Edge function action `update_profile` diffs before/after state for audit logging
- Profile inspector uses local state for edits, only commits on Save
- Scroll area for the modal content since it will be tall
- All existing modals (role, freeze, verify) remain but can also be triggered from within the profile inspector

