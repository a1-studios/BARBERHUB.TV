

## Fix Fan Profile: Remove Crest, Ensure Flag Background

### Issues
1. **Fan users see the AvatarCrest** (ghost wings, tier ring, stars) — this is barber-only. Fans should have a plain avatar.
2. **Flag background not showing for fans** — likely `profile?.country_code` is null/undefined for the fan user. Need to also check `clientProfile?.country_code` as a fallback.

### Changes — `src/pages/Profile.tsx`

**A) Replace AvatarCrest with plain Avatar for fans**
- Wrap the hero section in a conditional: barbers get `<AvatarCrest>`, fans get a simple `<Avatar>` with no crest/wings/ring.

**B) Fix flag background for fans**
- Line 177: `countryCode` for fans uses `profile?.country_code`. Also check `clientProfile?.country_code` as fallback since the country may be stored on the client profile table instead.

### Files Changed
| File | Action |
|------|--------|
| `src/pages/Profile.tsx` | Conditional avatar rendering; fix fan countryCode fallback |

