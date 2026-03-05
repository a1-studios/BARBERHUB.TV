

## Fix: SponsorAdsManager JSX Structure

The build error is caused by mismatched JSX tags around lines 418-437. After the scheduling grid closes at line 418, the "Display Order" input and "Active" switch are wrapped in a `</div>` at line 437 that doesn't have a matching opening tag — the two fields need their own parent `<div>`.

### Change in `src/components/admin/SponsorAdsManager.tsx`

**Lines 418-437:** Wrap the "Display Order" and "Active" toggle in a proper flex container:

```jsx
            </div>
            {/* Order + Active toggle */}
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="order">Display Order</Label>
                <Input ... />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch ... />
                <Label>Active</Label>
              </div>
            </div>
```

This replaces the current broken nesting where `</div>` at line 437 closes a tag that was never opened. Single-line fix — no logic, CSS, or branding changes.

