

## Remove DEV_MODE Warning Banner

Remove the yellow "DEV MODE — ALL TIER GATES BYPASSED — DO NOT SHIP" banner from `src/App.tsx` (lines ~53-57).

### Change
Delete the conditional render block that shows the warning banner when `DEV_MODE` is true. Also remove the `DEV_MODE` import if no longer used elsewhere in the file.

| File | Change |
|------|--------|
| `src/App.tsx` | Remove the `DEV_MODE` banner JSX and its import |

