# Plan

## What I’ll build

1. Fix the Official Gear save flow so Sovereign HQ can successfully save gear after uploading a picture.
2. Build the missing affiliate-link management structure in Sovereign HQ so you can properly add, edit, activate/deactivate, and remove affiliate items.

## Implementation steps

### 1) Repair gear updates with uploaded images
- Update the `admin-upsert-gear` access logic so Sovereign users are treated the same as admins for gear writes.
- Update the `products` table access rules so Sovereign HQ can create and edit official gear records, not just users with the `admin` role.
- Verify the save path for uploaded `gear-media` URLs so image upload + product save works end-to-end.
- Improve the frontend error messaging in the gear panel so function failures show the actual reason instead of a generic toast.

### 2) Add a real affiliate management structure
- Extend the affiliate data model so each affiliate item can store the fields needed to manage links cleanly from Sovereign HQ, such as:
  - description
  - destination link
  - optional merchant/source label
  - active state
  - display order
  - image/media reference
- Keep access locked to Sovereign HQ for create/edit/remove actions, while active affiliate items stay publicly readable where needed.
- If needed, add storage support for affiliate media so you can upload images instead of relying only on pasted URLs.

### 3) Upgrade the Sovereign HQ affiliate panel
- Replace the current barebones affiliate form with a proper CRUD panel similar to the gear workflow.
- Add:
  - create
  - edit
  - delete
  - active toggle
  - image upload or URL entry
  - order control
  - clear validation for missing/invalid fields
- Route privileged affiliate writes through a protected admin path instead of relying on fragile direct table mutations from the browser.

### 4) Validate the admin flows
- Test gear image upload + save for existing items.
- Test affiliate add/edit/delete/toggle using the new structure.
- Check that public reads still only show active items.

## Technical details
- **Database:** add/adjust RLS so `sovereign` can manage `products` and affiliate records safely.
- **Edge functions:** likely add an `admin-upsert-affiliate` function and update `admin-upsert-gear` authorization.
- **Frontend:** update `GearControlPanel` and `AffiliateControlPanel` to use the protected admin flows and better validation/errors.
- **Storage:** reuse or add a public media bucket with Sovereign-only write permissions for affiliate images if upload support is included.

## Expected outcome
- Uploading a gear picture will no longer block saving the gear item.
- Sovereign HQ will have a complete affiliate-link management setup instead of the current minimal form.